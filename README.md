# Call4All — One Call, Every Service

A static website + GitHub-backed admin & staff panel for **Call4All**, a service aggregator that connects customers to trusted service providers (rental cars, rooms & flats, construction labor, home tutors, manpower, marriage services, and more).

🌐 Live: https://www.call4all.co.in

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

1. Open `https://www.call4all.co.in/admin.html`.
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
3. You receive on **+91 8387930687**.
4. Open admin panel → **➕ Add Booking** to add it to the CSV.

### Mode B — Auto-save + WhatsApp
1. Admin → ⚙️ Settings → paste a fine-grained PAT in **Public Form Auto-Save Token**.
2. Form submissions then automatically write to `bookings.csv` on GitHub.
3. WhatsApp also opens for confirmation.

⚠️ Mode B exposes the token in the public site's localStorage on this browser. Use a separate fine-grained PAT, rotate every 90 days, never enable on a public computer.

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
2. Live at `https://www.call4all.co.in/` (custom domain via `CNAME`).
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

- Business: **+91 8387930687** / **info@call4all.co.in**
- Repo issues: https://github.com/BRIJBHAN-SINGH234/call4all/issues

---

© 2026 Call4All — One Call, Every Service.
