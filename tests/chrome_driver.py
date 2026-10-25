"""Small standard-library CDP driver; waits in real time for WebCrypto and UI work."""
import base64
import json
import os
import socket
import struct
import subprocess
import time
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import urlopen

class WebSocket:
    def __init__(self, url):
        u = urlsplit(url)
        self.sock = socket.create_connection((u.hostname, u.port), timeout=5)
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall((f'GET {u.path} HTTP/1.1\r\nHost: {u.netloc}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n').encode())
        data = b''
        while b'\r\n\r\n' not in data:
            data += self.sock.recv(1)
        if not data.startswith(b'HTTP/1.1 101'):
            raise RuntimeError('CDP handshake failed')
        self.seq = 0
    def read(self, n):
        data = b''
        while len(data) < n:
            chunk = self.sock.recv(n-len(data))
            if not chunk:
                raise RuntimeError('CDP socket closed')
            data += chunk
        return data
    def call(self, method, params=None):
        self.seq += 1
        payload = json.dumps({'id': self.seq, 'method': method, 'params': params or {}}).encode()
        mask = os.urandom(4)
        head = bytes([0x81, 0x80 | len(payload)]) if len(payload) < 126 else bytes([0x81, 0xfe])+struct.pack('!H', len(payload))
        self.sock.sendall(head+mask+bytes(b ^ mask[i % 4] for i, b in enumerate(payload)))
        while True:
            first, second = self.read(2)
            length = second & 127
            if length == 126:
                length = struct.unpack('!H', self.read(2))[0]
            elif length == 127:
                length = struct.unpack('!Q', self.read(8))[0]
            data = json.loads(self.read(length))
            if data.get('id') == self.seq:
                return data.get('result', {})

def browser_test(browser, directory, url, timeout=75):
    proc = subprocess.Popen([browser, '--headless', '--no-sandbox', '--disable-gpu', '--no-proxy-server', '--remote-debugging-port=0', '--user-data-dir='+str(directory), url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ws = None
    try:
        portfile = Path(directory) / 'DevToolsActivePort'
        deadline = time.monotonic()+timeout
        while not portfile.exists():
            if time.monotonic() > deadline:
                raise RuntimeError('Chrome start timeout')
            time.sleep(.05)
        port = portfile.read_text().splitlines()[0]
        with urlopen('http://127.0.0.1:'+port+'/json/list') as response:
            page = next(p for p in json.load(response) if p.get('type') == 'page' and not p.get('url', '').startswith('chrome-extension:'))
        ws = WebSocket(page['webSocketDebuggerUrl'])
        ws.call('Page.enable')
        ws.call('Runtime.enable')
        time.sleep(.5)

        message = ''
        while time.monotonic() < deadline:
            response = ws.call('Runtime.evaluate', {'expression': 'document.body?.dataset.tests || (location.href+" | "+document.readyState)', 'returnByValue': True})
            message = response.get('result', {}).get('value', '')
            if message.startswith(('PASS:', 'FAIL:')):
                break
            time.sleep(.1)
        dom = ws.call('Runtime.evaluate', {'expression': 'document.documentElement.outerHTML', 'returnByValue': True}).get('result', {}).get('value', '')
        return message if message.startswith(('PASS:', 'FAIL:')) else 'FAIL: test did not finish: '+message, dom
    finally:
        if ws:
            ws.sock.close()
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
