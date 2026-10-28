import concurrent.futures
import csv
import datetime as dt
import json
import tempfile
import unittest
from pathlib import Path
from billing_service.store import Store, Error, IST, password_hash

class BillingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.now = dt.datetime(2026, 10, 25, 12, tzinfo=IST).timestamp()
        (self.root / 'food-menu.csv').write_text('id,category,name,half_price,full_price,status\nf1,Food,Dal,10,20,active\n', encoding='utf-8')
        (self.root / 'billing-users.csv').write_text('id,mobile,password_hash,password_salt,name,status\n', encoding='utf-8')
        self.store = Store(self.root / 'data.sqlite3', clock=lambda: self.now, source_dir=self.root, csv_base='')
        self.store.bootstrap_admin('admin', 'test-only-admin-password')
        self.admin = self.store.login('admin', 'test-only-admin-password')['user']
        self.a = self.store.save_user(self.admin, {'name': 'Alice', 'mobile': '9000000001', 'password': 'password-a'})
        self.b = self.store.save_user(self.admin, {'name': 'Bob', 'mobile': '9000000002', 'password': 'password-b'})
        self.counter = 0

    def test_login_survives_twelve_hours_and_renews(self):
        session = self.store.login('9000000001', 'password-a')
        self.now += 13 * 3600
        self.assertEqual(self.store.authenticate(session['token'])['id'], self.a['id'])
        self.now += 364 * 86400
        self.assertEqual(self.store.authenticate(session['token'])['id'], self.a['id'])
        self.now += 2 * 86400
        self.assertEqual(self.store.authenticate(session['token'])['id'], self.a['id'])

    def tearDown(self):
        self.tmp.cleanup()

    def key(self):
        self.counter += 1
        return 'request-' + str(self.counter)

    def item(self, stock=100, name='Water', pack=10):
        return self.store.save_inventory(self.admin, {'name': name, 'category': 'Beverage', 'units_per_packet': pack, 'single_price': 250, 'packet_price': 2000, 'opening_singles': stock}, None, self.key())

    def draft(self, kind='food', lines=None, actor=None, table='1'):
        return self.store.create_bill(actor or self.a, {'kind': kind, 'table': table, 'lines': lines or []}, self.key())

    def payload(self, bill, lines=None):
        return {'version': bill['version'], 'kind': bill['kind'], 'table': bill['table'], 'lines': lines if lines is not None else [{k: x[k] for k in ('item_id', 'variant', 'qty')} for x in bill['lines']]}

    def assertError(self, status, fn):
        with self.assertRaises(Error) as raised:
            fn()
        self.assertEqual(raised.exception.status, status)
        return raised.exception

    def test_multiple_drafts_shared_history_and_creator(self):
        food = self.draft(lines=[{'item_id': 'f1', 'variant': 'Regular', 'qty': 2}])
        stock = self.item()
        drink = self.draft('beverage', [{'item_id': stock['id'], 'variant': 'Single', 'qty': 3}], self.b, '2')
        updated = self.store.update_bill(self.b, food['id'], {**self.payload(food), 'table': '9'}, self.key())
        self.assertEqual(updated['creator_name'], 'Alice')
        self.assertEqual(updated['updater_name'], 'Bob')
        self.assertEqual(self.store.get_bill(drink['id'])['lines'][0]['qty'], 3)
        self.assertEqual((drink['table'], drink['customer'], drink['phone']), ('', '', ''))
        self.assertEqual(self.store.stock()['items'][0]['stock'], 100)  # drafts reserve no stock
        self.assertEqual(self.store.list_bills({})['total'], 2)
        self.now += 10 * 86400
        self.assertEqual(self.store.list_bills({})['total'], 2)  # no two-day deletion

    def test_one_hour_is_generation_time_and_only_comments_after(self):
        draft = self.draft(lines=[{'item_id': 'f1', 'variant': 'Regular', 'qty': 2}])
        self.now += 5 * 3600
        bill = self.store.update_bill(self.a, draft['id'], self.payload(draft), self.key(), True)
        generation = bill['generated_at']
        self.now += 3599
        bill = self.store.update_bill(self.b, bill['id'], {**self.payload(bill), 'customer': 'Changed'}, self.key())
        self.assertEqual(bill['generated_at'], generation)
        self.now += 1
        self.assertTrue(self.store.get_bill(bill['id'])['locked'])
        self.assertError(423, lambda: self.store.update_bill(self.admin, bill['id'], self.payload(bill), self.key()))
        key = self.key()
        result = self.store.comment(self.b, bill['id'], {'body': 'Customer confirmed payment'}, key)
        self.store.comment(self.b, bill['id'], {'body': 'Customer confirmed payment'}, key)
        self.assertEqual(len(self.store.get_bill(bill['id'])['comments']), 1)
        self.assertEqual(result['comments'][0]['actor_name'], 'Bob')
        self.assertEqual(result['total_cents'], bill['total_cents'])

    def test_packet_single_stock_edits_and_price_snapshot(self):
        item = self.item()
        draft = self.draft('beverage', [{'item_id': item['id'], 'variant': 'Packet', 'qty': 2}, {'item_id': item['id'], 'variant': 'Single', 'qty': 3}])
        request = self.key()
        bill = self.store.update_bill(self.a, draft['id'], self.payload(draft), request, True)
        self.store.update_bill(self.a, draft['id'], self.payload(draft), request, True)
        self.store.update_bill(self.a, draft['id'], self.payload(draft), self.key(), True)
        self.assertEqual(self.store.stock()['items'][0]['stock'], 77)
        self.assertEqual(bill['total_cents'], 4750)
        updated_item = self.store.stock()['items'][0]
        self.store.save_inventory(self.admin, {**updated_item, 'single_price': 999, 'active': True}, item['id'], self.key())
        bill = self.store.update_bill(self.b, bill['id'], self.payload(bill, [{'item_id': item['id'], 'variant': 'Packet', 'qty': 1}, {'item_id': item['id'], 'variant': 'Single', 'qty': 4}]), self.key())
        self.assertEqual(self.store.stock()['items'][0]['stock'], 86)
        self.assertEqual(bill['total_cents'], 3000)  # historical unit prices stay fixed
        movement = self.store.ledger()['items'][0]
        self.assertEqual((movement['delta'], movement['actor_name'], movement['kind']), (9, 'Bob', 'bill_edit'))
        self.assertEqual(self.store.stock('2026-10-25')['items'][0]['as_of_stock'], 86)
        self.assertEqual(self.store.stock('2026-10-24')['items'][0]['as_of_stock'], 0)
        self.now += 86400
        current = self.store.stock()['items'][0]
        self.store.restock(self.admin, current['id'], {'packets': 2, 'singles': 1}, self.key())
        self.assertEqual(self.store.stock('2026-10-25')['items'][0]['as_of_stock'], 86)
        self.assertEqual(self.store.stock()['items'][0]['stock'], 107)

    def test_atomic_insufficient_stock_rolls_back_all_items(self):
        a, b = self.item(10, 'A'), self.item(0, 'B')
        bill = self.draft('beverage', [{'item_id': a['id'], 'variant': 'Single', 'qty': 2}, {'item_id': b['id'], 'variant': 'Single', 'qty': 1}])
        before = {x['id']: x['stock'] for x in self.store.stock()['items']}
        self.assertError(409, lambda: self.store.update_bill(self.a, bill['id'], self.payload(bill), self.key(), True))
        self.assertEqual({x['id']: x['stock'] for x in self.store.stock()['items']}, before)
        self.assertEqual(self.store.get_bill(bill['id'])['status'], 'draft')
        self.assertFalse(any(x['kind'] == 'bill_sale' for x in self.store.ledger()['items']))

    def test_concurrent_sales_cannot_oversell(self):
        item = self.item(40)
        drafts = [self.draft('beverage', [{'item_id': item['id'], 'variant': 'Packet', 'qty': 3}], actor) for actor in (self.a, self.b)]
        def sell(pair):
            bill, actor, key = pair
            try:
                return self.store.update_bill(actor, bill['id'], self.payload(bill), key, True)['status']
            except Error as e:
                return e.code
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            result = list(pool.map(sell, [(drafts[0], self.a, 'concurrent-a'), (drafts[1], self.b, 'concurrent-b')]))
        self.assertCountEqual(result, ['generated', 'stock'])
        self.assertEqual(self.store.stock()['items'][0]['stock'], 10)

    def test_conflicts_authorization_blocking_and_money(self):
        bill = self.draft(lines=[{'item_id': 'f1', 'variant': 'Regular', 'qty': 1}])
        body = {**self.payload(bill), 'discount_cents': 1, 'tax_bps': 500, 'price_cents': 1, 'creator_name': 'Forged'}
        updated = self.store.update_bill(self.b, bill['id'], body, self.key())
        self.assertEqual(updated['total_cents'], 2099)
        self.assertEqual(updated['creator_name'], 'Alice')
        self.assertError(409, lambda: self.store.update_bill(self.a, bill['id'], self.payload(bill), self.key()))
        self.assertError(403, lambda: self.item_as_staff())
        session = self.store.login('9000000001', 'password-a')
        self.store.save_user(self.admin, {'name': 'Alice', 'mobile': '9000000001', 'status': 'blocked'}, self.a['id'])
        self.assertError(401, lambda: self.store.authenticate(session['token']))
        self.assertError(401, lambda: self.store.login('9000000002', 'wrong-password'))

    def item_as_staff(self):
        return self.store.save_inventory(self.a, {}, None, self.key())

    def test_restock_retry_no_duplicate_and_csv_export(self):
        item = self.item(0)
        key = self.key()
        body = {'packets': 2, 'singles': 3}
        self.store.restock(self.admin, item['id'], body, key)
        self.store.restock(self.admin, item['id'], body, key)
        self.assertEqual(self.store.stock()['items'][0]['stock'], 23)
        self.assertError(409, lambda: self.store.restock(self.admin, item['id'], {'packets': 3}, key))
        csv_text = self.store.export(self.admin, 'stock-ledger')
        self.assertIn('Billing Admin', csv_text)
        self.assertIn('restock', csv_text)
        self.assertError(403, lambda: self.store.export(self.a, 'bills'))

    def test_existing_csv_accounts_import_and_removal(self):
        salt = 'test-salt'
        (self.root / 'billing-users.csv').write_text('id,mobile,password_hash,password_salt,name,status\nold,9000000003,' + password_hash('old-password', salt) + ',' + salt + ',Legacy,Active\n')
        self.store.sync_sources(True)
        legacy = self.store.login('9000000003', 'old-password')
        self.assertEqual(legacy['user']['name'], 'Legacy')
        (self.root / 'billing-users.csv').write_text('id,mobile,password_hash,password_salt,name,status\n')
        self.store.sync_sources(True)
        self.assertError(401, lambda: self.store.authenticate(legacy['token']))
        self.assertEqual(self.store.login('9000000002', 'password-b')['user']['name'], 'Bob')

if __name__ == '__main__':
    unittest.main()
