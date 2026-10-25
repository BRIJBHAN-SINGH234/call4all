# Call4All — One Call, Every Service

A static website + GitHub-backed admin & staff panel for **Call4All**, a service aggregator that connects customers to trusted service providers (rental cars, rooms & flats, construction labor, home tutors, manpower, marriage services, and more).

🌐 Live: https://call4all.co.in

---

## ✨ Features

### Customer-facing
- Modern responsive site (mobile-first design).
- 9 service pages, each with auto-pre-filled booking form.
- Floating WhatsApp + Call buttons on every page.
- Booking form with **city + area + house-no/landmark** address structure — only admin-approved areas show up.
- Every form submission opens WhatsApp with a beautifully formatted message including a unique reference ID.

### Admin Panel (`/admin.html`)
Tabbed interface with five sections:

1. **📋 Bookings** — view / add / edit / delete customer requirements.
2. **🗂️ Sources / Inventory** — track every service provider, room, car, labor, tutor etc. with location, contact, price, availability.
3. **👥 Staff** — create staff accounts (email + password), block / unblock, change passwords.
4. **📍 Service Areas** — define cities and areas where service is available; Active areas show in customer dropdowns.
5. **⚙️ Settings** — admin password, optional public-form auto-save token.

### Staff Portal (`/staff.html`)
Separate frontend for staff members:

- Login with email + password (validated against `data/staff.csv`).
- Add / edit / delete sources/inventory entries (own entries only).
- View all sources from all staff (read-only for others' entries).
- "My Entries" filter by default.
- Blocked staff cannot login.

---

## 📁 Project Structure

```
call4all/
├── index.html              # Homepage
├── about.html              # About us
├── contact.html            # Contact + booking form
├── admin.html              # Admin panel (5 tabs)
├── staff.html              # Staff portal
├── rental-cars.html        # Service pages
├── rooms-flats.html
├── construction.html       # Construction labor / thekedar
├── home-tutor.html         # Home tutors
├── manpower-supply.html
├── marriage-services.html
├── flower-bouquet.html
├── car-decoration.html
├── data/
│   ├── bookings.csv        # Customer bookings
│   ├── sources.csv         # Service-provider inventory
│   ├── staff.csv           # Staff accounts (passwords are SHA-256 hashed)
│   └── areas.csv           # Service cities + areas
├── assets/
│   ├── css/style.css       # All site styles
│   └── js/
│       ├── site.js         # Header, footer, floating buttons, config
│       ├── booking.js      # Booking form + GitHub CSV API helpers
│       ├── admin.js        # Admin panel logic (5 tabs)
│       └── staff.js        # Staff portal logic
├── Imagelogo.png
├── CNAME                   # custom domain
└── README.md
```

---

## 🔐 Admin Setup (One-time)

### Step 1 — Create a GitHub Personal Access Token (PAT)

1. Go to **https://github.com/settings/personal-access-tokens/new**
2. **Token name:** `Call4All Admin`
3. **Expiration:** 90 days (set a calendar reminder to rotate)
4. **Repository access:** *Only select repositories* → `BRIJBHAN-SINGH234/call4all`
5. **Permissions** → *Repository permissions* → set:
   - **Contents:** `Read and write` ✅
   - (everything else `No access`)
6. Click **Generate token** and **copy** the token string (`github_pat_xxx...`).
7. ⚠️ Store it safely — GitHub won't show it again.

### Step 2 — Login to the Admin Panel

1. Open `https://call4all.co.in/admin.html`.
2. Enter:
   - **Username/Email:** anything (e.g. `admin@call4all.co.in`)
   - **Password:** any password you like (saved hashed on this browser)
   - **GitHub PAT:** paste from Step 1
3. Click **Login**.

### Step 3 — Initial Setup Sequence (recommended order)

After first login, populate things in this order:

1. **📍 Service Areas tab** — Add the cities and areas where you provide service.
   - Example: City = `Delhi`, Area = `Karol Bagh` → Status = Active.
   - Add as many as needed. Customers will see only `Active` areas.
2. **👥 Staff tab** — Add your team members with email + password.
   - Each staff gets a separate login at `/staff.html`.
3. **🗂️ Sources tab** — Start adding your inventory:
   - Rooms available at certain locations
   - Cars in stock
   - Labor/contractors
   - Tutors with subject expertise
   - etc.
4. **📋 Bookings tab** — Customer requests automatically come here (or you add manually from WhatsApp).

---

## 👥 Adding & Managing Staff

In **Admin Panel → 👥 Staff tab**:

1. Click **➕ Add Staff** — enter name, email, phone, role, set initial password, and click Save.
2. After save, you'll see a popup with the credentials. Share these via WhatsApp/email with the staff member.
3. You also need to share a **GitHub PAT** with each staff member (so they can save data to GitHub):
   - You can use the same admin PAT (simplest, but they'll have full repo access).
   - Or create a separate fine-grained PAT per staff member with `Contents: Read and write` for safer rotation.
4. Staff visits `/staff.html`, logs in with email + password, then enters the GitHub PAT once.

### Block / Unblock Staff
Click the 🚫 Block button on any row. Blocked staff cannot login — even mid-session, the dashboard auto-detects and logs them out.

### Change Staff Password
Click ✏️ Edit on any staff row, type new password, save. The old password stops working immediately.

---

## 📍 Service Areas

The areas you define in the Areas tab control:

- The **city dropdown** in customer booking forms.
- The **area dropdown** (filtered by selected city).
- The cities/areas available when adding **Sources** (admin and staff).

If a customer's city/area isn't listed:
- Admin can mark it `Inactive` instead of deleting (preserves historical data).
- Customer can choose "Other city/area not listed" and type manually.

---

## 🗂️ Sources / Inventory

Use this section to keep a live database of:
- Available rooms in different localities
- Cars in your fleet (or partners' fleets)
- Construction labor / contractors
- Home tutors with their subjects
- Manpower providers
- Decorators, caterers, etc.

Each source has:

| Field | Description |
|-------|-------------|
| Category | matches your services list |
| Name | "2BHK at Karol Bagh", "Innova Crysta white" etc. |
| City + Area | from your service areas |
| Address | full street address |
| Contact Person + Phone | the actual provider |
| Price | flexible text — ₹15,000/month, ₹2000/day, "negotiable" |
| Availability | Available / Booked / On-Hold / Inactive |
| Notes | parking, conditions, hours, etc. |
| Added By | auto-filled (admin or staff email) |

**Workflow:** When a customer requirement comes in (e.g. "2BHK in Delhi/Karol Bagh"), open the Sources tab, filter by `Category = Rooms & Flats` and `City = Delhi`, and you instantly see who you can connect them to.

---

## 📝 Customer Form Submissions

Two modes (configurable in Admin → ⚙️ Settings):

### Mode A — WhatsApp only (default, most secure)
1. Customer fills the form — picks city, area, types address, requirement.
2. WhatsApp opens with a pre-formatted message (Ref ID + all details).
3. You receive on **+91 7737353588**.
4. Open admin panel → **➕ Add Booking** to add it to the CSV.

### Mode B — Auto-save + WhatsApp (recommended)
1. Admin → ⚙️ Settings → paste a fine-grained PAT in **Public Form Auto-Save Token** → Save.
2. The token is committed to `data/site-config.json` so every visitor's browser receives it on page load.
3. Each customer submission then writes a row to `data/bookings.csv` via the GitHub Contents API **and** opens WhatsApp.
4. New bookings show up in the admin Bookings tab within seconds — no manual entry needed.

⚠️ **Security trade-off (read carefully):** Because the token sits in a public file, anyone inspecting the site with browser DevTools can read it.
- ✅ Use a **fine-grained PAT** scoped to **only** this repo with **only** `Contents: Read & Write` permission. Nothing else.
- ✅ Rotate every 90 days (or sooner if you suspect abuse).
- ✅ If spam rows appear in `bookings.csv`, click **Clear Public Token** in admin Settings, revoke the PAT on GitHub, generate a new one.
- ❌ Worst case = junk rows in the CSV (easy to delete). The PAT cannot touch any other repo, your account, or anything else.

For a fully-secure setup (token never exposed), put the GitHub PAT behind a serverless function (Cloudflare Worker / Vercel function) and POST the booking row to that function instead. The current architecture is intentionally simple/static and accepts the trade-off above for free hosting on GitHub Pages.

---

## 📂 CSV Schemas

### `data/bookings.csv`
```
id, timestamp, name, phone, service, city, area, address, message, status
```
Status values: `New` / `Contacted` / `Completed` / `Cancelled`

### `data/sources.csv`
```
id, timestamp, category, name, city, area, address, contact_person, contact_phone, price, availability, notes, added_by
```
Availability values: `Available` / `Booked` / `On-Hold` / `Inactive`

### `data/staff.csv`
```
id, email, password_hash, name, phone, role, status, created_at, created_by
```
- `password_hash` is SHA-256 (never plaintext)
- Status values: `Active` / `Blocked`

### `data/areas.csv`
```
id, city, area, status, created_at
```
Status values: `Active` / `Inactive`

All CSVs follow RFC 4180 (commas, quotes and newlines properly escaped).

---

## 🚀 Running Locally

```bash
python3 -m http.server 8000
# or
npx serve .
```
Then open http://localhost:8000

---

## 🌐 Deploying to GitHub Pages

This repo is already configured. After every push to `main`:

1. GitHub Pages auto-builds in ~1-2 minutes.
2. Live at `https://call4all.co.in/` (custom domain via `CNAME`).
3. Or `https://brijbhan-singh234.github.io/call4all/`.

---

## ✏️ Customisation

| What | Where |
|------|-------|
| Phone / WhatsApp / email | `assets/js/site.js` → `SITE_CONFIG` |
| Service list (categories) | `assets/js/site.js` → `SITE_CONFIG.services` |
| Colors / theme | `assets/css/style.css` → `:root` CSS variables |
| Logo | Replace `Imagelogo.png` |

---

## 🛟 Troubleshooting

**"Invalid GitHub token" on login**
Token must have `Contents: Read and write` on `BRIJBHAN-SINGH234/call4all`. Repository access must be set to *only* this repo. Token may be expired.

**"Failed to save CSV (409)"**
Someone else updated the file — click 🔄 Refresh on that tab and retry.

**Admin shows 0 areas/sources/staff but CSVs exist**
GitHub raw files may be cached. The site adds a cache-buster, but sometimes you need to hard reload (Ctrl+Shift+R).

**Staff can't login**
- Email must exactly match (case-insensitive).
- Status must be `Active` (not `Blocked`).
- Password is case-sensitive.

**Staff "your account has been blocked" loop**
The staff account is blocked — admin must unblock from `/admin.html` → Staff tab.

**Customer city/area dropdown is empty**
You haven't added any active areas yet. Admin → 📍 Service Areas → ➕ Add Area.

---

## 📞 Support

- Business: **+91 7737353588** / **info@call4all.co.in**
- Repo issues: https://github.com/BRIJBHAN-SINGH234/call4all/issues

---

© 2026 Call4All — One Call, Every Service.

## Team game rooms (GitHub Pages)

Open `team-games.html` on the live HTTPS domain. The host selects **Admin login** and verifies a GitHub token with write access to this repository. The existing browser's admin password is checked if one was configured in `admin.html`.

1. The host configures total teams (1–100), members per team (1–100), and 1–50 games from the 50-game catalog. Game count, exact selection, order and the reaction tie-breaker are controlled by the host. The host then creates the room and shares its six-digit number with captains.
2. Each captain selects **Team create**, enters the room number, team name and their own name. The captain occupies member slot 1. The room generates a code such as `123456-A1B2C3`; the captain shares it with the remaining members required by the room settings.
3. Each member selects **Team code se join**, enters that code and their own name on their own phone. A team has exactly the number of members chosen by the host. Codes encode the room number, so members do not need a separate table number.
4. The host approves teams. Each member independently marks themselves ready. Host Start is enabled only when at least one team exists and the configured number of teams have all their configured members approved, connected and ready. Extra teams and extra members are rejected; reconnects retain their existing slots.
5. The host starts each selected game in the configured order. All participating teams begin with a five-second countdown. Each team member plays their own turn on their own phone; other members see whose turn it is. Only the next member can start their own turn. The 50 playable rulesets cover memory, colour, number hunts, reaction, maths, spatial transformations, odd-one-out, number patterns, comparisons and code breaking (five rulesets per category). Each member can earn up to 100 points per game, so the team maximum is members × selected games × 100. Tied leaders play the host-selected reaction tie-breaker until one team wins.
6. The host can download final results or save them to `data/team-game-results-v2.csv` on `main`. Saving requires Contents write permission. The same tournament cannot be appended twice. The CSV stores the team/member counts, selected game IDs and per-game scores. The original four-game results CSV is left intact. Player names and tokens are not written to the results CSV.

### Refresh and recovery

Room state, team codes, membership tickets, answers and scores are saved in browser storage. Host state and member identity are automatically restored on refresh in the same browser. The host's access token remains in session storage, not local storage or peer messages, and is verified again during automatic recovery. Reopening a closed host tab may require admin login; the saved room is retained. Do not clear browser storage or use a different browser if you want automatic identity recovery.

A member or host disconnect pauses the active room. Once the host and all participating members reconnect, turn timestamps move forward by the paused duration. Turn IDs, questions, previous answers, scores, the current game and membership slots are preserved. Joining with an existing ticket never consumes another member slot; retried captain creation never creates a second team. Member refresh is recovered with automatic retries while the host reconnects. The host should keep their device awake and page open during play.

GitHub Pages hosts the files. Vendored PeerJS 1.5.5 uses PeerJS Cloud for WebRTC signaling; live room state is controlled by the host browser rather than polled from CSV. Restrictive networks may require a TURN relay or shared Wi-Fi. Very large rooms depend on host/network capacity. Reaction scores include network transit time. The host is trusted; this is not a tamper-proof prize system.

PeerJS source: https://github.com/peers/peerjs — license at `assets/vendor/peerjs-LICENSE`.

Open `tests/team-room-engine.html` for game-engine regression checks and `tests/team-members.html` for captain creation, team codes, four-member limits, reconnection and pause/resume checks.

Open `tests/team-catalog.html` for all 50 games (1,500 generated puzzles), custom team/member limits, chosen game order, dynamic scoring, configured tie-breakers and recovery checks.

## Shared CSV billing workspace and beverage stock

`food-billing.html` now opens `billing-workspace.html`. The workspace has billing-specific navigation, multiple pending tables, food and beverage bills, all-user history, creator/updater attribution, item click feedback, print/WhatsApp bills and attributed comments. User-scoped drafts and the selected table survive refresh and navigation. Existing device-only legacy history is shown separately; previously expired/deleted legacy bills cannot be recovered.

### GitHub CSV storage (default, no separate hosting)

`data/billing-config.json` selects `storage: "github-csv"`, repository `BRIJBHAN-SINGH234/call4all`, branch `main`, and `data/billing-records.csv`. Food items remain in `data/food-menu.csv` and billing accounts in `data/billing-users.csv`. Admin-created users use the existing compatible salted PBKDF2 password format. No password or access token is shipped in the code.

The shared records CSV contains typed rows for bills (including item/price snapshots), inventory, stock movements, comments, activity and retry identities. Human-readable ID, actor, bill, item and timestamp columns accompany a `data_json` column, quoted using standard CSV rules. Bill generation, stock changes and their movement records are saved in **one conditional GitHub Contents API write**. On a competing write, the app reloads the latest CSV and revalidates quantities and versions. Insufficient stock rejects the whole operation. Retrying a committed request after a lost response reuses its identity and does not deduct or add stock twice. A stale bill edit remains a local draft/conflict rather than replacing another user's work.

Setup on each trusted billing device:

1. Open `billing-stock-admin.html` and enter a GitHub token with **Contents: read/write** access to the configured data repository. The existing dashboard token can also be used. Keep tokens out of source code, CSVs, messages and screenshots.
2. Create/manage active billing accounts and beverage/snack inventory. Enter item name, packet size, separate packet/single prices and opening quantity. Use Add qty for subsequent deliveries.
3. Open `billing-workspace.html`, sign in with the billing account, and provide GitHub save access on that browser session if it is not already connected. The save credential lives in sessionStorage, not in the shared CSV. Logging out clears that session credential. Every device that writes CSV needs repository access; a billing password alone cannot grant GitHub write permission.
4. Create as many table drafts as needed. Drafts do not reserve stock. Generate the bill to deduct packet quantities converted to single units. During the next hour, saved bill changes deduct/refund only the difference. After that the app allows comments only.

GitHub CSV mode is for **trusted operators**. All devices with a repository write token can edit files directly, so browser user roles and the one-hour rule are app controls, not tamper-proof server enforcement. The app uses the GitHub response Date when the browser exposes it, otherwise the device clock; someone who can directly change the clock, CSV or code can bypass it. A repository token grants repository-level access, not just bill access. Use a separately configured **private data repository** if customer names, phone numbers, bills or stock must be private; rows and Git history in a public repository are public. Never store a token in public configuration. GitHub API permission/rate-limit/network errors leave device drafts pending and are shown to the operator; syncing needs internet and can take a few seconds. Staff must check the Saved state before closing a device/session.

Admin stock shows current singles, packet equivalents, closing balances for selected dates in Asia/Kolkata, and the actor/date/bill for every opening quantity, restock, sale and edit. Bill exports and stock-ledger exports are available. Existing generated item prices and packet sizes remain historical snapshots when the catalog changes. All active billing users can view shared bill history without the former two-day cutoff. User blocking retains old bill attribution.

Run the isolated real-browser CSV integration test (Chrome/Chromium, Python standard library):

```bash
python3 tests/run_billing_csv_browser.py
```

It simulates the GitHub Contents API locally and never contacts the live repository. It tests the actual workspace and stock admin across separate browser sessions, refresh recovery, all-user history, packet/single deductions, simultaneous last-item sales with an actual SHA conflict, retries after a lost commit response, exact one-hour locking, comments, account management and CSV export.

### Optional trusted service mode

The included `billing_service` is an alternative for installations that later need server-enforced permissions and edit deadlines. It is **not required or active in CSV mode**. It uses Python's standard library and SQLite transactions. To use it locally, set the config to `{"apiBase":""}` and run `python3 -m billing_service.server`; open `http://127.0.0.1:8787/billing-workspace.html`. Existing GitHub write-access tokens can log in as admin. Alternatively set `BILLING_ADMIN_USER` and `BILLING_ADMIN_PASSWORD` (at least 12 characters, environment only).

For production service mode, deploy behind HTTPS with a persistent `BILLING_DB` path, `BILLING_BIND=0.0.0.0`, `PORT`, and `BILLING_ALLOWED_ORIGINS` containing the frontend origin. Set `apiBase` to the deployed HTTPS URL and omit `storage`. Optional `BILLING_CSV_BASE_URL` supplies existing food/user CSVs; otherwise the local checkout data is read. API-managed users and bills stay in the database in this optional mode. Back up the database using SQLite's backup API or a consistent volume snapshot. The service does not publish customer data or credentials to GitHub.

Service-mode checks: `python3 -m unittest discover -s tests -p 'test_billing_store.py' -v` and optional `python3 tests/run_billing_browser.py`.
