"""Run a real Chrome + SQLite billing test on localhost with isolated fake accounts."""
import json
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from billing_service.store import Store
from billing_service.server import Handler, ThreadingHTTPServer

def run():
    browser = shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
    if not browser:
        raise SystemExit('Chrome/Chromium required for this optional browser test.')
    with tempfile.TemporaryDirectory(prefix='c4b-browser-') as directory:
        root = Path(directory)
        (root / 'food-menu.csv').write_text('id,category,name,half_price,full_price,status\nf1,Food,Dal,10,20,active\nf2,Food,Roti,0,8,active\n')
        (root / 'billing-users.csv').write_text('id,mobile,password_hash,password_salt,name,status\n')
        store = Store(root / 'test.sqlite3', source_dir=root, csv_base='')
        store.bootstrap_admin('admin', 'test-only-admin-password')
        admin = store.login('admin', 'test-only-admin-password')['user']
        alice = store.save_user(admin, {'name': 'Alice', 'mobile': '9000000001', 'password': 'password-a'})
        store.save_user(admin, {'name': 'Bob', 'mobile': '9000000002', 'password': 'password-b'})
        store.save_inventory(admin, {'name': 'Water', 'category': 'Beverage', 'units_per_packet': 10, 'packet_price': 2000, 'single_price': 250, 'opening_singles': 100}, None, 'fixture-water')
        old = store.create_bill(alice, {'kind': 'food', 'table': 'OLD-TEST', 'lines': [{'item_id': 'f1', 'variant': 'Regular', 'qty': 1}]}, 'fixture-old')
        store.update_bill(alice, old['id'], {'version': old['version'], 'table': 'OLD-TEST', 'lines': [{'item_id': 'f1', 'variant': 'Regular', 'qty': 1}]}, 'fixture-generated', True)
        with store.db(True) as db:
            db.execute('UPDATE bills SET generated_at=?,created_at=? WHERE id=?', (time.time()-3700, time.time()-10*86400, old['id']))
        class TestHandler(Handler):
            def log_message(self, *_):
                pass
            def do_GET(self):
                path = self.path.split('?')[0]
                if path == '/__test/billing-ui.html':
                    return self._send(200, (ROOT / 'tests/billing-workspace-ui.html').read_text(), 'text/html; charset=utf-8')
                if path == '/data/billing-config.json':
                    return self._send(200, {'apiBase': ''})  # never contact a configured live backend
                if path in ('/billing-workspace.html', '/billing-stock-admin.html'):
                    # Iframes model separate devices, so isolate their session token stores.
                    html = (ROOT / path.lstrip('/')).read_text()
                    isolate = "<script>const prefix='test-'+window.name+'-';const actual=sessionStorage;Object.defineProperty(window,'sessionStorage',{value:{getItem:k=>actual.getItem(prefix+k),setItem:(k,v)=>actual.setItem(prefix+k,v),removeItem:k=>actual.removeItem(prefix+k)}});</script>"
                    return self._send(200, html.replace('<head>', '<head>'+isolate), 'text/html; charset=utf-8')
                super().do_GET()
        TestHandler.store = store
        server = ThreadingHTTPServer(('127.0.0.1', 0), lambda *args, **kwargs: TestHandler(*args, directory=str(ROOT), **kwargs))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            result = subprocess.run([browser, '--headless', '--no-sandbox', '--disable-gpu', '--user-data-dir='+str(root/'chrome'), '--virtual-time-budget=170000', '--dump-dom', f'http://127.0.0.1:{server.server_port}/__test/billing-ui.html'], capture_output=True, text=True, timeout=60)
            import re
            match = re.search(r'<body data-tests="([^"]+)', result.stdout)
            message = match.group(1) if match else 'FAIL: browser test did not finish'
            print(message)
            if not message.startswith('PASS:'):
                (ROOT / 'tests' / 'billing-last-failure.html').write_text(result.stdout)
                raise SystemExit(1)
        finally:
            server.shutdown()
            server.server_close()

if __name__ == '__main__':
    run()
