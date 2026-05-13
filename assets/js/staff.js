/* ===== Call4All - Staff Portal Logic =====
 * 3-step authentication:
 *   1. Email + password (validated against the staff database)
 *   2. Access key entry (one-time per browser)
 *   3. Staff Dashboard - manage sources/inventory entries
 *
 * Implementation notes (internal):
 * - data/staff.csv stores SHA-256 hashed passwords (never plaintext)
 * - The "access key" shown to staff is internally a GitHub fine-grained PAT
 *   that grants Contents: Read and write on the data repo. We deliberately
 *   hide this branding from staff so the storage backend stays opaque.
 * - The key is stored in localStorage on staff's browser only.
 */

const SS_EMAIL = 'c4a_staff_email';
const SS_NAME = 'c4a_staff_name';
const SS_TOKEN = 'c4a_staff_token';
const SS_SESSION = 'c4a_staff_session';
const SS_SEEN_BOOKINGS = 'c4a_staff_seen_bookings';
const SS_NOTIF_ENABLED = 'c4a_staff_notif_enabled';

const PATH_SOURCES = 'data/sources.csv';
const PATH_STAFF = 'data/staff.csv';
const PATH_AREAS = 'data/areas.csv';
const PATH_BOOKINGS = 'data/bookings.csv';

let staffSourcesData = { headers: [], items: [], sha: null };
let staffAreasCache = [];
let staffEditingId = null;

let myBookingsData = { headers: [], items: [], sha: null };
let bookingsPollTimer = null;
let _audioCtx = null;

const STAFF_STATUS_MAP = {
  'new':'Pending','pending':'Pending',
  'contacted':'Processing','processing':'Processing',
  'completed':'Complete','complete':'Complete',
  'cancelled':'Cancelled','cancel':'Cancelled'
};
function normStatus(s) { return STAFF_STATUS_MAP[String(s||'').toLowerCase()] || 'Pending'; }

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('loginView') && document.getElementById('loginView').style.display !== 'none') {
    initStaffLogin();
  }
  if (document.getElementById('tokenView') && document.getElementById('tokenView').style.display !== 'none') {
    initTokenStep();
  }
  if (document.getElementById('staffDashboard') && document.getElementById('staffDashboard').style.display !== 'none') {
    initStaffDashboard();
  }
});

/* ===== Helpers ===== */
async function sha256(text) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function escAttr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Sanitize error messages so staff never sees the underlying storage backend (GitHub).
function sanitizeError(msg) {
  return String(msg || '')
    .replace(/GitHub token/gi, 'access key')
    .replace(/GitHub PAT/gi, 'access key')
    .replace(/Personal Access Token/gi, 'access key')
    .replace(/personal access token/gi, 'access key')
    .replace(/Contents: Read and write/g, 'write permission')
    .replace(/https?:\/\/github\.com[^\s)"']*/gi, 'admin')
    .replace(/api\.github\.com[^\s)"']*/gi, 'storage server')
    .replace(/raw\.githubusercontent\.com[^\s)"']*/gi, 'storage server')
    .replace(/github/gi, 'storage');
}
function genId(prefix) { return prefix + Date.now() + Math.floor(Math.random() * 100); }
function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function staffLogout() {
  sessionStorage.removeItem(SS_SESSION);
  localStorage.removeItem(SS_EMAIL);
  localStorage.removeItem(SS_NAME);
  // Token is kept in localStorage so re-login is fast unless explicitly cleared
  window.location.href = 'staff.html';
}

function fullStaffLogout() {
  sessionStorage.removeItem(SS_SESSION);
  localStorage.removeItem(SS_EMAIL);
  localStorage.removeItem(SS_NAME);
  localStorage.removeItem(SS_TOKEN);
  window.location.href = 'staff.html';
}

/* ===========================================================================
 * STEP 1 — Email + Password Login
 * =========================================================================== */
function initStaffLogin() {
  const form = document.getElementById('staffLoginForm');
  const errEl = document.getElementById('staffLoginError');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.style.display = 'none';

    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;

    if (!email || !password) {
      errEl.textContent = 'Please enter both email and password.';
      errEl.style.display = 'block';
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Verifying...';

    try {
      const data = await window.CsvAPI.loadAllPublic(PATH_STAFF);
      const staff = (data.items || []).find(s => (s.email || '').toLowerCase() === email);

      if (!staff) throw new Error('Email not found. Contact admin to create your account.');
      if ((staff.status || '').toLowerCase() === 'blocked') {
        throw new Error('Your account is blocked. Please contact admin.');
      }

      const inputHash = await sha256(password);
      if (inputHash !== (staff.password_hash || '')) {
        throw new Error('Wrong password. Please try again.');
      }

      sessionStorage.setItem(SS_SESSION, '1');
      localStorage.setItem(SS_EMAIL, staff.email);
      localStorage.setItem(SS_NAME, staff.name);

      window.location.href = 'staff.html';
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
      submitBtn.disabled = false; submitBtn.textContent = 'Login';
    }
  });
}

/* ===========================================================================
 * STEP 2 — Access Key Entry
 * =========================================================================== */
function initTokenStep() {
  document.getElementById('tokenWelcomeName').textContent = localStorage.getItem(SS_NAME) || 'Staff';
  document.getElementById('logoutFromTokenBtn').addEventListener('click', staffLogout);

  const form = document.getElementById('tokenForm');
  const errEl = document.getElementById('tokenError');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.style.display = 'none';
    const token = form.token.value.trim();
    if (!token) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Verifying...';

    try {
      // Internally validates against the storage backend (GitHub API)
      const verify = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!verify.ok) throw new Error('Invalid access key. Please ask admin for a fresh key.');

      localStorage.setItem(SS_TOKEN, token);
      window.location.href = 'staff.html';
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
      submitBtn.disabled = false; submitBtn.textContent = 'Verify & Continue';
    }
  });
}

/* ===========================================================================
 * STEP 3 — Staff Dashboard (Sources management)
 * =========================================================================== */
function initStaffDashboard() {
  document.getElementById('staffUserName').textContent = localStorage.getItem(SS_NAME) || 'Staff';
  document.getElementById('staffLogoutBtn').addEventListener('click', fullStaffLogout);

  // Sources tab events
  document.getElementById('staffAddSourceBtn').addEventListener('click', () => openStaffSourceModal(null));
  document.getElementById('staffRefreshBtn').addEventListener('click', loadStaffData);
  document.getElementById('staffSrcSearch').addEventListener('input', renderStaffSourcesTable);
  document.getElementById('staffSrcCategoryFilter').addEventListener('change', renderStaffSourcesTable);
  document.getElementById('staffSrcMineFilter').addEventListener('change', renderStaffSourcesTable);
  document.getElementById('staffSourceForm').addEventListener('submit', handleStaffSaveSource);
  document.getElementById('staffSrcCloseBtn').addEventListener('click', closeStaffSourceModal);
  document.getElementById('staffSrcCancelBtn').addEventListener('click', closeStaffSourceModal);
  document.getElementById('staff_src_city').addEventListener('change', updateStaffAreaOptions);

  // Bookings tab events
  document.getElementById('myBookingsRefreshBtn').addEventListener('click', loadMyBookings);
  document.getElementById('myBookingSearch').addEventListener('input', renderMyBookingsTable);
  document.getElementById('myBookingStatusFilter').addEventListener('change', renderMyBookingsTable);

  // Complete modal events
  document.getElementById('completeForm').addEventListener('submit', handleCompleteBooking);
  document.getElementById('completeModalCloseBtn').addEventListener('click', closeCompleteModal);
  document.getElementById('completeCancelBtn').addEventListener('click', closeCompleteModal);

  // Tab switching
  document.querySelectorAll('[data-stab]').forEach(btn => {
    btn.addEventListener('click', () => switchStaffTab(btn.dataset.stab));
  });

  // Notification permission UI
  setupStaffNotifications();

  populateStaffCategoryFilter();
  loadStaffData();
  loadMyBookings();
  startBookingPolling();
}

function switchStaffTab(name) {
  document.querySelectorAll('[data-stab]').forEach(btn => {
    const active = btn.dataset.stab === name;
    btn.classList.toggle('active', active);
    btn.style.background = active ? 'var(--primary)' : '#e1e5eb';
    btn.style.color = active ? 'white' : '#444';
  });
  document.getElementById('stab-bookings').style.display = name === 'bookings' ? 'block' : 'none';
  document.getElementById('stab-sources').style.display = name === 'sources' ? 'block' : 'none';
}

/* ===== Notifications: sound + browser push + vibration ===== */
function setupStaffNotifications() {
  const banner = document.getElementById('notifPermissionBanner');
  const headerBtn = document.getElementById('enableNotifBtn');
  const link = document.getElementById('enableNotifLink');

  function refreshNotifUi() {
    const enabled = localStorage.getItem(SS_NOTIF_ENABLED) === '1';
    const permission = ('Notification' in window) ? Notification.permission : 'denied';
    const allDone = enabled && (permission === 'granted' || !('Notification' in window));
    if (banner) banner.style.display = allDone ? 'none' : 'block';
    if (headerBtn) headerBtn.style.display = allDone ? 'none' : 'inline-block';
  }

  async function requestEnable(ev) {
    if (ev) ev.preventDefault();
    try {
      // Browsers require a user gesture to start AudioContext. Create one
      // here so subsequent beeps work.
      if (!_audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      // Play a short test tone so user hears that audio is working.
      playNotificationTone();
      // Vibrate test (mobile)
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
      // Ask for browser notification permission
      if ('Notification' in window && Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification('Call4All Staff', {
            body: 'Alerts enabled. You will receive sound + notifications for new assigned bookings.',
            icon: 'assets/icons/icon-192.png'
          });
        }
      }
      localStorage.setItem(SS_NOTIF_ENABLED, '1');
    } catch (e) {
      console.warn('[staff] notification setup failed:', e);
    }
    refreshNotifUi();
  }

  if (headerBtn) headerBtn.addEventListener('click', requestEnable);
  if (link) link.addEventListener('click', requestEnable);

  refreshNotifUi();
}

/* Plays a short two-note "ding-ding" tone via Web Audio. Works on mobile
 * after the user has clicked "Enable Alerts" once (gesture requirement). */
function playNotificationTone() {
  try {
    if (!_audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!_audioCtx) return;
    const ctx = _audioCtx;
    const now = ctx.currentTime;

    const blip = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.5, now + start + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    };

    blip(880, 0,    0.18);
    blip(1320, 0.20, 0.18);
    blip(880, 0.42, 0.18);
  } catch (e) { /* ignore */ }
}

function showBookingNotification(count, sample) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const title = count > 1
      ? `📋 ${count} new bookings assigned`
      : `📋 New booking: ${sample.service || 'Service'}`;
    const body = count > 1
      ? `Open the "My Bookings" tab on your dashboard.`
      : `Customer: ${sample.name || '-'}\nPhone: ${sample.phone || '-'}\nCity: ${sample.city || '-'}`;
    try {
      const n = new Notification(title, {
        body,
        icon: 'assets/icons/icon-192.png',
        badge: 'assets/icons/icon-192.png',
        tag: 'c4a-new-booking',
        renotify: true,
        requireInteraction: false
      });
      n.onclick = () => { window.focus(); switchStaffTab('bookings'); n.close(); };
    } catch (e) { /* notification API can throw on some browsers */ }
  }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
  playNotificationTone();
}

function startBookingPolling() {
  // Poll every 30 seconds
  if (bookingsPollTimer) clearInterval(bookingsPollTimer);
  bookingsPollTimer = setInterval(loadMyBookings, 30000);
  // Also re-check when tab becomes visible after backgrounded
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadMyBookings();
  });
}

/* ===== My Bookings ===== */
async function loadMyBookings() {
  const tbody = document.getElementById('myBookingsBody');
  const myEmail = (localStorage.getItem(SS_EMAIL) || '').toLowerCase();
  const token = localStorage.getItem(SS_TOKEN);
  if (!myEmail || !token) return;

  try {
    myBookingsData = await window.CsvAPI.loadAll(token, PATH_BOOKINGS);
    if (!myBookingsData.headers.length) myBookingsData.headers = window.CsvAPI.DEFAULT_HEADERS[PATH_BOOKINGS];

    // Detect newly-assigned bookings since last visit
    detectNewAssignedBookings(myEmail);

    updateMyBookingsStats(myEmail);
    renderMyBookingsTable();
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;color:#dc3545;">❌ ${escHtml(sanitizeError(err.message))}</td></tr>`;
    }
  }
}

function detectNewAssignedBookings(myEmail) {
  const mine = myBookingsData.items.filter(i => (i.assigned_to || '').toLowerCase() === myEmail);
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem(SS_SEEN_BOOKINGS) || '[]'); } catch (e) {}
  const seenSet = new Set(seen);
  const newOnes = mine.filter(i => !seenSet.has(i.id));

  // Update seen list (only keep IDs that still exist + the new ones)
  const allIds = new Set(mine.map(i => i.id));
  const updatedSeen = [...new Set([...seen.filter(id => allIds.has(id)), ...mine.map(i => i.id)])];
  try { localStorage.setItem(SS_SEEN_BOOKINGS, JSON.stringify(updatedSeen)); } catch (e) {}

  // First time loading? Just record what we have without alerting (otherwise
  // the staff would get a beep on every login for old bookings).
  if (seen.length === 0) return;

  if (newOnes.length > 0 && localStorage.getItem(SS_NOTIF_ENABLED) === '1') {
    showBookingNotification(newOnes.length, newOnes[0]);
  }
}

function updateMyBookingsStats(myEmail) {
  const mine = myBookingsData.items.filter(i => (i.assigned_to || '').toLowerCase() === myEmail);
  document.getElementById('myBookingsBadge').textContent = mine.length;
  const counts = { Pending: 0, Processing: 0, Complete: 0, Cancelled: 0 };
  mine.forEach(i => { counts[normStatus(i.status)]++; });
  document.getElementById('myStatPending').textContent = counts.Pending;
  document.getElementById('myStatProcessing').textContent = counts.Processing;
  document.getElementById('myStatComplete').textContent = counts.Complete;
  document.getElementById('myStatCancelled').textContent = counts.Cancelled;
}

function renderMyBookingsTable() {
  const tbody = document.getElementById('myBookingsBody');
  const myEmail = (localStorage.getItem(SS_EMAIL) || '').toLowerCase();
  const search = (document.getElementById('myBookingSearch').value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('myBookingStatusFilter').value;

  // Once a booking is assigned to this staff, it ALWAYS stays in their list
  // (regardless of status). Filter only narrows the visible subset; it does
  // NOT remove the booking from the underlying assignment.
  let items = myBookingsData.items.filter(i => (i.assigned_to || '').toLowerCase() === myEmail);
  items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  if (statusFilter) items = items.filter(i => normStatus(i.status).toLowerCase() === statusFilter.toLowerCase());
  if (search) items = items.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(search)));

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state"><div class="icon">📭</div><div>No bookings match the current filter. Try changing the filter or wait for the admin to assign one.</div></div></td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => {
    const cityArea = [item.city, item.area].filter(Boolean).join(' / ');
    const phoneClean = (item.phone || '').replace(/[^0-9]/g, '');
    const status = normStatus(item.status);
    const statusKey = status.toLowerCase();
    const isCompleted = status === 'Complete';
    const isCancelled = status === 'Cancelled';

    // Staff cannot change status arbitrarily — only mark Complete (with notes).
    // Already-Complete or Cancelled rows are read-only.
    const actionCell = isCompleted
      ? `<div style="font-size:12px;">
           <span style="color:#0a6b2c;font-weight:600;">✅ Done</span>
           ${item.completion_notes ? `<br><span style="color:#666;font-size:11px;cursor:pointer;text-decoration:underline;"
              onclick="showStaffCompletionNote('${escAttr(item.id)}')">📝 View notes</span>` : ''}
         </div>`
      : isCancelled
        ? `<span style="color:#93181f;font-weight:600;font-size:12px;">❌ Cancelled by admin</span>`
        : `<button class="btn btn-success btn-sm"
                  onclick="openCompleteModal('${escAttr(item.id)}')">
             ✅ Mark Complete
           </button>`;

    const completedLabel = isCompleted && item.completed_at
      ? `<div style="font-size:11px;color:#666;margin-top:3px;">${escHtml(fmtDate(item.completed_at))}</div>`
      : '';

    return `
      <tr>
        <td><strong>${escHtml(item.id)}</strong></td>
        <td style="font-size:12px;">${escHtml(fmtDate(item.timestamp))}</td>
        <td>${escHtml(item.name)}</td>
        <td><a href="tel:${escAttr(item.phone)}">${escHtml(item.phone)}</a><br>
            <a href="https://wa.me/${phoneClean}" target="_blank" style="font-size:12px;">💬 WhatsApp</a></td>
        <td>${escHtml(item.service)}</td>
        <td>${escHtml(cityArea || '-')}</td>
        <td class="msg-cell">${escHtml(item.address || '-')}</td>
        <td class="msg-cell">${escHtml(item.message)}</td>
        <td>
          <span class="status-badge status-${statusKey}">${escHtml(status)}</span>
          ${completedLabel}
        </td>
        <td>${actionCell}</td>
      </tr>
    `;
  }).join('');
}

/* Show a stored completion note in a simple alert */
function showStaffCompletionNote(id) {
  const item = myBookingsData.items.find(i => i.id === id);
  if (!item) return;
  alert(
    'Completion Notes:\n\n' + (item.completion_notes || '(empty)') +
    '\n\nCompleted at: ' + (fmtDate(item.completed_at) || '-')
  );
}

/* ===== Complete Modal ===== */
function openCompleteModal(id) {
  const item = myBookingsData.items.find(i => i.id === id);
  if (!item) { alert('Booking not found.'); return; }
  const form = document.getElementById('completeForm');
  form.booking_id.value = id;
  form.notes.value = item.completion_notes || '';
  document.getElementById('completeCustomerName').textContent = item.name || '-';
  document.getElementById('completeService').textContent = item.service || '-';
  document.getElementById('completeCity').textContent =
    [item.city, item.area].filter(Boolean).join(' / ') || '-';
  document.getElementById('completeModal').classList.add('show');
  setTimeout(() => form.notes.focus(), 100);
}

function closeCompleteModal() {
  document.getElementById('completeModal').classList.remove('show');
}

async function handleCompleteBooking(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const id = form.booking_id.value;
  const notes = form.notes.value.trim();

  if (!notes) {
    alert('Please describe how the booking was completed.');
    return;
  }

  const idx = myBookingsData.items.findIndex(i => i.id === id);
  if (idx < 0) { alert('Booking not found.'); return; }
  const item = myBookingsData.items[idx];
  const original = {
    status: item.status,
    completion_notes: item.completion_notes,
    completed_at: item.completed_at
  };

  submitBtn.disabled = true; submitBtn.textContent = 'Saving...';

  item.status = 'Complete';
  item.completion_notes = notes;
  item.completed_at = new Date().toISOString();

  const token = localStorage.getItem(SS_TOKEN);
  try {
    await window.CsvAPI.saveAll(window.CsvAPI.DEFAULT_HEADERS[PATH_BOOKINGS],
      myBookingsData.items, myBookingsData.sha, token,
      `Staff completed booking ${id}`, PATH_BOOKINGS);
    closeCompleteModal();
    await loadMyBookings();
  } catch (err) {
    alert('Save failed: ' + sanitizeError(err.message));
    Object.assign(item, original);
    submitBtn.disabled = false; submitBtn.textContent = '✅ Confirm Complete';
  }
}

function populateStaffCategoryFilter() {
  const sel = document.getElementById('staffSrcCategoryFilter');
  sel.innerHTML = '<option value="">All Categories</option>' +
    window.SITE_CONFIG.services.map(s =>
      `<option value="${escAttr(s.name)}">${s.icon} ${escHtml(s.name)}</option>`
    ).join('');
}

async function loadStaffData() {
  const tbody = document.getElementById('staffSourcesBody');
  tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:30px;">Loading...</td></tr>';

  try {
    const token = localStorage.getItem(SS_TOKEN);

    // Load sources (with token, since we may need write access)
    staffSourcesData = await window.CsvAPI.loadAll(token, PATH_SOURCES);

    // Load areas (public, since they're for filtering only)
    const areas = await window.CsvAPI.loadAllPublic(PATH_AREAS);
    staffAreasCache = (areas.items || []).filter(a => (a.status || '').toLowerCase() === 'active');

    // Re-verify staff is still active (in case admin blocked them mid-session)
    const staffCheck = await window.CsvAPI.loadAllPublic(PATH_STAFF);
    const me = (staffCheck.items || []).find(s => (s.email || '').toLowerCase() === (localStorage.getItem(SS_EMAIL) || '').toLowerCase());
    if (!me) {
      alert('Your staff account has been removed. Logging out.');
      fullStaffLogout(); return;
    }
    if ((me.status || '').toLowerCase() === 'blocked') {
      alert('Your account has been blocked by admin. Logging out.');
      fullStaffLogout(); return;
    }

    updateStaffStats();
    renderStaffSourcesTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:30px;color:#dc3545;">❌ ${escHtml(sanitizeError(err.message))}</td></tr>`;
  }
}

function updateStaffStats() {
  const myEmail = (localStorage.getItem(SS_EMAIL) || '').toLowerCase();
  const all = staffSourcesData.items;
  const mine = all.filter(i => (i.added_by || '').toLowerCase() === myEmail);
  const myAvailable = mine.filter(i => (i.availability || '').toLowerCase() === 'available').length;
  const totalAvailable = all.filter(i => (i.availability || '').toLowerCase() === 'available').length;

  document.getElementById('staffStats').innerHTML = `
    <div class="stat-card"><div class="label">My Entries</div><div class="value">${mine.length}</div></div>
    <div class="stat-card ok"><div class="label">My Available</div><div class="value">${myAvailable}</div></div>
    <div class="stat-card warn"><div class="label">All Sources</div><div class="value">${all.length}</div></div>
    <div class="stat-card"><div class="label">All Available</div><div class="value">${totalAvailable}</div></div>
  `;
}

function renderStaffSourcesTable() {
  const tbody = document.getElementById('staffSourcesBody');
  const search = (document.getElementById('staffSrcSearch').value || '').toLowerCase().trim();
  const cat = document.getElementById('staffSrcCategoryFilter').value;
  const mineOnly = document.getElementById('staffSrcMineFilter').value === 'mine';
  const myEmail = (localStorage.getItem(SS_EMAIL) || '').toLowerCase();

  let items = [...staffSourcesData.items];
  items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  if (mineOnly) items = items.filter(i => (i.added_by || '').toLowerCase() === myEmail);
  if (cat) items = items.filter(i => i.category === cat);
  if (search) items = items.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(search)));

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11"><div class="empty-state"><div class="icon">📭</div><div>No sources found. Click ➕ Add Source to start.</div></div></td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => {
    const phoneClean = (item.contact_phone || '').replace(/[^0-9]/g, '');
    const isMine = (item.added_by || '').toLowerCase() === myEmail;
    const availClass = (item.availability || 'available').toLowerCase().replace('-', '');
    return `
      <tr>
        <td><strong>${escHtml(item.id)}</strong></td>
        <td>${escHtml(item.category)}</td>
        <td><strong>${escHtml(item.name)}</strong></td>
        <td>${escHtml(item.city || '-')}<br><span style="font-size:12px;color:#666;">${escHtml(item.area || '-')}</span></td>
        <td class="msg-cell">${escHtml(item.address || '-')}</td>
        <td>
          ${escHtml(item.contact_person || '-')}<br>
          <a href="tel:${escAttr(item.contact_phone)}" style="font-size:12px;">${escHtml(item.contact_phone)}</a>
          ${phoneClean ? ` <a href="https://wa.me/${phoneClean}" target="_blank" style="font-size:12px;">💬</a>` : ''}
        </td>
        <td>${escHtml(item.price || '-')}</td>
        <td><span class="status-badge status-${availClass === 'available' ? 'completed' : (availClass === 'booked' ? 'new' : 'cancelled')}">${escHtml(item.availability || 'Available')}</span></td>
        <td class="msg-cell" style="font-size:12px;">${escHtml(item.notes || '-')}</td>
        <td style="font-size:12px;">${escHtml(item.added_by || 'admin')}${isMine ? ' <span style="color:var(--success);font-weight:600;">(you)</span>' : ''}</td>
        <td>
          ${isMine ? `
            <div class="actions">
              <button class="btn btn-primary btn-sm" onclick="openStaffSourceModal('${escAttr(item.id)}')">✏️</button>
              <button class="btn btn-danger btn-sm" onclick="deleteStaffSource('${escAttr(item.id)}')">🗑️</button>
            </div>
          ` : `<span style="color:#999;font-size:12px;">— Admin only —</span>`}
        </td>
      </tr>
    `;
  }).join('');
}

function openStaffSourceModal(id) {
  const myEmail = (localStorage.getItem(SS_EMAIL) || '').toLowerCase();
  staffEditingId = id;
  const modal = document.getElementById('staffSourceModal');
  const form = document.getElementById('staffSourceForm');
  const title = document.getElementById('staffSourceTitle');

  // Categories
  document.getElementById('staff_src_category').innerHTML = window.SITE_CONFIG.services.map(s =>
    `<option value="${escAttr(s.name)}">${s.icon} ${escHtml(s.name)}</option>`
  ).join('');

  // Cities (from active areas only)
  const cities = [...new Set(staffAreasCache.map(a => a.city).filter(Boolean))].sort();
  const citySel = document.getElementById('staff_src_city');
  citySel.innerHTML = '<option value="">-- Select city --</option>' +
    cities.map(c => `<option value="${escAttr(c)}">${escHtml(c)}</option>`).join('');

  if (id) {
    const item = staffSourcesData.items.find(i => i.id === id);
    if (!item) { alert('Source not found.'); return; }
    if ((item.added_by || '').toLowerCase() !== myEmail) {
      alert('You can only edit your own entries.');
      return;
    }
    title.textContent = 'Edit Source - ' + id;
    form.id_field.value = item.id;
    form.timestamp_field.value = item.timestamp;
    form.added_by.value = item.added_by;
    form.category.value = item.category || '';
    form.name.value = item.name || '';
    form.city.value = item.city || '';
    updateStaffAreaOptions();
    if (item.area) {
      // Add the existing area as option even if currently inactive
      const exists = Array.from(form.area.options).some(o => o.value === item.area);
      if (!exists) {
        const opt = document.createElement('option');
        opt.value = item.area; opt.textContent = item.area + ' (current)';
        form.area.appendChild(opt);
      }
      form.area.value = item.area;
    }
    form.address.value = item.address || '';
    form.contact_person.value = item.contact_person || '';
    form.contact_phone.value = item.contact_phone || '';
    form.price.value = item.price || '';
    form.availability.value = item.availability || 'Available';
    form.notes.value = item.notes || '';
  } else {
    title.textContent = 'Add New Source';
    form.reset();
    form.id_field.value = genId('SRC');
    form.timestamp_field.value = new Date().toISOString();
    form.added_by.value = myEmail;
    form.availability.value = 'Available';
  }
  modal.classList.add('show');
}

function updateStaffAreaOptions() {
  const city = document.getElementById('staff_src_city').value;
  const areaSel = document.getElementById('staff_src_area');
  if (!city) {
    areaSel.innerHTML = '<option value="">Select city first</option>';
    return;
  }
  const areaList = [...new Set(
    staffAreasCache.filter(a => a.city === city).map(a => a.area).filter(Boolean)
  )].sort();
  areaSel.innerHTML = '<option value="">-- Select area --</option>' +
    areaList.map(a => `<option value="${escAttr(a)}">${escHtml(a)}</option>`).join('');
}

function closeStaffSourceModal() {
  document.getElementById('staffSourceModal').classList.remove('show');
  staffEditingId = null;
}

async function handleStaffSaveSource(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true; submitBtn.textContent = 'Saving...';

  const myEmail = (localStorage.getItem(SS_EMAIL) || '').toLowerCase();
  const token = localStorage.getItem(SS_TOKEN);

  const row = {
    id: form.id_field.value,
    timestamp: form.timestamp_field.value,
    category: form.category.value.trim(),
    name: form.name.value.trim(),
    city: form.city.value.trim(),
    area: form.area.value.trim(),
    address: form.address.value.trim(),
    contact_person: form.contact_person.value.trim(),
    contact_phone: form.contact_phone.value.trim(),
    price: form.price.value.trim(),
    availability: form.availability.value,
    notes: form.notes.value.trim(),
    added_by: myEmail
  };

  try {
    let items = [...staffSourcesData.items];
    if (staffEditingId) {
      const idx = items.findIndex(i => i.id === staffEditingId);
      if (idx >= 0) {
        if ((items[idx].added_by || '').toLowerCase() !== myEmail) {
          throw new Error('You can only edit your own entries.');
        }
        items[idx] = row;
      } else {
        items.push(row);
      }
    } else {
      items.push(row);
    }

    const headers = window.CsvAPI.DEFAULT_HEADERS[PATH_SOURCES];
    await window.CsvAPI.saveAll(headers, items, staffSourcesData.sha, token,
      staffEditingId ? `Update source ${row.id} by ${myEmail}` : `Add source ${row.id} by ${myEmail}`,
      PATH_SOURCES);
    closeStaffSourceModal();
    await loadStaffData();
  } catch (err) {
    alert('Save failed: ' + sanitizeError(err.message));
    submitBtn.disabled = false; submitBtn.textContent = '💾 Save';
  }
}

async function deleteStaffSource(id) {
  const myEmail = (localStorage.getItem(SS_EMAIL) || '').toLowerCase();
  const item = staffSourcesData.items.find(i => i.id === id);
  if (!item) return;
  if ((item.added_by || '').toLowerCase() !== myEmail) {
    alert('You can only delete your own entries.');
    return;
  }
  if (!confirm(`Delete source ${id}?`)) return;
  const token = localStorage.getItem(SS_TOKEN);
  try {
    const items = staffSourcesData.items.filter(i => i.id !== id);
    const headers = window.CsvAPI.DEFAULT_HEADERS[PATH_SOURCES];
    await window.CsvAPI.saveAll(headers, items, staffSourcesData.sha, token,
      `Delete source ${id} by ${myEmail}`, PATH_SOURCES);
    await loadStaffData();
  } catch (err) {
    alert('Delete failed: ' + sanitizeError(err.message));
  }
}
