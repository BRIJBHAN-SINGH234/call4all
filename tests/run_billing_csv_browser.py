"""Real-browser CSV integration tests against an isolated fake GitHub API."""
import shutil
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def run():
    browser = shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
    if not browser:
        raise SystemExit('Chrome/Chromium required.')
    class Fixture(SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass
        def html(self, html):
            raw = html.encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        def do_GET(self):
            path = self.path.split('?')[0]
            # Minimal public page avoids external fonts and unrelated catalog requests.
            if path == '/index.html':
                return self.html('<!doctype html><body><script src="/assets/js/site.js"></script></body>')
            if path == '/__csv-test.html':
                html = (ROOT / 'tests/billing-workspace-ui.html').read_text()
                html = html.replace('<body><script>', '<body><script src="/assets/js/billing-csv.js"></script><script src="/tests/billing-csv-fixture.js"></script><script>')
                html = html.replace('try{\nconst af=', 'try{\nawait GithubFixture.setup();\nconst af=')
                html = html.replace("f.elements.password.value=password;", "f.elements.password.value=password;f.elements.csv_token.value='test-only-token';")
                html = html.replace("form.elements.mobile.value='admin';form.elements.password.value='test-only-admin-password';", "form.elements.github_token.value='test-only-token';")
                html = html.replace("document.body.dataset.tests='PASS:", "await csvExtraTests(a,b,admin);document.body.dataset.tests='PASS: GitHub CSV, concurrency, retry after lost response, no negative stock, exact lock, ")
                extra = (ROOT / 'tests/billing-csv-extra.js').read_text()
                return self.html(html.replace('<script>\n(async()=>', '<script>'+extra+'</script><script>\n(async()=>'))
            if path in ('/billing-workspace.html', '/billing-stock-admin.html'):
                html = (ROOT / path.lstrip('/')).read_text()
                inject = "<script>const prefix='test-'+window.name+'-';for(const kind of ['sessionStorage','localStorage']){const actual=window[kind];Object.defineProperty(window,kind,{value:{getItem:k=>actual.getItem(prefix+k),setItem:(k,v)=>actual.setItem(prefix+k,v),removeItem:k=>actual.removeItem(prefix+k)}});}window.fetch=(url,opts)=>parent.GithubFixture.fetch(url,opts);</script>"
                return self.html(html.replace('<head>', '<head>'+inject))
            super().do_GET()
    server = ThreadingHTTPServer(('127.0.0.1', 0), lambda *a, **kw: Fixture(*a, directory=str(ROOT), **kw))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with tempfile.TemporaryDirectory(prefix='c4b-csv-') as directory:
            from chrome_driver import browser_test
            message, dom = browser_test(browser, directory, f'http://127.0.0.1:{server.server_port}/__csv-test.html')
            print(message)
            if not message.startswith('PASS:'):
                (ROOT / 'tests/billing-last-failure.html').write_text(dom)
                raise SystemExit(1)
    finally:
        server.shutdown()
        server.server_close()
if __name__ == '__main__':
    run()
