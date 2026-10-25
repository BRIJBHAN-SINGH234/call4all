"""Run: python3 -m billing_service.server. Use persistent BILLING_DB and HTTPS in production."""
import json
import os
import re
import threading
import time
from collections import defaultdict, deque
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit, unquote
from .store import Store, Error, ROOT

class Handler(SimpleHTTPRequestHandler):
    store = None
    attempts = defaultdict(deque)
    rate_lock = threading.Lock()

    def log_message(self, fmt, *args):
        # Do not log authentication bodies, query terms, tokens or customer details.
        if args:
            print('billing request', self.command, urlsplit(self.path).path, flush=True)

    def _cors(self):
        origin = self.headers.get('Origin')
        allowed = {x.strip().rstrip('/') for x in os.getenv('BILLING_ALLOWED_ORIGINS', '').split(',') if x.strip()}
        same = {'http://' + self.headers.get('Host', ''), 'https://' + self.headers.get('Host', '')}
        if origin and origin not in allowed | same:
            raise Error('This website origin is not allowed.', 403)
        return origin

    def _send(self, status, result, content_type='application/json; charset=utf-8'):
        if isinstance(result, dict):
            result = {**result, 'server_now': self.store.clock()}
        raw = json.dumps(result, ensure_ascii=False).encode() if content_type.startswith('application/json') else result.encode()
        self.send_response(status)
        try:
            origin = self._cors()
            if origin:
                self.send_header('Access-Control-Allow-Origin', origin)
                self.send_header('Vary', 'Origin')
        except Error:
            pass
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        try:
            origin = self._cors()
            self.send_response(204)
            if origin:
                self.send_header('Access-Control-Allow-Origin', origin)
                self.send_header('Vary', 'Origin')
            self.send_header('Access-Control-Allow-Headers', 'Authorization,Content-Type,Idempotency-Key')
            self.send_header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
            self.end_headers()
        except Error as e:
            self._send(e.status, {'error': str(e)})

    def _run(self):
        try:
            self._cors()
            parsed = urlsplit(self.path)
            path = parsed.path.rstrip('/')
            query = {k: v[0] for k, v in parse_qs(parsed.query).items()}
            body = {}
            if self.command in ('POST', 'PUT'):
                try:
                    length = int(self.headers.get('Content-Length', 0))
                    if not 0 < length <= 500000:
                        raise ValueError()
                    body = json.loads(self.rfile.read(length))
                    if not isinstance(body, dict):
                        raise ValueError()
                except (ValueError, UnicodeDecodeError):
                    raise Error('Invalid request JSON.')
            if path == '/api/health':
                self._send(200, {'ok': True, 'service': 'call4all-billing', 'version': 2})
                return
            if path in ('/api/login', '/api/admin/login') and self.command == 'POST':
                # Per-process rate limit; a production proxy should also rate limit login.
                now, address = time.monotonic(), self.client_address[0]
                with self.rate_lock:
                    attempts = self.attempts[address]
                    while attempts and now - attempts[0] > 60:
                        attempts.popleft()
                    if len(attempts) >= 15:
                        raise Error('Login attempts zyada hain. Ek minute baad try karein.', 429)
                    attempts.append(now)
                result = self.store.github_login(body['github_token']) if body.get('github_token') and path == '/api/admin/login' else self.store.login(body.get('mobile', ''), body.get('password', ''))
                if path == '/api/admin/login':
                    self.store.admin(result['user'])
                self._send(200, result)
                return
            value = self.headers.get('Authorization', '')
            actor = self.store.authenticate(value[7:] if value.startswith('Bearer ') else '')
            key = self.headers.get('Idempotency-Key', '')
            if path == '/api/me' and self.command == 'GET':
                result = {'user': actor, 'server_now': self.store.clock()}
            elif path == '/api/menu' and self.command == 'GET':
                result = self.store.menu()
            elif path == '/api/bills' and self.command == 'GET':
                result = self.store.list_bills(query)
            elif path == '/api/bills' and self.command == 'POST':
                result = self.store.create_bill(actor, body, key)
            elif re.fullmatch(r'/api/bills/[^/]+(?:/(?:generate|comments))?', path):
                parts = path.split('/')
                ident = parts[3]
                if len(parts) == 4 and self.command == 'GET':
                    result = self.store.get_bill(ident)
                elif len(parts) == 4 and self.command == 'PUT':
                    result = self.store.update_bill(actor, ident, body, key)
                elif len(parts) == 5 and parts[4] == 'generate' and self.command == 'POST':
                    result = self.store.update_bill(actor, ident, body, key, True)
                elif len(parts) == 5 and parts[4] == 'comments' and self.command == 'POST':
                    result = self.store.comment(actor, ident, body, key)
                else:
                    raise Error('Method not supported.', 405)
            elif path == '/api/stock' and self.command == 'GET':
                result = self.store.stock(query.get('as_of'))
            elif path == '/api/stock/ledger' and self.command == 'GET':
                result = self.store.ledger(query.get('item'), max(0, int(query.get('offset', 0))))
            elif path == '/api/inventory' and self.command == 'POST':
                result = self.store.save_inventory(actor, body, None, key)
            elif re.fullmatch(r'/api/inventory/[^/]+(?:/restock)?', path):
                parts = path.split('/')
                if len(parts) == 4 and self.command == 'PUT':
                    result = self.store.save_inventory(actor, body, parts[3], key)
                elif len(parts) == 5 and self.command == 'POST':
                    result = self.store.restock(actor, parts[3], body, key)
                else:
                    raise Error('Method not supported.', 405)
            elif path == '/api/admin/users' and self.command == 'GET':
                result = {'items': self.store.users(actor)}
            elif path == '/api/admin/users' and self.command == 'POST':
                result = self.store.save_user(actor, body)
            elif path.startswith('/api/admin/users/') and self.command == 'PUT':
                result = self.store.save_user(actor, body, path.split('/')[-1])
            elif path in ('/api/export/bills', '/api/export/stock-ledger') and self.command == 'GET':
                self._send(200, self.store.export(actor, path.split('/')[-1]), 'text/csv; charset=utf-8')
                return
            else:
                raise Error('Endpoint nahi mila.', 404)
            self._send(200, result)
        except Error as e:
            self._send(e.status, {'error': str(e), 'code': e.code})
        except (ValueError, TypeError, KeyError):
            self._send(400, {'error': 'Invalid request data.'})
        except Exception:
            self._send(500, {'error': 'Saving failed. Dobara try karein; local draft safe rakhein.'})

    def do_GET(self):
        if self.path.startswith('/api/'):
            self._run()
            return
        path = unquote(urlsplit(self.path).path)
        if path == '/':
            self.path = '/food-billing.html'
        elif not (path in ('/food-billing.html', '/billing-workspace.html', '/billing-stock-admin.html', '/food-billing-manifest.json', '/data/billing-config.json') or path.startswith('/assets/')):
            self.send_error(404)
            return
        if any(part.startswith('.') for part in Path(path).parts):
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        self.send_error(405)

    do_POST = _run
    do_PUT = _run


def main():
    db = os.getenv('BILLING_DB', str(ROOT / '.billing-runtime' / 'billing.sqlite3'))
    Handler.store = Store(db, source_dir=os.getenv('BILLING_SOURCE_DIR', str(ROOT / 'data')))
    port = int(os.getenv('PORT', os.getenv('BILLING_PORT', '8787')))
    server = ThreadingHTTPServer((os.getenv('BILLING_BIND', '127.0.0.1'), port), lambda *args, **kwargs: Handler(*args, directory=str(ROOT), **kwargs))
    print(f'Billing ready on port {port}; database: {db}', flush=True)
    server.serve_forever()

if __name__ == '__main__':
    main()
