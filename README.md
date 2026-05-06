# Call4All — One Call, Every Service

A static website + GitHub-backed admin panel for **Call4All**, a service aggregator that connects customers to trusted service providers (rental cars, rooms & flats, construction labor, home tutors, manpower, marriage services, and more).

🌐 Live: https://www.call4all.co.in

---

## ✨ Features

- **Modern responsive site** — works perfectly on mobile, tablet, and desktop.
- **Service-rich homepage** — auto-rotating slider, service grid, "How it works", "Why choose us".
- **9 service pages** — Rental Cars, Rooms & Flats, Construction Labor / Thekedar, Home Tutor, Manpower Supply, Marriage Services, Hotel Flower Bouquet, Car Decoration, and Custom service.
- **Booking form on every service page** — pre-selects the relevant service.
- **Floating WhatsApp + Call buttons** on every page.
- **WhatsApp integration** — every form submission opens WhatsApp with a beautifully formatted message including a unique reference ID.
- **GitHub-backed CSV storage** — all bookings stored in `data/bookings.csv` directly in this repo.
- **Admin Panel** (`/admin.html`) — view / add / edit / delete bookings, search, filter by status, export CSV.
- **Optional public auto-save** — admin can configure a GitHub token to auto-save form submissions to CSV.

---

## 📁 Project Structure

```
call4all/
├── index.html              # Homepage
├── about.html              # About us
├── contact.html            # Contact + booking form
├── admin.html              # Admin panel (login + dashboard)
├── rental-cars.html        # Service pages
├── rooms-flats.html
├── construction.html       # NEW: construction labor / thekedar
├── home-tutor.html         # NEW: home tutors
├── manpower-supply.html
├── marriage-services.html
├── flower-bouquet.html
├── car-decoration.html
├── data/
│   └── bookings.csv        # All bookings stored here
├── assets/
│   ├── css/style.css       # All site styles
│   └── js/
│       ├── site.js         # Header, footer, floating buttons
│       ├── booking.js      # Booking form + GitHub CSV API
│       └── admin.js        # Admin panel logic
├── Imagelogo.png
└── CNAME                   # custom domain
```

---

## 🔐 Admin Panel Setup (One-time)

### Step 1 — Create a GitHub Personal Access Token (PAT)

The admin panel reads/writes `data/bookings.csv` directly through the GitHub API. You need a fine-grained PAT.

1. Go to **https://github.com/settings/personal-access-tokens/new**
2. **Token name:** `Call4All Admin`
3. **Expiration:** 90 days (or longer — set a calendar reminder to rotate)
4. **Repository access:** *Only select repositories* → choose `BRIJBHAN-SINGH234/call4all`
5. **Permissions** → *Repository permissions* → set:
   - **Contents:** `Read and write` ✅
   - (everything else can stay `No access`)
6. Click **Generate token** and **copy** the token string (looks like `github_pat_xxxxxxx...`).
7. ⚠️ Store it somewhere safe — GitHub won't show it again.

### Step 2 — Login to the Admin Panel

1. Open `https://www.call4all.co.in/admin.html` (or `https://brijbhan-singh234.github.io/call4all/admin.html`).
2. Enter:
   - **Username:** anything (e.g. `admin`)
   - **Password:** set any password you like (saved hashed on this browser only)
   - **GitHub Personal Access Token:** paste the token from Step 1
3. Click **Login**. The token is saved in `localStorage` of *this browser only*.
4. You are now in the admin dashboard.

### Step 3 — Manage Bookings

In the admin panel you can:

- **View all bookings** in a sortable table with stats at the top.
- **Search** by name, phone, service, location, or message text.
- **Filter** by status (New / Contacted / Completed / Cancelled).
- **Add a booking** manually (e.g. when a customer calls instead of using the form).
- **Edit** any booking — change status, fix typos, etc.
- **Delete** a booking.
- **Export CSV** to download a backup at any time.
- **Refresh** to pull the latest CSV from GitHub.

Every change is committed back to `data/bookings.csv` on GitHub immediately.

---

## 📝 How Customer Form Submissions Work

There are **two modes** the form can run in. Pick whichever is right for you.

### Mode A — WhatsApp only (default, most secure)

1. Customer fills the form on any page.
2. Their browser opens WhatsApp with a pre-formatted message including:
   - Reference ID (e.g. `BK1746543210123`)
   - Name, phone, service, location, requirement
3. Customer hits *Send* in WhatsApp.
4. You receive the WhatsApp message on **+91 8387930687**.
5. You log into the admin panel and click **➕ Add Booking** to manually create a CSV entry from the WhatsApp details (or just copy-paste the requirement).

✅ Pros: No public token in JavaScript. 100% secure.
❌ Cons: You add CSV entries manually.

### Mode B — Auto-save to CSV + WhatsApp (optional, more automated)

In this mode, every public form submission **also** writes a row to `data/bookings.csv` automatically.

To enable:

1. Login to the admin panel.
2. Click **⚙️ Settings**.
3. Paste a fine-grained PAT in the **Public Form Auto-Save Token** field.
4. Click **Save Settings**.

Now every form submission will automatically:
- Save a row in `data/bookings.csv` (you'll see the booking immediately in admin)
- Open WhatsApp for the customer to send confirmation

⚠️ **Security note:** This token is stored in your browser's `localStorage`, but it is also used by the public form — meaning **any visitor on this same browser** could read it. Best practice for Mode B:

- Use a **separate fine-grained PAT** with *only* `Contents: Read and write` on this single repo.
- Rotate the token every 90 days.
- Never enable Mode B on a public/shared computer.

If unsure, **stick with Mode A**.

---

## 📂 CSV Format

`data/bookings.csv` columns:

| Column      | Example                              |
|-------------|--------------------------------------|
| `id`        | `BK1746543210123`                    |
| `timestamp` | `2026-05-06T11:13:30.123Z`           |
| `name`      | `Ramesh Kumar`                       |
| `phone`     | `+919812345678`                      |
| `service`   | `Rental Cars`                        |
| `location`  | `Delhi`                              |
| `message`   | `Need Innova for Delhi-Jaipur trip` |
| `status`    | `New` / `Contacted` / `Completed` / `Cancelled` |

Multi-line messages and commas are properly escaped (RFC 4180).

---

## 🚀 Running Locally

This is a static site — just open `index.html` in a browser. For full functionality (admin panel, GitHub API CORS), serve it via a local web server:

```bash
# Python 3
python3 -m http.server 8000

# Or Node
npx serve .
```

Then open http://localhost:8000

---

## 🌐 Deploying

This repo is configured for **GitHub Pages**. Once you push to `main`:

1. Go to **Settings** → **Pages** in the repo.
2. **Source:** Deploy from a branch → `main` / `(root)`.
3. The site will be live at `https://brijbhan-singh234.github.io/call4all/`.
4. The `CNAME` file makes it serve at `www.call4all.co.in` (custom domain).

---

## ✏️ Customisation

| What                       | Where                                                    |
|----------------------------|----------------------------------------------------------|
| Phone / WhatsApp / email   | `assets/js/site.js` → `SITE_CONFIG`                      |
| Service list               | `assets/js/site.js` → `SITE_CONFIG.services`             |
| Colors / theme             | `assets/css/style.css` → `:root` CSS variables           |
| Logo                       | Replace `Imagelogo.png`                                  |
| Add a new service page     | Copy any service `.html`, change title and `service` key |

To add a new service, just:

1. Add an entry in `SITE_CONFIG.services` in `site.js` (`id`, `name`, `icon`, `desc`, `page`).
2. Create a new HTML file (copy `home-tutor.html` as template).
3. Update the `renderBookingForm({ service: 'Your Service' })` call inside the new file.

---

## 🛟 Troubleshooting

**"Invalid GitHub token" on login**
- Token must have `Contents: Read and write` on this exact repo.
- Make sure repository access is set to *only* this repo.
- Token may have expired — generate a new one.

**"Failed to save CSV (409)"**
- Someone else updated the CSV — click **🔄 Refresh** and retry.

**Form not opening WhatsApp on mobile**
- Some Android browsers block popups; the form falls back to a redirect.
- Make sure WhatsApp is installed on the device.

**Admin panel shows 0 bookings but CSV has rows**
- The CSV file must have a header row matching: `id,timestamp,name,phone,service,location,message,status`.

---

## 📞 Support

For business enquiries: **+91 8387930687** or **info@call4all.co.in**
For website issues: open an [issue on GitHub](https://github.com/BRIJBHAN-SINGH234/call4all/issues).

---

© 2026 Call4All — One Call, Every Service.
