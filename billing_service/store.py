"""Authoritative billing, edit deadlines and stock ledger. Python standard library only."""
import contextlib
import csv
import datetime as dt
import hashlib
import hmac
import io
import json
import os
import secrets
import sqlite3
import time
import uuid
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from urllib.request import urlopen, Request

ROOT = Path(__file__).resolve().parents[1]
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))

class Error(Exception):
    def __init__(self, message, status=400, code='invalid'):
        super().__init__(message)
        self.status, self.code = status, code

def integer(value, name, lo=0, hi=10**9):
    if isinstance(value, bool) or not isinstance(value, int) or not lo <= value <= hi:
        raise Error(f'{name}: {lo} se {hi} tak whole number chahiye.')
    return value

def text(value, name, limit=160, required=False):
    if not isinstance(value, str) or len(value) > limit or (required and not value.strip()):
        raise Error(f'{name} sahi bharein (maximum {limit} characters).')
    return value.strip()

def cents(value):
    try:
        n = Decimal(str(value or 0))
        if not n.is_finite() or n < 0 or n > 10**7:
            raise ValueError()
        return int((n * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    except (InvalidOperation, ValueError):
        raise Error('Price valid positive amount honi chahiye.')

def iso(value):
    return dt.datetime.fromtimestamp(value, dt.timezone.utc).isoformat()

def password_hash(password, salt):
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 120000).hex()

class Store:
    def __init__(self, path, clock=time.time, source_dir=ROOT / 'data', csv_base=None):
        self.path, self.clock, self.source_dir = str(path), clock, Path(source_dir)
        self.csv_base = csv_base if csv_base is not None else os.getenv('BILLING_CSV_BASE_URL', '')
        self.last_sync = 0
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self.db() as db:
            db.executescript('''
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,mobile TEXT UNIQUE NOT NULL,name TEXT NOT NULL,hash TEXT NOT NULL,salt TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'staff',status TEXT NOT NULL DEFAULT 'active',source TEXT NOT NULL DEFAULT 'api');
            CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS food(id TEXT PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,half INTEGER NOT NULL,full INTEGER NOT NULL,active INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS inventory(id TEXT PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,units_per_packet INTEGER NOT NULL CHECK(units_per_packet>0),packet_price INTEGER NOT NULL,single_price INTEGER NOT NULL,stock INTEGER NOT NULL DEFAULT 0 CHECK(stock>=0),active INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1);
            CREATE TABLE IF NOT EXISTS bills(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,bill_no TEXT UNIQUE,kind TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',data TEXT NOT NULL,created_at REAL NOT NULL,generated_at REAL,updated_at REAL NOT NULL,creator_id TEXT NOT NULL,creator_name TEXT NOT NULL,updater_id TEXT NOT NULL,updater_name TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
            CREATE TABLE IF NOT EXISTS comments(id TEXT PRIMARY KEY,bill_id TEXT NOT NULL,body TEXT NOT NULL,actor_id TEXT NOT NULL,actor_name TEXT NOT NULL,created_at REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS ledger(id INTEGER PRIMARY KEY AUTOINCREMENT,item_id TEXT NOT NULL,item_name TEXT NOT NULL,delta INTEGER NOT NULL,balance INTEGER NOT NULL,kind TEXT NOT NULL,bill_id TEXT,actor_id TEXT NOT NULL,actor_name TEXT NOT NULL,note TEXT NOT NULL,created_at REAL NOT NULL,units_per_packet INTEGER NOT NULL);
            CREATE INDEX IF NOT EXISTS ledger_item_date ON ledger(item_id,created_at);
            CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,bill_id TEXT NOT NULL,action TEXT NOT NULL,actor_id TEXT NOT NULL,actor_name TEXT NOT NULL,created_at REAL NOT NULL,before_data TEXT,after_data TEXT);
            CREATE TABLE IF NOT EXISTS requests(user_id TEXT NOT NULL,key TEXT NOT NULL,route TEXT NOT NULL,body_hash TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(user_id,key));
            ''')
        self.sync_sources(force=True)
        if os.getenv('BILLING_ADMIN_PASSWORD'):
            self.bootstrap_admin(os.getenv('BILLING_ADMIN_USER', 'admin'), os.environ['BILLING_ADMIN_PASSWORD'])

    @contextlib.contextmanager
    def db(self, write=False):
        db = sqlite3.connect(self.path, timeout=20)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        try:
            if write:
                db.execute('BEGIN IMMEDIATE')
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def _csv(self, name):
        if self.csv_base:
            req = Request(self.csv_base.rstrip('/') + '/' + name, headers={'User-Agent': 'Call4All-Billing/1'})
            with urlopen(req, timeout=8) as response:
                return list(csv.DictReader(io.StringIO(response.read(3_000_000).decode('utf-8-sig'))))
        path = self.source_dir / name
        if not path.exists():
            return []
        with path.open(encoding='utf-8-sig', newline='') as f:
            return list(csv.DictReader(f))

    def sync_sources(self, force=False):
        if not force and self.clock() - self.last_sync < 60:
            return
        # Failed network refresh retains the last known data; it never clears accounts/menu.
        try:
            users, menu = self._csv('billing-users.csv'), self._csv('food-menu.csv')
        except Exception:
            return
        with self.db(True) as db:
            for u in users:
                if not u.get('id') or not u.get('password_salt'):
                    continue
                db.execute('''INSERT INTO users(id,mobile,name,hash,salt,role,status,source) VALUES(?,?,?,?,?,'staff',?,'csv') ON CONFLICT(id) DO UPDATE SET mobile=excluded.mobile,name=excluded.name,hash=excluded.hash,salt=excluded.salt,status=excluded.status WHERE users.source='csv' ''',
                           (u['id'], ''.join(c for c in u['mobile'] if c.isdigit())[-10:], u['name'], u['password_hash'], u['password_salt'], u.get('status', '').lower()))
            csv_ids = [u['id'] for u in users if u.get('id') and u.get('password_salt')]
            if csv_ids:
                db.execute("UPDATE users SET status='blocked' WHERE source='csv' AND id NOT IN (" + ','.join('?' for _ in csv_ids) + ')', csv_ids)
            else:
                db.execute("UPDATE users SET status='blocked' WHERE source='csv'")
            for m in menu:
                if not m.get('id'):
                    continue
                db.execute('INSERT INTO food VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,half=excluded.half,full=excluded.full,active=excluded.active',
                           (m['id'], m['name'], m['category'], cents(m.get('half_price')), cents(m.get('full_price')), int(m.get('status', '').lower() == 'active')))
        self.last_sync = self.clock()

    def bootstrap_admin(self, mobile, password):
        if len(password) < 12:
            raise Error('BILLING_ADMIN_PASSWORD kam se kam 12 characters ka rakhein.')
        salt = secrets.token_hex(16)
        with self.db(True) as db:
            db.execute("INSERT INTO users VALUES(?,?,?,?,?,'admin','active','env') ON CONFLICT(id) DO UPDATE SET hash=excluded.hash,salt=excluded.salt,name=excluded.name,status='active'",
                       ('env-admin', mobile, 'Billing Admin', password_hash(password, salt), salt))

    def _public_user(self, row):
        return {k: row[k] for k in ('id', 'mobile', 'name', 'role', 'status')}

    def _session(self, user):
        value = secrets.token_urlsafe(32)
        with self.db(True) as db:
            db.execute('INSERT INTO sessions VALUES(?,?,?)', (hashlib.sha256(value.encode()).hexdigest(), user['id'], self.clock() + 43200))
        return {'token': value, 'user': self._public_user(user), 'expires_at': iso(self.clock() + 43200)}

    def login(self, mobile, password):
        self.sync_sources()
        with self.db() as db:
            row = db.execute('SELECT * FROM users WHERE mobile=?', (str(mobile).strip(),)).fetchone()
        if not row or row['status'] != 'active' or not hmac.compare_digest(password_hash(str(password), row['salt']), row['hash']):
            raise Error('Mobile/username ya password galat hai, ya user blocked hai.', 401, 'auth')
        return self._session(row)

    def github_login(self, access):
        if not isinstance(access, str) or not access:
            raise Error('Admin GitHub token chahiye.', 401)
        def fetch(path):
            req = Request('https://api.github.com/' + path, headers={'Authorization': 'Bearer ' + access, 'User-Agent': 'Call4All-Billing', 'Accept': 'application/vnd.github+json'})
            with urlopen(req, timeout=10) as response:
                return json.load(response)
        try:
            repo = fetch('repos/BRIJBHAN-SINGH234/call4all')
            if not any(repo.get('permissions', {}).get(k) for k in ('push', 'admin', 'maintain')):
                raise ValueError()
            user = fetch('user')
        except Exception:
            raise Error('GitHub admin access verify nahi hua.', 401, 'auth')
        ident = 'github-' + str(user['id'])
        with self.db(True) as db:
            db.execute("INSERT INTO users VALUES(?,?,?,'','','admin','active','github') ON CONFLICT(id) DO UPDATE SET name=excluded.name,status='active'", (ident, 'gh:' + user['login'], user['login']))
            row = db.execute('SELECT * FROM users WHERE id=?', (ident,)).fetchone()
        return self._session(row)

    def authenticate(self, value):
        digest = hashlib.sha256(value.encode()).hexdigest()
        with self.db() as db:
            row = db.execute("SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>? AND u.status='active'", (digest, self.clock())).fetchone()
        if not row:
            raise Error('Session expire ho gayi. Login karein.', 401, 'auth')
        return self._public_user(row)

    def admin(self, actor):
        if actor.get('role') != 'admin':
            raise Error('Sirf admin yeh action kar sakta hai.', 403, 'forbidden')

    def mutation(self, actor, key, route, body, operation):
        if not key or len(key) > 160:
            raise Error('Request identity chahiye.')
        body_hash = hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()
        with self.db(True) as db:
            old = db.execute('SELECT * FROM requests WHERE user_id=? AND key=?', (actor['id'], key)).fetchone()
            if old:
                if old['route'] != route or old['body_hash'] != body_hash:
                    raise Error('Request identity dobara alag data ke saath use nahi ho sakti.', 409)
                return json.loads(old['response'])
            result = operation(db)
            db.execute('INSERT INTO requests VALUES(?,?,?,?,?)', (actor['id'], key, route, body_hash, json.dumps(result)))
            return result

    def users(self, actor):
        self.admin(actor)
        with self.db() as db:
            return [self._public_user(r) for r in db.execute("SELECT * FROM users WHERE role='staff' ORDER BY name")]

    def save_user(self, actor, body, ident=None):
        self.admin(actor)
        mobile = ''.join(c for c in str(body.get('mobile', '')) if c.isdigit())[-10:]
        if len(mobile) != 10:
            raise Error('10 digit mobile chahiye.')
        name = text(body.get('name'), 'Name', 80, True)
        status = str(body.get('status', 'active')).lower()
        if status not in ('active', 'blocked'):
            raise Error('Invalid status.')
        with self.db(True) as db:
            old = db.execute('SELECT * FROM users WHERE id=?', (ident,)).fetchone() if ident else None
            if ident and (not old or old['role'] != 'staff'):
                raise Error('User nahi mila.', 404)
            password = body.get('password', '')
            if password:
                if not isinstance(password, str) or not 6 <= len(password) <= 200:
                    raise Error('Password 6 se 200 characters ka ho.')
                salt = secrets.token_hex(16)
                hashed = password_hash(password, salt)
            elif old:
                salt, hashed = old['salt'], old['hash']
            else:
                raise Error('New user ka password chahiye.')
            ident = ident or str(uuid.uuid4())
            try:
                db.execute("INSERT INTO users VALUES(?,?,?,?,?,'staff',?,'api') ON CONFLICT(id) DO UPDATE SET mobile=excluded.mobile,name=excluded.name,hash=excluded.hash,salt=excluded.salt,status=excluded.status,source='api'", (ident, mobile, name, hashed, salt, status))
            except sqlite3.IntegrityError:
                raise Error('Mobile number already registered hai.', 409)
        return {'id': ident, 'mobile': mobile, 'name': name, 'role': 'staff', 'status': status}

    def menu(self):
        self.sync_sources()
        with self.db() as db:
            food = []
            for r in db.execute('SELECT * FROM food WHERE active=1 ORDER BY category,name'):
                variants = []
                if r['half']:
                    variants.append({'key': 'Half', 'price_cents': r['half']})
                if r['full']:
                    variants.append({'key': 'Full' if r['half'] else 'Regular', 'price_cents': r['full']})
                food.append({'id': r['id'], 'name': r['name'], 'category': r['category'], 'variants': variants})
            beverage = [self._inventory(r) for r in db.execute('SELECT * FROM inventory WHERE active=1 ORDER BY category,name')]
        return {'food': food, 'beverage': beverage}

    def _inventory(self, r):
        return {**dict(r), 'variants': [{'key': 'Single', 'price_cents': r['single_price'], 'units': 1}, {'key': 'Packet', 'price_cents': r['packet_price'], 'units': r['units_per_packet']}]}

    def _movement(self, db, item, delta, kind, actor, note='', bill_id=None):
        if not delta:
            return
        stock = db.execute('SELECT stock FROM inventory WHERE id=?', (item['id'],)).fetchone()['stock']
        after = stock + delta
        if after < 0:
            raise Error(f"{item['name']}: sirf {stock} single units stock mein hain.", 409, 'stock')
        db.execute('UPDATE inventory SET stock=?,version=version+1 WHERE id=?', (after, item['id']))
        db.execute('INSERT INTO ledger(item_id,item_name,delta,balance,kind,bill_id,actor_id,actor_name,note,created_at,units_per_packet) VALUES(?,?,?,?,?,?,?,?,?,?,?)', (item['id'], item['name'], delta, after, kind, bill_id, actor['id'], actor['name'], note, self.clock(), item['units_per_packet']))

    def save_inventory(self, actor, body, ident, key):
        self.admin(actor)
        def op(db):
            name = text(body.get('name'), 'Item name', 120, True)
            category = text(body.get('category', 'Beverage / snacks'), 'Category', 80, True)
            pack = integer(body.get('units_per_packet'), 'Items per packet', 1, 1000000)
            packet_price = integer(body.get('packet_price'), 'Packet price')
            single_price = integer(body.get('single_price'), 'Single price')
            active = body.get('active', True)
            if not isinstance(active, bool):
                raise Error('Invalid status.')
            old = db.execute('SELECT * FROM inventory WHERE id=?', (ident,)).fetchone() if ident else None
            if ident and not old:
                raise Error('Item nahi mila.', 404)
            if old:
                if body.get('version') != old['version']:
                    raise Error('Item kisi aur ne update kiya. Refresh karke dobara save karein.', 409, 'conflict')
                db.execute('UPDATE inventory SET name=?,category=?,units_per_packet=?,packet_price=?,single_price=?,active=?,version=version+1 WHERE id=?', (name, category, pack, packet_price, single_price, int(active), ident))
                item_id = ident
            else:
                item_id = str(uuid.uuid4())
                db.execute('INSERT INTO inventory(id,name,category,units_per_packet,packet_price,single_price,active) VALUES(?,?,?,?,?,?,?)', (item_id, name, category, pack, packet_price, single_price, int(active)))
                item = db.execute('SELECT * FROM inventory WHERE id=?', (item_id,)).fetchone()
                units = integer(body.get('opening_packets', 0), 'Opening packets', 0, 1000000) * pack + integer(body.get('opening_singles', 0), 'Opening singles', 0, 1000000)
                self._movement(db, item, units, 'opening', actor, 'Opening stock')
            return self._inventory(db.execute('SELECT * FROM inventory WHERE id=?', (item_id,)).fetchone())
        return self.mutation(actor, key, 'inventory/' + str(ident), body, op)

    def restock(self, actor, ident, body, key):
        self.admin(actor)
        def op(db):
            item = db.execute('SELECT * FROM inventory WHERE id=?', (ident,)).fetchone()
            if not item:
                raise Error('Item nahi mila.', 404)
            if body.get('units_per_packet', item['units_per_packet']) != item['units_per_packet']:
                raise Error('Packet size change ho gaya. Latest item load karke stock add karein.', 409, 'conflict')
            units = integer(body.get('packets', 0), 'Packets', 0, 1000000) * item['units_per_packet'] + integer(body.get('singles', 0), 'Singles', 0, 1000000)
            if units <= 0:
                raise Error('Add karne ki quantity bharein.')
            self._movement(db, item, units, 'restock', actor, text(body.get('note', ''), 'Note', 500))
            return self._inventory(db.execute('SELECT * FROM inventory WHERE id=?', (ident,)).fetchone())
        return self.mutation(actor, key, 'restock/' + ident, body, op)

    def stock(self, as_of=None):
        cutoff = None
        if as_of:
            try:
                date = dt.date.fromisoformat(as_of)
                cutoff = dt.datetime.combine(date + dt.timedelta(days=1), dt.time(), IST).timestamp()
            except ValueError:
                raise Error('Date YYYY-MM-DD format mein chahiye.')
        with self.db() as db:
            result = []
            for r in db.execute('SELECT * FROM inventory ORDER BY category,name'):
                item = self._inventory(r)
                item['as_of_stock'] = db.execute('SELECT COALESCE(SUM(delta),0) FROM ledger WHERE item_id=? AND created_at<?', (r['id'], cutoff)).fetchone()[0] if cutoff else r['stock']
                result.append(item)
        return {'items': result, 'as_of': as_of, 'timezone': 'Asia/Kolkata'}

    def ledger(self, item_id=None, offset=0, limit=100):
        with self.db() as db:
            where, args = ('WHERE item_id=?', [item_id]) if item_id else ('', [])
            total = db.execute('SELECT COUNT(*) FROM ledger ' + where, args).fetchone()[0]
            rows = db.execute('SELECT * FROM ledger ' + where + ' ORDER BY id DESC LIMIT ? OFFSET ?', args + [min(limit, 200), offset]).fetchall()
        return {'items': [dict(r) for r in rows], 'total': total, 'next_offset': offset + len(rows) if offset + len(rows) < total else None}

    def _bill(self, db, ident):
        row = db.execute('SELECT * FROM bills WHERE id=?', (ident,)).fetchone()
        if not row:
            raise Error('Bill nahi mila.', 404)
        data = json.loads(row['data'])
        return {**dict(row), **data, 'locked': row['generated_at'] is not None and self.clock() >= row['generated_at'] + 3600, 'edit_until': row['generated_at'] + 3600 if row['generated_at'] else None,
                'comments': [dict(r) for r in db.execute('SELECT * FROM comments WHERE bill_id=? ORDER BY created_at,id', (ident,))],
                'audit': [dict(r) for r in db.execute('SELECT id,action,actor_id,actor_name,created_at FROM audit WHERE bill_id=? ORDER BY id', (ident,))]}

    def get_bill(self, ident):
        with self.db() as db:
            return self._bill(db, ident)

    def list_bills(self, query):
        clauses, args = [], []
        for key, column in [('status', 'status'), ('kind', 'kind'), ('creator', 'creator_id')]:
            if query.get(key):
                clauses.append(column + '=?')
                args.append(query[key])
        if query.get('q'):
            clauses.append('(bill_no LIKE ? OR data LIKE ? OR creator_name LIKE ?)')
            args += ['%' + query['q'][:120] + '%'] * 3
        for param, op in [('from', '>='), ('to', '<')]:
            if query.get(param):
                try:
                    date = dt.date.fromisoformat(query[param]) + (dt.timedelta(days=1) if param == 'to' else dt.timedelta())
                    value = dt.datetime.combine(date, dt.time(), IST).timestamp()
                except ValueError:
                    raise Error('Invalid date filter.')
                clauses.append('created_at' + op + '?')
                args.append(value)
        where = ' WHERE ' + ' AND '.join(clauses) if clauses else ''
        try:
            limit, offset = min(100, max(1, int(query.get('limit', 50)))), max(0, int(query.get('offset', 0)))
        except ValueError:
            raise Error('Invalid pagination.')
        with self.db() as db:
            total = db.execute('SELECT COUNT(*) FROM bills' + where, args).fetchone()[0]
            ids = db.execute('SELECT id FROM bills' + where + ' ORDER BY seq DESC LIMIT ? OFFSET ?', args + [limit, offset]).fetchall()
            rows = [self._bill(db, r['id']) for r in ids]
        return {'items': rows, 'total': total, 'next_offset': offset + len(rows) if offset + len(rows) < total else None}

    def _data(self, db, body, kind, existing=None):
        lines = body.get('lines', [])
        if not isinstance(lines, list) or len(lines) > 300:
            raise Error('Invalid bill items.')
        previous = {(x['item_id'], x['variant']): x for x in (existing or {}).get('lines', [])}
        clean, seen = [], set()
        for line in lines:
            if not isinstance(line, dict):
                raise Error('Invalid item.')
            ident = text(line.get('item_id'), 'Item', 100, True)
            variant = text(line.get('variant'), 'Variant', 30, True)
            qty = integer(line.get('qty'), 'Quantity', 1, 1000000)
            if (ident, variant) in seen:
                raise Error('Duplicate item lines nahi bhejein.')
            seen.add((ident, variant))
            old = previous.get((ident, variant))
            if old and existing.get('status') == 'generated':
                clean.append({**old, 'qty': qty})
                continue
            if kind == 'food':
                item = db.execute('SELECT * FROM food WHERE id=? AND active=1', (ident,)).fetchone()
                if not item or variant not in ('Half', 'Full', 'Regular'):
                    raise Error('Food item available nahi hai.')
                price = item['half'] if variant == 'Half' else item['full']
                if not price or (variant == 'Half' and not item['half']):
                    raise Error('Yeh serving available nahi hai.')
                units = 0
            else:
                item = db.execute('SELECT * FROM inventory WHERE id=? AND active=1', (ident,)).fetchone()
                if not item or variant not in ('Single', 'Packet'):
                    raise Error('Stock item available nahi hai.')
                price = item['packet_price'] if variant == 'Packet' else item['single_price']
                units = item['units_per_packet'] if variant == 'Packet' else 1
            clean.append({'item_id': ident, 'name': item['name'], 'variant': variant, 'qty': qty, 'price_cents': price, 'units': units})
        subtotal = sum(x['price_cents'] * x['qty'] for x in clean)
        discount = integer(body.get('discount_cents', 0), 'Discount', 0, 10**15)
        if discount > subtotal:
            raise Error('Discount bill subtotal se zyada nahi ho sakta.')
        tax_bps = integer(body.get('tax_bps', 0), 'Tax rate', 0, 10000)
        tax = ((subtotal - discount) * tax_bps + 5000) // 10000
        return {'table': text(body.get('table', ''), 'Table', 50), 'customer': text(body.get('customer', ''), 'Customer', 120), 'phone': text(body.get('phone', ''), 'Phone', 30),
                'lines': clean, 'subtotal_cents': subtotal, 'discount_cents': discount, 'tax_bps': tax_bps, 'tax_cents': tax, 'total_cents': subtotal - discount + tax}

    def create_bill(self, actor, body, key):
        kind = body.get('kind')
        if kind not in ('food', 'beverage'):
            raise Error('Food ya beverage bill choose karein.')
        def op(db):
            ident = str(uuid.uuid4())
            data = self._data(db, body, kind)
            now = self.clock()
            cursor = db.execute('INSERT INTO bills(id,kind,data,created_at,updated_at,creator_id,creator_name,updater_id,updater_name) VALUES(?,?,?,?,?,?,?,?,?)', (ident, kind, json.dumps(data), now, now, actor['id'], actor['name'], actor['id'], actor['name']))
            no = ('C4F' if kind == 'food' else 'C4B') + '-' + dt.datetime.fromtimestamp(now, IST).strftime('%y%m%d') + '-' + str(cursor.lastrowid).zfill(6)
            db.execute('UPDATE bills SET bill_no=? WHERE id=?', (no, ident))
            self._audit(db, ident, 'draft_created', actor, None, data)
            return self._bill(db, ident)
        return self.mutation(actor, key, 'bill/create', body, op)

    def _audit(self, db, ident, action, actor, before, after):
        db.execute('INSERT INTO audit(bill_id,action,actor_id,actor_name,created_at,before_data,after_data) VALUES(?,?,?,?,?,?,?)', (ident, action, actor['id'], actor['name'], self.clock(), json.dumps(before) if before else None, json.dumps(after) if after else None))

    def _stock_delta(self, db, ident, before, after, actor, action):
        def counts(lines):
            result = {}
            for x in lines:
                if x.get('units'):
                    result[x['item_id']] = result.get(x['item_id'], 0) + x['units'] * x['qty']
            return result
        old, new = counts(before), counts(after)
        for item_id in sorted(set(old) | set(new)):
            delta = old.get(item_id, 0) - new.get(item_id, 0)
            item = db.execute('SELECT * FROM inventory WHERE id=?', (item_id,)).fetchone()
            if not item:
                raise Error('Inventory record missing.', 409)
            number = db.execute('SELECT bill_no FROM bills WHERE id=?', (ident,)).fetchone()['bill_no']
            self._movement(db, item, delta, action, actor, 'Bill ' + number, ident)

    def update_bill(self, actor, ident, body, key, generate=False):
        def op(db):
            bill = self._bill(db, ident)
            if generate and bill['status'] == 'generated':
                return bill
            if bill['locked']:
                raise Error('Bill generate hue 1 ghanta ho gaya. Ab sirf comments add kar sakte hain.', 423, 'locked')
            if body.get('version') != bill['version']:
                raise Error('Bill kisi aur user ne update kiya hai. Latest bill load karein; aapka local draft safe hai.', 409, 'conflict')
            if body.get('kind', bill['kind']) != bill['kind']:
                raise Error('Bill type change nahi kar sakte. Naya bill banayein.')
            data = self._data(db, body, bill['kind'], bill)
            if generate and not data['lines']:
                raise Error('Generate karne se pehle items add karein.')
            if bill['kind'] == 'beverage' and (generate or bill['status'] == 'generated'):
                self._stock_delta(db, ident, bill['lines'] if bill['status'] == 'generated' else [], data['lines'], actor, 'bill_edit' if bill['status'] == 'generated' else 'bill_sale')
            now = self.clock()
            db.execute('UPDATE bills SET status=?,data=?,generated_at=?,updated_at=?,updater_id=?,updater_name=?,version=version+1 WHERE id=?', ('generated' if generate else bill['status'], json.dumps(data), now if generate else bill['generated_at'], now, actor['id'], actor['name'], ident))
            self._audit(db, ident, 'generated' if generate else 'bill_edited' if bill['status'] == 'generated' else 'draft_saved', actor, bill, data)
            return self._bill(db, ident)
        return self.mutation(actor, key, ('generate/' if generate else 'update/') + ident, body, op)

    def comment(self, actor, ident, body, key):
        def op(db):
            self._bill(db, ident)
            message = text(body.get('body'), 'Comment', 2000, True)
            db.execute('INSERT INTO comments VALUES(?,?,?,?,?,?)', (str(uuid.uuid4()), ident, message, actor['id'], actor['name'], self.clock()))
            return self._bill(db, ident)
        return self.mutation(actor, key, 'comment/' + ident, body, op)

    def export(self, actor, kind):
        self.admin(actor)
        with self.db() as db:
            if kind == 'stock-ledger':
                rows = [dict(r) for r in db.execute('SELECT * FROM ledger ORDER BY id')]
                headers = ['id', 'item_id', 'item_name', 'delta', 'balance', 'kind', 'bill_id', 'actor_id', 'actor_name', 'note', 'created_at', 'units_per_packet']
            elif kind == 'bills':
                rows = [dict(r) for r in db.execute('SELECT * FROM bills ORDER BY seq')]
                for row in rows:
                    row['comments'] = json.dumps([dict(c) for c in db.execute('SELECT * FROM comments WHERE bill_id=? ORDER BY created_at', (row['id'],))], ensure_ascii=False)
                headers = ['id', 'bill_no', 'kind', 'status', 'created_at', 'generated_at', 'creator_id', 'creator_name', 'updater_name', 'version', 'data', 'comments']
            else:
                raise Error('Unknown export.', 404)
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=headers, extrasaction='ignore')
        writer.writeheader()
        for row in rows:
            writer.writerow({k: "'" + v if isinstance(v, str) and v.startswith(('=', '+', '-', '@', '\t', '\r')) else v for k, v in row.items()})
        return output.getvalue()
