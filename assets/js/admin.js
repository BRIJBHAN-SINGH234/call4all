/* ===== Call4All - Admin Panel Logic =====
 * Manages bookings, sources, staff and service areas.
 * All data persisted to GitHub via the GitHub Contents API.
 */

const STORAGE_TOKEN = 'c4a_admin_token';
const STORAGE_USER = 'c4a_admin_user';
const STORAGE_PASS_HASH = 'c4a_admin_pass_hash';
const STORAGE_PUBLIC = 'c4a_public_token';

const PATH_BOOKINGS = 'data/bookings.csv';
const PATH_SOURCES = 'data/sources.csv';
const PATH_STAFF = 'data/staff.csv';
const PATH_AREAS = 'data/areas.csv';
const PATH_GALLERY = 'data/gallery.csv';
const PATH_SITE_CONFIG = 'data/site-config.json';

let bookingsData = { headers: [], items: [], sha: null };
let sourcesData = { headers: [], items: [], sha: null };
let staffData = { headers: [], items: [], sha: null };
let areasData = { headers: [], items: [], sha: null };
let galleryData = { headers: [], items: [], sha: null };
let siteConfigData = { json: null, sha: null };

let editingBookingId = null;
let editingSourceId = null;
let editingStaffId = null;
let editingAreaId = null;
let editingGalleryId = null;
let pendingLogoUpload = null;
let pendingGalleryUpload = null;

document.addEventListener('DOMContentLoaded', () => {
  const loginView = document.getElementById('loginView');
  const adminPanel = document.getElementById('adminPanel');
  const isLoginVisible = loginView && loginView.style.display !== 'none';
  const isAdminVisible = adminPanel && adminPanel.style.display !== 'none';

  if (isLoginVisible && document.getElementById('loginForm')) initLogin();
  if (isAdminVisible) initAdmin();
});

/* ===== Helpers ===== */
async function sha256(text) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function getToken() { return localStorage.getItem(STORAGE_TOKEN); }
function logout() {
  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.removeItem(STORAGE_USER);
  sessionStorage.removeItem('c4a_admin_session');
  window.location.href = 'admin.html';
}
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
function showMsg(elId, text, type) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = 'form-message ' + (type || 'info');
  el.textContent = text;
}
function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
function genId(prefix) {
  return prefix + Date.now() + Math.floor(Math.random() * 100);
}
function defaultHeaders(path) { return window.CsvAPI.DEFAULT_HEADERS[path]; }

/* ===== internal_notes (timeline) helpers ===== */
function parseNotesLog(jsonStr) {
  if (!jsonStr) return [];
  try {
    const arr = JSON.parse(jsonStr);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function serializeNotesLog(arr) {
  return JSON.stringify(Array.isArray(arr) ? arr : []);
}
function appendBookingLog(booking, by, role, kind, text) {
  const log = parseNotesLog(booking.internal_notes);
  log.push({
    at: new Date().toISOString(),
    by: String(by || 'admin'),
    role: String(role || 'admin'),
    kind: String(kind || 'note'),
    text: String(text || '')
  });
  booking.internal_notes = serializeNotesLog(log);
  return booking;
}
function currentAdminUser() {
  return localStorage.getItem(STORAGE_USER) || 'admin';
}

/* ===== Stale-booking helpers (also used by dashboard) ===== */
const STALE_PENDING_HOURS = 2;
const STALE_PROCESSING_HOURS = 24;
function isStaleBooking(item) {
  const status = normalizeStatus(item.status);
  if (status !== 'Pending' && status !== 'Processing') return false;
  const refIso = (status === 'Pending') ? item.timestamp : (item.assigned_at || item.timestamp);
  if (!refIso) return false;
  const refMs = Date.parse(refIso);
  if (isNaN(refMs)) return false;
  const hours = (Date.now() - refMs) / 3600000;
  const limit = (status === 'Pending') ? STALE_PENDING_HOURS : STALE_PROCESSING_HOURS;
  return hours >= limit;
}
function staleSeverity(item) {
  const status = normalizeStatus(item.status);
  if (status === 'Pending' && isStaleBooking(item)) return 'red';
  if (status === 'Processing' && isStaleBooking(item)) return 'yellow';
  return '';
}

/* ===========================================================================
 * ADMIN REAL-TIME POLLING + NEW-BOOKING NOTIFICATION
 * =========================================================================== */
const STORAGE_ADMIN_SEEN = 'c4a_admin_seen_bookings';
const STORAGE_ADMIN_NOTIF = 'c4a_admin_notif_enabled';
const ADMIN_POLL_MS = 30000;
let _adminAudioCtx = null;
let _adminPollTimer = null;
let _adminLastSeenInit = false;

function startAdminPolling() {
  if (_adminPollTimer) clearInterval(_adminPollTimer);
  _adminPollTimer = setInterval(() => {
    // Only refresh if user is on dashboard or bookings tab to save API calls
    const activeTab = document.querySelector('.admin-tab.active');
    if (!activeTab) return;
    const t = activeTab.dataset.tab;
    if (t === 'dashboard' || t === 'bookings') loadBookings();
  }, ADMIN_POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadBookings();
  });
}

function playAdminTone() {
  try {
    if (!_adminAudioCtx && (window.AudioContext || window.webkitAudioContext)) {
      _adminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!_adminAudioCtx) return;
    const ctx = _adminAudioCtx;
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
    blip(660, 0, 0.20);
    blip(990, 0.22, 0.20);
  } catch (e) { /* ignore */ }
}

function showAdminBookingNotification(count, sample) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const title = count > 1
      ? `📋 ${count} new bookings`
      : `📋 New booking: ${sample.service || 'Service'}`;
    const body = count > 1
      ? `Open the admin panel to see and assign.`
      : `Customer: ${sample.name || '-'}\nPhone: ${sample.phone || '-'}\nCity: ${sample.city || '-'}`;
    try {
      const n = new Notification(title, {
        body,
        icon: 'assets/icons/icon-192.png',
        badge: 'assets/icons/icon-192.png',
        tag: 'c4a-admin-new-booking',
        renotify: true
      });
      n.onclick = () => {
        window.focus();
        document.querySelector('[data-tab=bookings]').click();
        n.close();
      };
    } catch (e) { /* ignore */ }
  }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  playAdminTone();
}

function checkForNewAdminBookings() {
  const items = bookingsData.items || [];
  const allIds = items.map(i => i.id);
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem(STORAGE_ADMIN_SEEN) || '[]'); } catch (e) {}
  const seenSet = new Set(seen);
  const newOnes = items.filter(i => !seenSet.has(i.id));
  const updatedSeen = [...new Set([...seen.filter(id => allIds.includes(id)), ...allIds])];
  try { localStorage.setItem(STORAGE_ADMIN_SEEN, JSON.stringify(updatedSeen)); } catch (e) {}
  // First load — just record, don't alert
  if (!_adminLastSeenInit) { _adminLastSeenInit = true; return; }
  if (newOnes.length > 0 && localStorage.getItem(STORAGE_ADMIN_NOTIF) === '1') {
    showAdminBookingNotification(newOnes.length, newOnes[0]);
  }
}

async function enableAdminNotifications(ev) {
  if (ev) ev.preventDefault();
  try {
    if (!_adminAudioCtx && (window.AudioContext || window.webkitAudioContext)) {
      _adminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    playAdminTone();
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    if ('Notification' in window && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification('Call4All Admin', {
          body: 'Alerts enabled. You will get a sound + notification for every new booking.',
          icon: 'assets/icons/icon-192.png'
        });
      }
    }
    localStorage.setItem(STORAGE_ADMIN_NOTIF, '1');
  } catch (e) { console.warn('[admin] notif enable failed:', e); }
  refreshAdminNotifUi();
}

function refreshAdminNotifUi() {
  const enabled = localStorage.getItem(STORAGE_ADMIN_NOTIF) === '1';
  const permission = ('Notification' in window) ? Notification.permission : 'denied';
  const ok = enabled && (permission === 'granted' || !('Notification' in window));
  const btn = document.getElementById('enableAdminNotifBtn');
  if (btn) btn.style.display = ok ? 'none' : 'inline-block';
}

/* ===========================================================================
 * DASHBOARD / OVERVIEW
 * =========================================================================== */
function renderDashboard() {
  const items = bookingsData.items || [];
  const now = Date.now();
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const dayMs = 86400000;
  const startOfWeek = startOfDay.getTime() - 6 * dayMs;
  const startOfMonth = startOfDay.getTime() - 29 * dayMs;

  let today = 0, week = 0, month = 0, total = items.length;
  const statusCount = { Pending: 0, Processing: 0, Complete: 0, Cancelled: 0 };
  const byService = {};
  const byArea = {};
  const byStaffComplete = {};
  let staleCount = 0;
  const unassigned = [];

  for (const it of items) {
    const t = Date.parse(it.timestamp || 0);
    if (!isNaN(t)) {
      if (t >= startOfDay.getTime()) today++;
      if (t >= startOfWeek) week++;
      if (t >= startOfMonth) month++;
    }
    const s = normalizeStatus(it.status);
    statusCount[s] = (statusCount[s] || 0) + 1;
    if (it.service) byService[it.service] = (byService[it.service] || 0) + 1;
    if (it.city || it.area) {
      const key = [it.city, it.area].filter(Boolean).join(' / ');
      byArea[key] = (byArea[key] || 0) + 1;
    }
    if (s === 'Complete' && it.assigned_to) {
      byStaffComplete[it.assigned_to] = (byStaffComplete[it.assigned_to] || 0) + 1;
    }
    if (isStaleBooking(it)) staleCount++;
    if (!it.assigned_to && s !== 'Complete' && s !== 'Cancelled') unassigned.push(it);
  }

  setText('dashToday', today);
  setText('dashWeek', week);
  setText('dashMonth', month);
  setText('dashTotal', total);
  setText('dashPending', statusCount.Pending);
  setText('dashProcessing', statusCount.Processing);
  setText('dashComplete', statusCount.Complete);
  setText('dashStale', staleCount);

  renderBarList('dashByService', byService, 6);
  renderBarList('dashByArea', byArea, 6);

  // Top staff — resolve email → name
  const staffMap = {};
  (staffData.items || []).forEach(s => { if (s.email) staffMap[s.email] = s.name || s.email; });
  const namedStaff = {};
  Object.entries(byStaffComplete).forEach(([email, n]) => {
    namedStaff[staffMap[email] || email] = n;
  });
  renderBarList('dashTopStaff', namedStaff, 6);

  // Unassigned
  const ua = document.getElementById('dashUnassigned');
  if (ua) {
    if (!unassigned.length) {
      ua.innerHTML = '<p class="dash-empty">🎉 All bookings are assigned.</p>';
    } else {
      const top = unassigned
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
        .slice(0, 6);
      ua.innerHTML = top.map(b => `
        <div class="dash-bar-row" style="cursor:pointer;" onclick="openBookingDetail('${escapeAttr(b.id)}')">
          <div class="name" style="min-width:auto;flex:1;">
            <strong>${escapeHtml(b.name || '-')}</strong>
            <span style="color:#888;font-size:12px;">· ${escapeHtml(b.service || '')}</span>
          </div>
          <span class="count" style="min-width:auto;">${escapeHtml(formatDate(b.timestamp))}</span>
        </div>
      `).join('');
    }
  }

  // Recent activity
  const recent = document.getElementById('dashRecent');
  if (recent) {
    const sorted = [...items].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).slice(0, 12);
    if (!sorted.length) {
      recent.innerHTML = '<p class="dash-empty">No bookings yet.</p>';
    } else {
      recent.innerHTML = sorted.map(b => {
        const s = normalizeStatus(b.status);
        const cityArea = [b.city, b.area].filter(Boolean).join(' / ');
        return `
          <div class="row">
            <div class="when">${escapeHtml(formatDate(b.timestamp))}</div>
            <div class="what">
              <strong>${escapeHtml(b.name || '-')}</strong>
              · <span style="color:#666;">${escapeHtml(b.service || '')}</span>
              ${cityArea ? `· <span style="color:#888;">${escapeHtml(cityArea)}</span>` : ''}
              <span class="status-badge status-${s.toLowerCase()}" style="margin-left:6px;">${escapeHtml(s)}</span>
              <a href="#" onclick="openBookingDetail('${escapeAttr(b.id)}');return false;" style="margin-left:8px;font-size:11px;">View</a>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ===========================================================================
 * BULK ACTIONS
 * =========================================================================== */
function getBulkSelection() {
  const set = new Set();
  document.querySelectorAll('.bulk-row-check:checked').forEach(cb => set.add(cb.dataset.id));
  return set;
}

function refreshBulkBar() {
  const bar = document.getElementById('bulkBar');
  const cnt = document.getElementById('bulkCount');
  if (!bar || !cnt) return;
  const sel = getBulkSelection();
  cnt.textContent = sel.size;
  bar.classList.toggle('show', sel.size > 0);
  // Sync header checkbox state
  const all = document.querySelectorAll('.bulk-row-check');
  const head = document.getElementById('bulkSelectAll');
  if (head) {
    if (all.length === 0) head.checked = false;
    else if (sel.size === all.length) head.checked = true;
    else head.checked = false;
  }
}

function toggleBulkSelectAll(e) {
  const checked = e.target.checked;
  document.querySelectorAll('.bulk-row-check').forEach(cb => { cb.checked = checked; });
  refreshBulkBar();
}

function clearBulkSelection() {
  document.querySelectorAll('.bulk-row-check').forEach(cb => { cb.checked = false; });
  const head = document.getElementById('bulkSelectAll');
  if (head) head.checked = false;
  refreshBulkBar();
}

function populateBulkAssignDropdown(activeStaff) {
  const sel = document.getElementById('bulkAssign');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML =
    '<option value="">— Bulk assign...</option>' +
    '<option value="__unassign__">⬜ Unassign</option>' +
    activeStaff.map(s => `<option value="${escapeAttr(s.email)}">${escapeHtml(s.name || s.email)}</option>`).join('');
  if (current) sel.value = current;
}

async function handleBulkAssign(value) {
  if (!value) return;
  const ids = [...getBulkSelection()];
  if (!ids.length) { document.getElementById('bulkAssign').value = ''; return; }
  const isUnassign = value === '__unassign__';
  const targetEmail = isUnassign ? '' : value;
  const label = isUnassign ? 'Unassign' : `assign to ${value}`;
  if (!confirm(`${ids.length} bookings ko ${label}? Yeh sab ek hi commit mein update honge.`)) {
    document.getElementById('bulkAssign').value = ''; return;
  }
  const nowIso = new Date().toISOString();
  const idSet = new Set(ids);
  bookingsData.items.forEach(b => {
    if (!idSet.has(b.id)) return;
    b.assigned_to = targetEmail;
    b.assigned_at = targetEmail ? nowIso : '';
    appendBookingLog(b, currentAdminUser(), 'admin', 'assigned',
      isUnassign ? 'Unassigned (bulk)' : `Assigned to ${targetEmail} (bulk)`);
    if (targetEmail && normalizeStatus(b.status) === 'Pending') {
      b.status = 'Processing';
      appendBookingLog(b, currentAdminUser(), 'admin', 'status', 'Auto: → Processing on bulk assign');
    }
  });
  try {
    await window.CsvAPI.saveAll(defaultHeaders(PATH_BOOKINGS), bookingsData.items, bookingsData.sha, getToken(),
      `Bulk ${label} (${ids.length} bookings)`, PATH_BOOKINGS);
    clearBulkSelection();
    document.getElementById('bulkAssign').value = '';
    await loadBookings();
  } catch (err) {
    alert('Bulk assign failed: ' + err.message);
    document.getElementById('bulkAssign').value = '';
    await loadBookings();
  }
}

async function handleBulkStatus(newStatus) {
  if (!newStatus) return;
  const ids = [...getBulkSelection()];
  if (!ids.length) { document.getElementById('bulkStatus').value = ''; return; }
  const normalized = normalizeStatus(newStatus);
  let note = '';
  if (normalized === 'Complete') {
    note = prompt(`${ids.length} bookings ko Complete mark karne ke liye ek common note daalein:`, '') || '';
    if (!note.trim()) {
      alert('Please enter a completion note.');
      document.getElementById('bulkStatus').value = '';
      return;
    }
  } else {
    if (!confirm(`${ids.length} bookings ka status ${normalized} kar du?`)) {
      document.getElementById('bulkStatus').value = ''; return;
    }
  }
  const idSet = new Set(ids);
  bookingsData.items.forEach(b => {
    if (!idSet.has(b.id)) return;
    b.status = normalized;
    if (normalized === 'Complete') {
      b.completion_notes = note;
      b.completed_at = new Date().toISOString();
    } else {
      b.completion_notes = '';
      b.completed_at = '';
    }
    appendBookingLog(b, currentAdminUser(), 'admin', 'status', `Status → ${normalized} (bulk)` + (note ? ` — ${note}` : ''));
  });
  try {
    await window.CsvAPI.saveAll(defaultHeaders(PATH_BOOKINGS), bookingsData.items, bookingsData.sha, getToken(),
      `Bulk status → ${normalized} (${ids.length} bookings)`, PATH_BOOKINGS);
    clearBulkSelection();
    document.getElementById('bulkStatus').value = '';
    await loadBookings();
  } catch (err) {
    alert('Bulk status failed: ' + err.message);
    document.getElementById('bulkStatus').value = '';
    await loadBookings();
  }
}

async function handleBulkDelete() {
  const ids = [...getBulkSelection()];
  if (!ids.length) return;
  if (!confirm(`⚠️ ${ids.length} bookings ko PERMANENTLY delete karna hai? Yeh undo nahi ho sakta.`)) return;
  const idSet = new Set(ids);
  const remaining = bookingsData.items.filter(b => !idSet.has(b.id));
  try {
    await window.CsvAPI.saveAll(defaultHeaders(PATH_BOOKINGS), remaining, bookingsData.sha, getToken(),
      `Bulk delete ${ids.length} bookings`, PATH_BOOKINGS);
    clearBulkSelection();
    await loadBookings();
  } catch (err) {
    alert('Bulk delete failed: ' + err.message);
  }
}

function handleBulkExport() {
  const ids = [...getBulkSelection()];
  if (!ids.length) return;
  const idSet = new Set(ids);
  const items = bookingsData.items.filter(b => idSet.has(b.id));
  const csv = window.CsvAPI.objectsToCsv(defaultHeaders(PATH_BOOKINGS), items);
  downloadCsv(csv, 'call4all-bookings-selected');
}

/* ===========================================================================
 * CUSTOMER HISTORY (click phone -> show all past bookings for that phone)
 * =========================================================================== */
function openCustomerHistory(phone) {
  const modal = document.getElementById('customerHistoryModal');
  if (!modal) return;
  const cleaned = (phone || '').replace(/[^0-9]/g, '');
  const all = (bookingsData.items || []).filter(b => (b.phone || '').replace(/[^0-9]/g, '') === cleaned);
  all.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  document.getElementById('customerHistoryTitle').textContent =
    `Customer History — ${phone} (${all.length} booking${all.length === 1 ? '' : 's'})`;

  const body = document.getElementById('customerHistoryBody');
  if (!all.length) {
    body.innerHTML = '<p class="dash-empty">No bookings found for this phone.</p>';
  } else {
    const totalsByStatus = { Pending: 0, Processing: 0, Complete: 0, Cancelled: 0 };
    all.forEach(b => { totalsByStatus[normalizeStatus(b.status)]++; });
    const meta = `
      <div class="admin-stats" style="margin-bottom:14px;">
        <div class="stat-card"><div class="label">Total</div><div class="value">${all.length}</div></div>
        <div class="stat-card ok"><div class="label">Complete</div><div class="value">${totalsByStatus.Complete}</div></div>
        <div class="stat-card warn"><div class="label">Active</div><div class="value">${totalsByStatus.Pending + totalsByStatus.Processing}</div></div>
        <div class="stat-card danger"><div class="label">Cancelled</div><div class="value">${totalsByStatus.Cancelled}</div></div>
      </div>
    `;
    const rows = all.map(b => {
      const s = normalizeStatus(b.status);
      const cityArea = [b.city, b.area].filter(Boolean).join(' / ');
      return `
        <tr>
          <td><strong>${escapeHtml(b.id)}</strong><br>
            <a href="#" onclick="closeCustomerHistory();openBookingDetail('${escapeAttr(b.id)}');return false;" style="font-size:11px;">View</a>
          </td>
          <td>${formatDate(b.timestamp)}</td>
          <td>${escapeHtml(b.service || '-')}</td>
          <td>${escapeHtml(cityArea || '-')}</td>
          <td class="msg-cell">${escapeHtml(b.message || '-')}</td>
          <td><span class="status-badge status-${s.toLowerCase()}">${s}</span></td>
        </tr>
      `;
    }).join('');
    body.innerHTML = meta + `
      <div style="overflow-x:auto;">
        <table class="admin-table">
          <thead><tr><th>Ref</th><th>Date</th><th>Service</th><th>City / Area</th><th>Message</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }
  modal.classList.add('show');
}
function closeCustomerHistory() {
  const m = document.getElementById('customerHistoryModal');
  if (m) m.classList.remove('show');
}

/* ===========================================================================
 * BOOKING DETAIL + ACTIVITY TIMELINE + INTERNAL NOTES
 * =========================================================================== */
let _detailBookingId = null;

function openBookingDetail(id) {
  const item = (bookingsData.items || []).find(b => b.id === id);
  if (!item) { alert('Booking not found.'); return; }
  _detailBookingId = id;

  document.getElementById('bookingDetailTitle').textContent = `Booking ${id} — Activity & Notes`;

  const status = normalizeStatus(item.status);
  const cityArea = [item.city, item.area].filter(Boolean).join(' / ');
  const meta = `
    <div style="background:#f8f9fb;padding:12px 14px;border-radius:8px;margin-bottom:14px;font-size:13px;line-height:1.6;">
      <strong>${escapeHtml(item.name)}</strong> · ${escapeHtml(item.phone || '-')}
      <br>${escapeHtml(item.service || '-')} · ${escapeHtml(cityArea || '-')}
      <br><span class="status-badge status-${status.toLowerCase()}">${status}</span>
      ${item.assigned_to ? ` · Assigned to <strong>${escapeHtml(item.assigned_to)}</strong>` : ' · <em>Unassigned</em>'}
      <br><span style="color:#888;font-size:12px;">Created: ${escapeHtml(formatDate(item.timestamp))}</span>
      ${item.message ? `<br><div style="margin-top:6px;background:white;padding:6px 10px;border-radius:6px;border:1px solid #eef0f4;"><em>Customer:</em> ${escapeHtml(item.message)}</div>` : ''}
    </div>
  `;

  // Build synthetic events from booking history (created, assigned, completed) merged with log entries
  const events = buildTimelineEvents(item);
  const timelineHtml = events.length
    ? `<div class="timeline">` + events.map(e => `
        <div class="event kind-${e.kind}">
          <div class="dot"></div>
          <div class="body">
            <div><strong>${escapeHtml(e.title)}</strong>${e.by ? ` <span style="color:#666;font-size:12px;">· ${escapeHtml(e.by)}</span>` : ''}</div>
            <div class="meta">${escapeHtml(formatDate(e.at))}</div>
            ${e.text ? `<div class="text">${escapeHtml(e.text)}</div>` : ''}
          </div>
        </div>
      `).join('') + `</div>`
    : '<p class="dash-empty">No activity yet.</p>';

  document.getElementById('bookingDetailBody').innerHTML = meta + `
    <h4 style="color:var(--primary);margin-bottom:10px;font-size:14px;text-transform:uppercase;">🕒 Timeline</h4>
    ${timelineHtml}
  `;

  const form = document.getElementById('bookingNoteForm');
  if (form) {
    form.reset();
    form.dataset.bookingId = id;
  }
  document.getElementById('bookingDetailModal').classList.add('show');
}

function closeBookingDetail() {
  document.getElementById('bookingDetailModal').classList.remove('show');
  _detailBookingId = null;
}

function buildTimelineEvents(item) {
  const events = [];
  // Synthetic: creation
  if (item.timestamp) {
    events.push({ at: item.timestamp, by: 'customer', kind: 'created', title: 'Booking submitted', text: item.message || '' });
  }
  // Synthetic: assignment (single, latest)
  if (item.assigned_to && item.assigned_at) {
    events.push({ at: item.assigned_at, by: item.assigned_to, kind: 'assigned', title: `Assigned to ${item.assigned_to}`, text: '' });
  }
  // Synthetic: completion
  if (item.completed_at) {
    events.push({ at: item.completed_at, by: item.assigned_to || 'admin', kind: 'complete', title: 'Marked Complete', text: item.completion_notes || '' });
  }
  // Notes log entries (rich)
  parseNotesLog(item.internal_notes).forEach(n => {
    if (!n) return;
    events.push({
      at: n.at,
      by: n.by,
      kind: n.kind || 'note',
      title: (n.kind === 'note') ? `Note (${n.role || 'admin'})` : (n.kind === 'status' ? 'Status change' : (n.kind === 'assigned' ? 'Assignment' : (n.kind === 'complete' ? 'Completion' : 'Activity'))),
      text: n.text || ''
    });
  });
  events.sort((a, b) => (a.at || '').localeCompare(b.at || ''));
  return events;
}

async function handleAddBookingNote(e) {
  e.preventDefault();
  const form = e.target;
  const id = form.dataset.bookingId || _detailBookingId;
  if (!id) return;
  const txt = form.note.value.trim();
  if (!txt) return;
  const item = bookingsData.items.find(b => b.id === id);
  if (!item) { alert('Booking not found.'); return; }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true; submitBtn.textContent = 'Saving...';

  appendBookingLog(item, currentAdminUser(), 'admin', 'note', txt);
  try {
    await window.CsvAPI.saveAll(defaultHeaders(PATH_BOOKINGS), bookingsData.items, bookingsData.sha, getToken(),
      `Note on booking ${id}`, PATH_BOOKINGS);
    form.note.value = '';
    submitBtn.disabled = false; submitBtn.textContent = '➕ Add note';
    await loadBookings();
    // Re-open detail to show new entry
    openBookingDetail(id);
  } catch (err) {
    alert('Save failed: ' + err.message);
    submitBtn.disabled = false; submitBtn.textContent = '➕ Add note';
  }
}

/* ===========================================================================
 * WHATSAPP TEMPLATES
 * =========================================================================== */
const WA_TEMPLATES = [
  { id: 'ack',     label: '👋 Acknowledge', text: 'Hi {name}, this is Call4All. We have received your request for {service} and will get back to you shortly.' },
  { id: 'eta',     label: '🛵 On the way',  text: 'Hi {name}, our agent for {service} will reach you in approximately 30 minutes. Please keep your phone reachable.' },
  { id: 'quote',   label: '💰 Send quote',  text: 'Hi {name}, here is the quote for your {service} request. Please confirm and we will proceed.' },
  { id: 'reschedule', label: '🗓️ Reschedule', text: 'Hi {name}, due to high demand we would like to reschedule your {service} booking. Please share a convenient time.' },
  { id: 'thanks',  label: '🙏 Thanks + review', text: 'Hi {name}, thanks for choosing Call4All for {service}! If you are happy with our service, please share a Google review. It really helps us.' },
  { id: 'payment', label: '💳 Payment reminder', text: 'Hi {name}, this is a friendly reminder regarding payment for your {service} booking. Please complete it at your earliest convenience.' }
];

function toggleWaTemplateMenu(ev, id) {
  ev.preventDefault();
  ev.stopPropagation();
  const menu = document.getElementById('waTpl-' + id);
  if (!menu) return;
  // Close other menus
  document.querySelectorAll('.wa-template-menu.show').forEach(m => { if (m !== menu) m.classList.remove('show'); });
  // Lazy-fill menu
  if (!menu.children.length) {
    menu.innerHTML = WA_TEMPLATES.map(t =>
      `<button onclick="sendWaTemplate('${escapeAttr(id)}', '${t.id}')">${escapeHtml(t.label)}</button>`
    ).join('');
  }
  menu.classList.toggle('show');
}

function sendWaTemplate(bookingId, tplId) {
  const tpl = WA_TEMPLATES.find(t => t.id === tplId);
  const item = (bookingsData.items || []).find(b => b.id === bookingId);
  if (!tpl || !item) return;
  const phone = (item.phone || '').replace(/[^0-9]/g, '');
  if (!phone) { alert('No phone number on this booking.'); return; }
  const msg = tpl.text
    .replace(/\{name\}/g, item.name || 'Customer')
    .replace(/\{service\}/g, item.service || 'your request')
    .replace(/\{id\}/g, item.id || '');
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  document.querySelectorAll('.wa-template-menu.show').forEach(m => m.classList.remove('show'));
  // Record in timeline
  appendBookingLog(item, currentAdminUser(), 'admin', 'note', `WhatsApp template sent: "${tpl.label}"`);
  window.CsvAPI.saveAll(defaultHeaders(PATH_BOOKINGS), bookingsData.items, bookingsData.sha, getToken(),
    `Log WA template on booking ${bookingId}`, PATH_BOOKINGS).then(() => loadBookings()).catch(() => {});
}

function renderBarList(mountId, dataObj, limit) {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  const entries = Object.entries(dataObj).sort((a, b) => b[1] - a[1]).slice(0, limit || 5);
  if (!entries.length) {
    mount.innerHTML = '<p class="dash-empty">No data yet.</p>';
    return;
  }
  const max = entries[0][1] || 1;
  mount.innerHTML = entries.map(([name, count]) => {
    const pct = Math.max(4, Math.round((count / max) * 100));
    return `
      <div class="dash-bar-row">
        <div class="name">${escapeHtml(name)}</div>
        <div class="bar"><span style="width:${pct}%"></span></div>
        <div class="count">${count}</div>
      </div>
    `;
  }).join('');
}

/* ===== Login ===== */
function initLogin() {
  const form = document.getElementById('loginForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = form.token.value.trim();
    const user = form.username.value.trim() || 'admin';
    const pass = form.password.value;
    const errEl = document.getElementById('loginError');
    errEl.style.display = 'none';

    if (!token) {
      errEl.textContent = 'Please enter your GitHub Personal Access Token.';
      errEl.style.display = 'block';
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';

    try {
      const verify = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!verify.ok) throw new Error('Invalid access key. Check the key and try again.');

      const storedPassHash = localStorage.getItem(STORAGE_PASS_HASH);
      if (storedPassHash) {
        const inputHash = await sha256(pass || '');
        if (inputHash !== storedPassHash) throw new Error('Wrong admin password.');
      } else if (pass) {
        const newHash = await sha256(pass);
        localStorage.setItem(STORAGE_PASS_HASH, newHash);
      }

      localStorage.setItem(STORAGE_TOKEN, token);
      localStorage.setItem(STORAGE_USER, user);
      sessionStorage.setItem('c4a_admin_session', '1');
      window.location.href = 'admin.html';
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  });
}

/* ===== Admin Init ===== */
function initAdmin() {
  if (!getToken()) { window.location.href = 'admin.html'; return; }

  const userEl = document.getElementById('adminUser');
  if (userEl) userEl.textContent = localStorage.getItem(STORAGE_USER) || 'admin';

  setupTabs();
  setupSidebarToggle();
  bindBookingEvents();
  bindSourceEvents();
  bindStaffEvents();
  bindAreaEvents();
  bindGalleryEvents();
  bindSliderEvents();
  bindPagesEvents();
  bindThemeEvents();
  bindBrandingEvents();
  bindContactEvents();
  bindSettingsEvents();

  document.getElementById('logoutBtn').addEventListener('click', logout);

  const notifBtn = document.getElementById('enableAdminNotifBtn');
  if (notifBtn) notifBtn.addEventListener('click', enableAdminNotifications);
  refreshAdminNotifUi();

  refreshAutoSaveUi();  // banner state on first paint
  loadAllSections();
  loadSiteConfig();
  startAdminPolling();
}

function setupTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
      // Auto-close sidebar on mobile after click
      if (window.innerWidth <= 768) closeSidebar();
    });
  });
}
function switchTab(tabName) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tabName));
  // Lazy-load / refresh section data on activation
  if (tabName === 'gallery' && (!galleryData.items || !galleryData.items.length)) loadGallery();
  if (tabName === 'slider') refreshSliderUI();
  if (tabName === 'pages') refreshPagesUI();
  if (tabName === 'dashboard') renderDashboard();
}

function setupSidebarToggle() {
  const btn = document.getElementById('sidebarToggleBtn');
  const sidebar = document.getElementById('adminSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!btn || !sidebar) return;
  btn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('show', sidebar.classList.contains('open'));
  });
  if (backdrop) backdrop.addEventListener('click', closeSidebar);
}
function closeSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('show');
}

async function loadAllSections() {
  loadBookings();
  loadSources();
  loadStaff();
  loadAreas();
  loadGallery();
}

/* ===========================================================================
 * SECTION 1 — BOOKINGS
 * =========================================================================== */
/* Status normalisation: legacy "New" / "Contacted" / "Completed" map to
 * the new vocabulary so old rows render correctly with the new badges.
 */
const STATUS_MAP = {
  'new':        'Pending',
  'pending':    'Pending',
  'contacted':  'Processing',
  'processing': 'Processing',
  'completed':  'Complete',
  'complete':   'Complete',
  'cancelled':  'Cancelled',
  'cancel':     'Cancelled'
};
function normalizeStatus(s) {
  return STATUS_MAP[String(s || '').toLowerCase()] || 'Pending';
}

function bindBookingEvents() {
  document.getElementById('refreshBtn').addEventListener('click', loadBookings);
  document.getElementById('addNewBtn').addEventListener('click', () => openBookingModal(null));
  document.getElementById('exportBtn').addEventListener('click', exportBookingsCsv);
  document.getElementById('searchInput').addEventListener('input', renderBookingsTable);
  document.getElementById('statusFilter').addEventListener('change', renderBookingsTable);
  const af = document.getElementById('assignedFilter');
  if (af) af.addEventListener('change', renderBookingsTable);
  document.getElementById('editForm').addEventListener('submit', handleSaveBooking);
  document.getElementById('modalCloseBtn').addEventListener('click', closeBookingModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeBookingModal);

  // Date filter
  const df = document.getElementById('dateFilter');
  const dFrom = document.getElementById('dateFrom');
  const dTo = document.getElementById('dateTo');
  if (df) {
    df.addEventListener('change', () => {
      const isCustom = df.value === 'custom';
      if (dFrom) dFrom.style.display = isCustom ? 'inline-block' : 'none';
      if (dTo)   dTo.style.display   = isCustom ? 'inline-block' : 'none';
      renderBookingsTable();
    });
  }
  if (dFrom) dFrom.addEventListener('change', renderBookingsTable);
  if (dTo)   dTo.addEventListener('change',   renderBookingsTable);

  // Bulk actions
  const selAll = document.getElementById('bulkSelectAll');
  if (selAll) selAll.addEventListener('change', toggleBulkSelectAll);
  const bAssign = document.getElementById('bulkAssign');
  if (bAssign) bAssign.addEventListener('change', () => handleBulkAssign(bAssign.value));
  const bStatus = document.getElementById('bulkStatus');
  if (bStatus) bStatus.addEventListener('change', () => handleBulkStatus(bStatus.value));
  const bDel = document.getElementById('bulkDeleteBtn');
  if (bDel) bDel.addEventListener('click', handleBulkDelete);
  const bExp = document.getElementById('bulkExportBtn');
  if (bExp) bExp.addEventListener('click', handleBulkExport);
  const bClear = document.getElementById('bulkClearBtn');
  if (bClear) bClear.addEventListener('click', clearBulkSelection);

  // Booking detail modal
  const bdClose = document.getElementById('bookingDetailCloseBtn');
  if (bdClose) bdClose.addEventListener('click', closeBookingDetail);
  const noteForm = document.getElementById('bookingNoteForm');
  if (noteForm) noteForm.addEventListener('submit', handleAddBookingNote);

  // Customer history modal
  const chClose = document.getElementById('customerHistoryCloseBtn');
  if (chClose) chClose.addEventListener('click', closeCustomerHistory);

  // Close WA template menus on outside click
  document.addEventListener('click', (ev) => {
    if (!ev.target.closest('.wa-template-wrap')) {
      document.querySelectorAll('.wa-template-menu.show').forEach(m => m.classList.remove('show'));
    }
  });
}

async function loadBookings() {
  const tbody = document.getElementById('bookingsBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:30px;">Loading...</td></tr>';
  try {
    bookingsData = await window.CsvAPI.loadAll(getToken(), PATH_BOOKINGS);
    if (!bookingsData.headers.length) bookingsData.headers = defaultHeaders(PATH_BOOKINGS);
    updateBookingsStats();
    populateAssignedFilter();
    renderBookingsTable();
    renderDashboard();
    checkForNewAdminBookings();
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:30px;color:#dc3545;">❌ ${escapeHtml(err.message)}</td></tr>`;
  }
}

function updateBookingsStats() {
  const items = bookingsData.items;
  const counts = { Pending: 0, Processing: 0, Complete: 0, Cancelled: 0 };
  items.forEach(i => { counts[normalizeStatus(i.status)]++; });
  document.getElementById('statTotal').textContent = items.length;
  document.getElementById('statPending').textContent = counts.Pending;
  document.getElementById('statProcessing').textContent = counts.Processing;
  document.getElementById('statComplete').textContent = counts.Complete;
  document.getElementById('statCancelled').textContent = counts.Cancelled;
  document.getElementById('badgeBookings').textContent = items.length;
}

function populateAssignedFilter() {
  const sel = document.getElementById('assignedFilter');
  if (!sel) return;
  const current = sel.value;
  const staff = (staffData.items || []).filter(s => (s.status || '').toLowerCase() !== 'blocked');
  sel.innerHTML = '<option value="">All Staff</option>' +
    '<option value="__unassigned__">— Unassigned</option>' +
    staff.map(s => `<option value="${escapeAttr(s.email)}">${escapeHtml(s.name || s.email)}</option>`).join('');
  if (current) sel.value = current;
}

function renderBookingsTable() {
  const tbody = document.getElementById('bookingsBody');
  const search = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('statusFilter').value;
  const assignedFilter = (document.getElementById('assignedFilter') || {}).value || '';
  const dateFilter = (document.getElementById('dateFilter') || {}).value || '';
  const dateFrom = (document.getElementById('dateFrom') || {}).value || '';
  const dateTo = (document.getElementById('dateTo') || {}).value || '';

  let items = [...bookingsData.items];
  items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  if (statusFilter) items = items.filter(i => normalizeStatus(i.status).toLowerCase() === statusFilter.toLowerCase());
  if (assignedFilter === '__unassigned__') items = items.filter(i => !i.assigned_to);
  else if (assignedFilter) items = items.filter(i => (i.assigned_to || '') === assignedFilter);

  // Date range
  if (dateFilter) {
    let from = null, to = null;
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const dayMs = 86400000;
    if (dateFilter === 'today') {
      from = startOfDay.getTime();
      to = from + dayMs;
    } else if (dateFilter === '7d') {
      from = startOfDay.getTime() - 6 * dayMs;
    } else if (dateFilter === '30d') {
      from = startOfDay.getTime() - 29 * dayMs;
    } else if (dateFilter === 'custom') {
      if (dateFrom) from = new Date(dateFrom + 'T00:00:00').getTime();
      if (dateTo)   to   = new Date(dateTo   + 'T23:59:59').getTime();
    }
    items = items.filter(i => {
      const t = Date.parse(i.timestamp || 0);
      if (isNaN(t)) return false;
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;
      return true;
    });
  }

  if (search) items = items.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(search)));

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12"><div class="empty-state"><div class="icon">📭</div><div>No bookings found.</div></div></td></tr>';
    refreshBulkBar();
    return;
  }

  const activeStaff = (staffData.items || []).filter(s => (s.status || '').toLowerCase() !== 'blocked');
  populateBulkAssignDropdown(activeStaff);
  const selected = getBulkSelection();

  tbody.innerHTML = items.map(item => {
    const cityArea = [item.city, item.area].filter(Boolean).join(' / ');
    const phoneClean = (item.phone || '').replace(/[^0-9]/g, '');
    const status = normalizeStatus(item.status);
    const statusKey = status.toLowerCase();
    const stale = staleSeverity(item);
    const rowClass = stale === 'red' ? 'row-stale-red' : (stale === 'yellow' ? 'row-stale-yellow' : '');
    const isChecked = selected.has(item.id);

    const statusOptions = ['Pending','Processing','Complete','Cancelled']
      .map(s => `<option value="${s}" ${s === status ? 'selected' : ''}>${s}</option>`).join('');

    const assignedOptions =
      `<option value="">— Unassigned —</option>` +
      activeStaff.map(s => `<option value="${escapeAttr(s.email)}" ${item.assigned_to === s.email ? 'selected' : ''}>${escapeHtml(s.name || s.email)}</option>`).join('');

    let assignedDisplay = '<span style="color:#999;font-style:italic;">Unassigned</span>';
    if (item.assigned_to) {
      const staff = activeStaff.find(s => s.email === item.assigned_to);
      assignedDisplay = `<span class="name">${escapeHtml(staff ? staff.name : item.assigned_to)}</span>` +
        (item.assigned_at ? `<span>${formatDate(item.assigned_at)}</span>` : '');
    }

    const noteCount = parseNotesLog(item.internal_notes).length;
    const noteBadge = noteCount > 0
      ? `<span style="background:#eef2ff;color:#3949ab;padding:1px 7px;border-radius:9px;font-size:11px;margin-left:4px;">${noteCount}</span>`
      : '';

    const staleBadge = stale === 'red'
      ? '<span title="Pending > 2 hrs" style="display:inline-block;background:#dc3545;color:white;font-size:10px;padding:1px 6px;border-radius:9px;margin-left:4px;">🚨 STALE</span>'
      : stale === 'yellow'
        ? '<span title="Processing > 24 hrs" style="display:inline-block;background:#e6b800;color:white;font-size:10px;padding:1px 6px;border-radius:9px;margin-left:4px;">⏰ STUCK</span>'
        : '';

    return `
      <tr class="${rowClass}">
        <td><input type="checkbox" class="bulk-row-check" data-id="${escapeAttr(item.id)}" ${isChecked ? 'checked' : ''}></td>
        <td>
          <strong>${escapeHtml(item.id)}</strong>${staleBadge}
          <br><a href="#" onclick="openBookingDetail('${escapeAttr(item.id)}');return false;" style="font-size:11px;">📝 Details${noteBadge}</a>
        </td>
        <td>${formatDate(item.timestamp)}</td>
        <td>
          ${escapeHtml(item.name)}
          <br><a href="#" onclick="openCustomerHistory('${escapeAttr(item.phone)}');return false;" style="font-size:11px;color:var(--accent-dark);">🕒 History</a>
        </td>
        <td>
          <a href="tel:${escapeAttr(item.phone)}">${escapeHtml(item.phone)}</a>
          <div class="wa-template-wrap">
            <a href="https://wa.me/${phoneClean}" target="_blank" style="font-size:12px;">💬 WhatsApp</a>
            <button class="btn btn-outline btn-sm" style="padding:1px 6px;font-size:11px;margin-left:4px;"
                    onclick="toggleWaTemplateMenu(event, '${escapeAttr(item.id)}')">▾ Templates</button>
            <div class="wa-template-menu" id="waTpl-${escapeAttr(item.id)}"></div>
          </div>
        </td>
        <td>${escapeHtml(item.service)}</td>
        <td>${escapeHtml(cityArea || (item.location || '-'))}</td>
        <td class="msg-cell">${escapeHtml(item.address || '-')}</td>
        <td class="msg-cell">${escapeHtml(item.message)}</td>
        <td>
          <select class="inline-status-select is-${statusKey}"
                  onchange="quickUpdateStatus('${escapeAttr(item.id)}', this.value)">
            ${statusOptions}
          </select>
        </td>
        <td class="assigned-cell">
          <select class="inline-status-select" style="margin-bottom:4px;width:100%;"
                  onchange="quickAssignStaff('${escapeAttr(item.id)}', this.value)">
            ${assignedOptions}
          </select>
          ${assignedDisplay}
        </td>
        <td>
          <div class="actions">
            <button class="btn btn-primary btn-sm" onclick="openBookingModal('${escapeAttr(item.id)}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteBooking('${escapeAttr(item.id)}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Wire row checkboxes
  tbody.querySelectorAll('.bulk-row-check').forEach(cb => {
    cb.addEventListener('change', refreshBulkBar);
  });
  refreshBulkBar();
}

/* Quick inline update — change status without opening the modal */
async function quickUpdateStatus(id, newStatus) {
  const idx = bookingsData.items.findIndex(i => i.id === id);
  if (idx < 0) return;
  const item = bookingsData.items[idx];
  const original = { status: item.status, completed_at: item.completed_at, completion_notes: item.completion_notes };
  const normalized = normalizeStatus(newStatus);

  // If admin marks Complete inline, ask for a note (for audit trail consistency
  // with what staff are required to provide).
  if (normalized === 'Complete') {
    const note = prompt('Completion notes (how it was completed, customer feedback, payment, etc.):', item.completion_notes || '');
    if (note === null) {  // user cancelled
      renderBookingsTable();
      return;
    }
    item.completion_notes = note.trim();
    item.completed_at = new Date().toISOString();
  } else {
    // Moving out of Complete clears the completion record
    item.completion_notes = '';
    item.completed_at = '';
  }
  item.status = normalized;
  appendBookingLog(item, currentAdminUser(), 'admin',
    normalized === 'Complete' ? 'complete' : 'status',
    `Status → ${normalized}` + (item.completion_notes ? ` — ${item.completion_notes}` : ''));

  try {
    await window.CsvAPI.saveAll(defaultHeaders(PATH_BOOKINGS), bookingsData.items, bookingsData.sha, getToken(),
      `Update booking ${id} status → ${newStatus}`, PATH_BOOKINGS);
    await loadBookings();
  } catch (err) {
    alert('Status update failed: ' + err.message);
    Object.assign(item, original);
    renderBookingsTable();
  }
}

/* Quick inline update — assign or unassign a staff member */
async function quickAssignStaff(id, email) {
  const idx = bookingsData.items.findIndex(i => i.id === id);
  if (idx < 0) return;
  const item = bookingsData.items[idx];
  const original = { assigned_to: item.assigned_to, assigned_at: item.assigned_at };
  item.assigned_to = email || '';
  item.assigned_at = email ? new Date().toISOString() : '';
  // If newly assigned and status was Pending, auto-bump to Processing
  if (email && normalizeStatus(item.status) === 'Pending') {
    item.status = 'Processing';
    appendBookingLog(item, currentAdminUser(), 'admin', 'status', 'Auto: → Processing on assignment');
  }
  appendBookingLog(item, currentAdminUser(), 'admin', 'assigned',
    email ? `Assigned to ${email}` : 'Unassigned');
  try {
    await window.CsvAPI.saveAll(defaultHeaders(PATH_BOOKINGS), bookingsData.items, bookingsData.sha, getToken(),
      email ? `Assign booking ${id} to ${email}` : `Unassign booking ${id}`, PATH_BOOKINGS);
    await loadBookings();
  } catch (err) {
    alert('Assignment failed: ' + err.message);
    item.assigned_to = original.assigned_to;
    item.assigned_at = original.assigned_at;
    renderBookingsTable();
  }
}

function openBookingModal(id) {
  editingBookingId = id;
  const modal = document.getElementById('editModal');
  const form = document.getElementById('editForm');
  const title = document.getElementById('modalTitle');
  const services = window.SITE_CONFIG.services;

  document.getElementById('em_service').innerHTML = services.map(s =>
    `<option value="${escapeAttr(s.name)}">${s.icon} ${escapeHtml(s.name)}</option>`
  ).join('');

  // Populate staff dropdown (active only)
  const activeStaff = (staffData.items || []).filter(s => (s.status || '').toLowerCase() !== 'blocked');
  document.getElementById('em_assigned_to').innerHTML =
    '<option value="">— Unassigned —</option>' +
    activeStaff.map(s => `<option value="${escapeAttr(s.email)}">${escapeHtml(s.name || s.email)} (${escapeHtml(s.email)})</option>`).join('');

  if (id) {
    const item = bookingsData.items.find(i => i.id === id);
    if (!item) { alert('Booking not found.'); return; }
    title.textContent = 'Edit Booking - ' + id;
    form.id_field.value = item.id;
    form.timestamp_field.value = item.timestamp;
    form.assigned_at_field.value = item.assigned_at || '';
    form.name.value = item.name || '';
    form.phone.value = item.phone || '';
    form.service.value = item.service || '';
    form.city.value = item.city || item.location || '';
    form.area.value = item.area || '';
    form.address.value = item.address || '';
    form.message.value = item.message || '';
    form.status.value = normalizeStatus(item.status);
    form.assigned_to.value = item.assigned_to || '';
  } else {
    title.textContent = 'Add New Booking';
    form.reset();
    form.id_field.value = genId('BK');
    form.timestamp_field.value = new Date().toISOString();
    form.assigned_at_field.value = '';
    form.status.value = 'Pending';
    form.assigned_to.value = '';
  }
  modal.classList.add('show');
}
function closeBookingModal() {
  document.getElementById('editModal').classList.remove('show');
  editingBookingId = null;
}

async function handleSaveBooking(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  const newAssigned = form.assigned_to.value.trim();
  const oldAssignedAt = form.assigned_at_field.value || '';
  // If the assignee changed, stamp a new assigned_at; otherwise keep old.
  let assignedAt = oldAssignedAt;
  if (editingBookingId) {
    const orig = bookingsData.items.find(i => i.id === editingBookingId);
    if (orig && (orig.assigned_to || '') !== newAssigned) {
      assignedAt = newAssigned ? new Date().toISOString() : '';
    }
  } else if (newAssigned) {
    assignedAt = new Date().toISOString();
  }

  // Preserve any existing completion_notes / completed_at on edit
  const existing = editingBookingId ? bookingsData.items.find(i => i.id === editingBookingId) : null;
  const newStatus = normalizeStatus(form.status.value);
  let completedAt = existing ? (existing.completed_at || '') : '';
  // If admin transitions to Complete and no completed_at yet, stamp now
  if (newStatus === 'Complete' && !completedAt) completedAt = new Date().toISOString();
  // If admin moves OUT of Complete, clear timestamp + notes
  if (newStatus !== 'Complete') completedAt = '';

  const row = {
    id: form.id_field.value,
    timestamp: form.timestamp_field.value,
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    service: form.service.value.trim(),
    city: form.city.value.trim(),
    area: form.area.value.trim(),
    address: form.address.value.trim(),
    message: form.message.value.trim(),
    status: newStatus,
    assigned_to: newAssigned,
    assigned_at: assignedAt,
    completion_notes: existing ? (existing.completion_notes || '') : '',
    completed_at: completedAt,
    internal_notes: existing ? (existing.internal_notes || '') : JSON.stringify([
      { at: new Date().toISOString(), by: currentAdminUser(), role: 'admin', kind: 'created', text: 'Created via admin panel' }
    ])
  };

  // Log diffs on edit
  if (existing) {
    if (existing.status !== row.status) {
      appendBookingLog(row, currentAdminUser(), 'admin',
        row.status === 'Complete' ? 'complete' : 'status', `Status: ${normalizeStatus(existing.status)} → ${row.status}`);
    }
    if ((existing.assigned_to || '') !== row.assigned_to) {
      appendBookingLog(row, currentAdminUser(), 'admin', 'assigned',
        row.assigned_to ? `Assigned to ${row.assigned_to}` : 'Unassigned');
    }
  }

  try {
    let items = [...bookingsData.items];
    if (editingBookingId) {
      const idx = items.findIndex(i => i.id === editingBookingId);
      if (idx >= 0) items[idx] = row; else items.push(row);
    } else {
      items.push(row);
    }
    await window.CsvAPI.saveAll(defaultHeaders(PATH_BOOKINGS), items, bookingsData.sha, getToken(),
      editingBookingId ? `Update booking ${row.id}` : `Add booking ${row.id}`, PATH_BOOKINGS);
    closeBookingModal();
    await loadBookings();
  } catch (err) {
    alert('Save failed: ' + err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = '💾 Save Booking';
  }
}

async function deleteBooking(id) {
  if (!confirm(`Delete booking ${id}? This cannot be undone.`)) return;
  try {
    const items = bookingsData.items.filter(i => i.id !== id);
    await window.CsvAPI.saveAll(defaultHeaders(PATH_BOOKINGS), items, bookingsData.sha, getToken(),
      `Delete booking ${id}`, PATH_BOOKINGS);
    await loadBookings();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
}

function exportBookingsCsv() {
  const csv = window.CsvAPI.objectsToCsv(defaultHeaders(PATH_BOOKINGS), bookingsData.items);
  downloadCsv(csv, 'call4all-bookings');
}

function downloadCsv(csv, prefix) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ===========================================================================
 * SECTION 2 — SOURCES / INVENTORY
 * =========================================================================== */
function bindSourceEvents() {
  document.getElementById('addSourceBtn').addEventListener('click', () => openSourceModal(null));
  document.getElementById('refreshSourcesBtn').addEventListener('click', loadSources);
  document.getElementById('exportSourcesBtn').addEventListener('click', exportSourcesCsv);
  document.getElementById('srcSearchInput').addEventListener('input', renderSourcesTable);
  document.getElementById('srcCategoryFilter').addEventListener('change', renderSourcesTable);
  document.getElementById('srcCityFilter').addEventListener('change', renderSourcesTable);
  document.getElementById('sourceForm').addEventListener('submit', handleSaveSource);
  document.getElementById('sourceModalCloseBtn').addEventListener('click', closeSourceModal);
  document.getElementById('sourceModalCancelBtn').addEventListener('click', closeSourceModal);
  document.getElementById('src_city').addEventListener('change', updateSourceAreaOptions);
}

async function loadSources() {
  const tbody = document.getElementById('sourcesBody');
  tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:30px;">Loading...</td></tr>';
  try {
    sourcesData = await window.CsvAPI.loadAll(getToken(), PATH_SOURCES);
    if (!sourcesData.headers.length) sourcesData.headers = defaultHeaders(PATH_SOURCES);
    updateSourcesStats();
    populateSourceFilters();
    renderSourcesTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:30px;color:#dc3545;">❌ ${escapeHtml(err.message)}</td></tr>`;
  }
}

function updateSourcesStats() {
  const items = sourcesData.items;
  document.getElementById('badgeSources').textContent = items.length;

  const statsEl = document.getElementById('sourcesStats');
  const total = items.length;
  const available = items.filter(i => (i.availability || '').toLowerCase() === 'available').length;
  const booked = items.filter(i => (i.availability || '').toLowerCase() === 'booked').length;
  const categoryCount = new Set(items.map(i => i.category).filter(Boolean)).size;

  statsEl.innerHTML = `
    <div class="stat-card"><div class="label">Total Sources</div><div class="value">${total}</div></div>
    <div class="stat-card ok"><div class="label">Available</div><div class="value">${available}</div></div>
    <div class="stat-card warn"><div class="label">Booked</div><div class="value">${booked}</div></div>
    <div class="stat-card"><div class="label">Categories</div><div class="value">${categoryCount}</div></div>
  `;
}

function populateSourceFilters() {
  const catFilter = document.getElementById('srcCategoryFilter');
  const cityFilter = document.getElementById('srcCityFilter');
  const services = window.SITE_CONFIG.services;
  catFilter.innerHTML = '<option value="">All Categories</option>' +
    services.map(s => `<option value="${escapeAttr(s.name)}">${s.icon} ${escapeHtml(s.name)}</option>`).join('');
  const cities = [...new Set(sourcesData.items.map(i => i.city).filter(Boolean))].sort();
  cityFilter.innerHTML = '<option value="">All Cities</option>' +
    cities.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join('');
}

function renderSourcesTable() {
  const tbody = document.getElementById('sourcesBody');
  const search = (document.getElementById('srcSearchInput').value || '').toLowerCase().trim();
  const cat = document.getElementById('srcCategoryFilter').value;
  const city = document.getElementById('srcCityFilter').value;

  let items = [...sourcesData.items];
  items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  if (cat) items = items.filter(i => i.category === cat);
  if (city) items = items.filter(i => i.city === city);
  if (search) items = items.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(search)));

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11"><div class="empty-state"><div class="icon">📭</div><div>No sources found. Click ➕ Add Source to start.</div></div></td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => {
    const phoneClean = (item.contact_phone || '').replace(/[^0-9]/g, '');
    const availClass = (item.availability || 'available').toLowerCase().replace('-', '');
    return `
      <tr>
        <td><strong>${escapeHtml(item.id)}</strong></td>
        <td>${escapeHtml(item.category)}</td>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td>${escapeHtml(item.city || '-')}<br><span style="font-size:12px;color:#666;">${escapeHtml(item.area || '-')}</span></td>
        <td class="msg-cell">${escapeHtml(item.address || '-')}</td>
        <td>
          ${escapeHtml(item.contact_person || '-')}<br>
          <a href="tel:${escapeAttr(item.contact_phone)}" style="font-size:12px;">${escapeHtml(item.contact_phone)}</a>
          ${phoneClean ? ` <a href="https://wa.me/${phoneClean}" target="_blank" style="font-size:12px;">💬</a>` : ''}
        </td>
        <td>${escapeHtml(item.price || '-')}</td>
        <td><span class="status-badge status-${availClass === 'available' ? 'completed' : (availClass === 'booked' ? 'new' : 'cancelled')}">${escapeHtml(item.availability || 'Available')}</span></td>
        <td class="msg-cell" style="font-size:12px;">${escapeHtml(item.notes || '-')}</td>
        <td style="font-size:12px;">${escapeHtml(item.added_by || 'admin')}</td>
        <td>
          <div class="actions">
            <button class="btn btn-primary btn-sm" onclick="openSourceModal('${escapeAttr(item.id)}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSource('${escapeAttr(item.id)}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openSourceModal(id) {
  editingSourceId = id;
  const modal = document.getElementById('sourceModal');
  const form = document.getElementById('sourceForm');
  const title = document.getElementById('sourceModalTitle');

  // Populate categories
  const catSel = document.getElementById('src_category');
  catSel.innerHTML = window.SITE_CONFIG.services.map(s =>
    `<option value="${escapeAttr(s.name)}">${s.icon} ${escapeHtml(s.name)}</option>`
  ).join('');

  // Populate cities (from active areas)
  const activeAreas = areasData.items.filter(a => (a.status || '').toLowerCase() === 'active');
  const cities = [...new Set(activeAreas.map(a => a.city).filter(Boolean))].sort();
  const citySel = document.getElementById('src_city');
  citySel.innerHTML = '<option value="">-- Select city --</option>' +
    cities.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join('');

  if (id) {
    const item = sourcesData.items.find(i => i.id === id);
    if (!item) { alert('Source not found.'); return; }
    title.textContent = 'Edit Source - ' + id;
    form.id_field.value = item.id;
    form.timestamp_field.value = item.timestamp;
    form.added_by.value = item.added_by || 'admin';
    form.category.value = item.category || '';
    form.name.value = item.name || '';
    form.city.value = item.city || '';
    updateSourceAreaOptions();
    form.area.value = item.area || '';
    if (!form.area.value && item.area) {
      // Add the existing area even if not in active list
      const opt = document.createElement('option');
      opt.value = item.area; opt.textContent = item.area;
      form.area.appendChild(opt);
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
    form.added_by.value = localStorage.getItem(STORAGE_USER) || 'admin';
    form.availability.value = 'Available';
  }
  modal.classList.add('show');
}

function updateSourceAreaOptions() {
  const city = document.getElementById('src_city').value;
  const areaSel = document.getElementById('src_area');
  if (!city) {
    areaSel.innerHTML = '<option value="">Select city first</option>';
    return;
  }
  const activeAreas = areasData.items.filter(a => (a.status || '').toLowerCase() === 'active' && a.city === city);
  const areaList = [...new Set(activeAreas.map(a => a.area).filter(Boolean))].sort();
  areaSel.innerHTML = '<option value="">-- Select area --</option>' +
    areaList.map(a => `<option value="${escapeAttr(a)}">${escapeHtml(a)}</option>`).join('');
}

function closeSourceModal() {
  document.getElementById('sourceModal').classList.remove('show');
  editingSourceId = null;
}

async function handleSaveSource(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true; submitBtn.textContent = 'Saving...';

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
    added_by: form.added_by.value
  };

  try {
    let items = [...sourcesData.items];
    if (editingSourceId) {
      const idx = items.findIndex(i => i.id === editingSourceId);
      if (idx >= 0) items[idx] = row; else items.push(row);
    } else items.push(row);

    await window.CsvAPI.saveAll(defaultHeaders(PATH_SOURCES), items, sourcesData.sha, getToken(),
      editingSourceId ? `Update source ${row.id}` : `Add source ${row.id}`, PATH_SOURCES);
    closeSourceModal();
    await loadSources();
  } catch (err) {
    alert('Save failed: ' + err.message);
    submitBtn.disabled = false; submitBtn.textContent = '💾 Save Source';
  }
}

async function deleteSource(id) {
  if (!confirm(`Delete source ${id}?`)) return;
  try {
    const items = sourcesData.items.filter(i => i.id !== id);
    await window.CsvAPI.saveAll(defaultHeaders(PATH_SOURCES), items, sourcesData.sha, getToken(),
      `Delete source ${id}`, PATH_SOURCES);
    await loadSources();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
}

function exportSourcesCsv() {
  const csv = window.CsvAPI.objectsToCsv(defaultHeaders(PATH_SOURCES), sourcesData.items);
  downloadCsv(csv, 'call4all-sources');
}

/* ===========================================================================
 * SECTION 3 — STAFF MANAGEMENT
 * =========================================================================== */
function bindStaffEvents() {
  document.getElementById('addStaffBtn').addEventListener('click', () => openStaffModal(null));
  document.getElementById('refreshStaffBtn').addEventListener('click', loadStaff);
  document.getElementById('staffSearchInput').addEventListener('input', renderStaffTable);
  document.getElementById('staffStatusFilter').addEventListener('change', renderStaffTable);
  document.getElementById('staffForm').addEventListener('submit', handleSaveStaff);
  document.getElementById('staffModalCloseBtn').addEventListener('click', closeStaffModal);
  document.getElementById('staffModalCancelBtn').addEventListener('click', closeStaffModal);
}

async function loadStaff() {
  const tbody = document.getElementById('staffBody');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;">Loading...</td></tr>';
  try {
    staffData = await window.CsvAPI.loadAll(getToken(), PATH_STAFF);
    if (!staffData.headers.length) staffData.headers = defaultHeaders(PATH_STAFF);
    document.getElementById('badgeStaff').textContent = staffData.items.length;
    renderStaffTable();
    // After staff list is known, refresh bookings UI so the assignment
    // dropdowns and "Assigned" column show real names instead of emails.
    if (bookingsData.items && bookingsData.items.length) {
      populateAssignedFilter();
      renderBookingsTable();
      renderDashboard();
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#dc3545;">❌ ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderStaffTable() {
  const tbody = document.getElementById('staffBody');
  const search = (document.getElementById('staffSearchInput').value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('staffStatusFilter').value;
  let items = [...staffData.items];
  items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  if (statusFilter) items = items.filter(i => (i.status || '').toLowerCase() === statusFilter.toLowerCase());
  if (search) items = items.filter(i => [i.name, i.email, i.phone].some(v => String(v || '').toLowerCase().includes(search)));

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="icon">👥</div><div>No staff members yet. Click ➕ Add Staff to create one.</div></div></td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => {
    const isBlocked = (item.status || '').toLowerCase() === 'blocked';
    return `
      <tr>
        <td><strong>${escapeHtml(item.id)}</strong></td>
        <td>${escapeHtml(item.name)}</td>
        <td><a href="mailto:${escapeAttr(item.email)}">${escapeHtml(item.email)}</a></td>
        <td>${escapeHtml(item.phone || '-')}</td>
        <td>${escapeHtml(item.role || 'Staff')}</td>
        <td><span class="status-badge ${isBlocked ? 'status-cancelled' : 'status-completed'}">${escapeHtml(item.status || 'Active')}</span></td>
        <td style="font-size:12px;">${formatDate(item.created_at)}</td>
        <td>
          <div class="actions">
            <button class="btn btn-primary btn-sm" onclick="openStaffModal('${escapeAttr(item.id)}')">✏️</button>
            <button class="btn ${isBlocked ? 'btn-success' : 'btn-accent'} btn-sm" onclick="toggleStaffBlock('${escapeAttr(item.id)}')">${isBlocked ? '✅ Unblock' : '🚫 Block'}</button>
            <button class="btn btn-danger btn-sm" onclick="deleteStaff('${escapeAttr(item.id)}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openStaffModal(id) {
  editingStaffId = id;
  const modal = document.getElementById('staffModal');
  const form = document.getElementById('staffForm');
  const title = document.getElementById('staffModalTitle');
  const passNote = document.getElementById('staffPassNote');

  if (id) {
    const item = staffData.items.find(i => i.id === id);
    if (!item) { alert('Staff not found.'); return; }
    title.textContent = 'Edit Staff - ' + item.name;
    passNote.textContent = '(leave empty to keep existing password)';
    form.id_field.value = item.id;
    form.created_at_field.value = item.created_at;
    form.created_by_field.value = item.created_by || '';
    form.existing_hash.value = item.password_hash || '';
    form.name.value = item.name || '';
    form.email.value = item.email || '';
    form.phone.value = item.phone || '';
    form.role.value = item.role || 'Staff';
    form.status.value = item.status || 'Active';
    form.password.value = '';
  } else {
    title.textContent = 'Add Staff Member';
    passNote.textContent = '(required for new staff)';
    form.reset();
    form.id_field.value = genId('ST');
    form.created_at_field.value = new Date().toISOString();
    form.created_by_field.value = localStorage.getItem(STORAGE_USER) || 'admin';
    form.existing_hash.value = '';
    form.role.value = 'Staff';
    form.status.value = 'Active';
  }
  modal.classList.add('show');
}

function closeStaffModal() {
  document.getElementById('staffModal').classList.remove('show');
  editingStaffId = null;
}

async function handleSaveStaff(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true; submitBtn.textContent = 'Saving...';

  const email = form.email.value.trim().toLowerCase();
  const newPass = form.password.value;
  let passHash = form.existing_hash.value;

  // Email uniqueness check
  const dupe = staffData.items.find(s => (s.email || '').toLowerCase() === email && s.id !== editingStaffId);
  if (dupe) {
    alert('Email already exists for another staff member.');
    submitBtn.disabled = false; submitBtn.textContent = '💾 Save Staff';
    return;
  }

  if (newPass) {
    passHash = await sha256(newPass);
  } else if (!editingStaffId) {
    alert('Password is required for new staff.');
    submitBtn.disabled = false; submitBtn.textContent = '💾 Save Staff';
    return;
  }

  const row = {
    id: form.id_field.value,
    email: email,
    password_hash: passHash,
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    role: form.role.value,
    status: form.status.value,
    created_at: form.created_at_field.value,
    created_by: form.created_by_field.value
  };

  try {
    let items = [...staffData.items];
    if (editingStaffId) {
      const idx = items.findIndex(i => i.id === editingStaffId);
      if (idx >= 0) items[idx] = row; else items.push(row);
    } else items.push(row);

    await window.CsvAPI.saveAll(defaultHeaders(PATH_STAFF), items, staffData.sha, getToken(),
      editingStaffId ? `Update staff ${row.email}` : `Add staff ${row.email}`, PATH_STAFF);
    closeStaffModal();
    await loadStaff();
    if (newPass && !editingStaffId) {
      alert(`Staff added!\n\nShare these credentials with ${row.name}:\nEmail: ${row.email}\nPassword: ${newPass}\n\nLogin URL: staff.html`);
    }
  } catch (err) {
    alert('Save failed: ' + err.message);
    submitBtn.disabled = false; submitBtn.textContent = '💾 Save Staff';
  }
}

async function toggleStaffBlock(id) {
  const item = staffData.items.find(i => i.id === id);
  if (!item) return;
  const newStatus = (item.status || '').toLowerCase() === 'blocked' ? 'Active' : 'Blocked';
  if (!confirm(`${newStatus === 'Blocked' ? 'Block' : 'Unblock'} staff member "${item.name}"?`)) return;
  try {
    const items = staffData.items.map(i => i.id === id ? { ...i, status: newStatus } : i);
    await window.CsvAPI.saveAll(defaultHeaders(PATH_STAFF), items, staffData.sha, getToken(),
      `Set staff ${item.email} status to ${newStatus}`, PATH_STAFF);
    await loadStaff();
  } catch (err) {
    alert('Update failed: ' + err.message);
  }
}

async function deleteStaff(id) {
  const item = staffData.items.find(i => i.id === id);
  if (!item) return;
  if (!confirm(`Delete staff "${item.name}"? This cannot be undone.`)) return;
  try {
    const items = staffData.items.filter(i => i.id !== id);
    await window.CsvAPI.saveAll(defaultHeaders(PATH_STAFF), items, staffData.sha, getToken(),
      `Delete staff ${item.email}`, PATH_STAFF);
    await loadStaff();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
}

/* ===========================================================================
 * SECTION 4 — SERVICE AREAS
 * =========================================================================== */
function bindAreaEvents() {
  document.getElementById('addAreaBtn').addEventListener('click', () => openAreaModal(null));
  document.getElementById('refreshAreasBtn').addEventListener('click', loadAreas);
  document.getElementById('areaSearchInput').addEventListener('input', renderAreasTable);
  document.getElementById('areaStatusFilter').addEventListener('change', renderAreasTable);
  document.getElementById('areaForm').addEventListener('submit', handleSaveArea);
  document.getElementById('areaModalCloseBtn').addEventListener('click', closeAreaModal);
  document.getElementById('areaModalCancelBtn').addEventListener('click', closeAreaModal);
}

async function loadAreas() {
  const tbody = document.getElementById('areasBody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;">Loading...</td></tr>';
  try {
    areasData = await window.CsvAPI.loadAll(getToken(), PATH_AREAS);
    if (!areasData.headers.length) areasData.headers = defaultHeaders(PATH_AREAS);
    document.getElementById('badgeAreas').textContent = areasData.items.length;
    renderAreasTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#dc3545;">❌ ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderAreasTable() {
  const tbody = document.getElementById('areasBody');
  const search = (document.getElementById('areaSearchInput').value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('areaStatusFilter').value;
  let items = [...areasData.items];
  items.sort((a, b) => (a.city || '').localeCompare(b.city || '') || (a.area || '').localeCompare(b.area || ''));
  if (statusFilter) items = items.filter(i => (i.status || '').toLowerCase() === statusFilter.toLowerCase());
  if (search) items = items.filter(i => [i.city, i.area].some(v => String(v || '').toLowerCase().includes(search)));

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="icon">📍</div><div>No service areas yet. Click ➕ Add Area to define your service zones.</div></div></td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => {
    const isInactive = (item.status || '').toLowerCase() === 'inactive';
    return `
      <tr>
        <td><strong>${escapeHtml(item.id)}</strong></td>
        <td>${escapeHtml(item.city)}</td>
        <td>${escapeHtml(item.area)}</td>
        <td><span class="status-badge ${isInactive ? 'status-cancelled' : 'status-completed'}">${escapeHtml(item.status || 'Active')}</span></td>
        <td style="font-size:12px;">${formatDate(item.created_at)}</td>
        <td>
          <div class="actions">
            <button class="btn btn-primary btn-sm" onclick="openAreaModal('${escapeAttr(item.id)}')">✏️</button>
            <button class="btn ${isInactive ? 'btn-success' : 'btn-accent'} btn-sm" onclick="toggleAreaStatus('${escapeAttr(item.id)}')">${isInactive ? '✅ Activate' : '⏸️ Deactivate'}</button>
            <button class="btn btn-danger btn-sm" onclick="deleteArea('${escapeAttr(item.id)}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAreaModal(id) {
  editingAreaId = id;
  const modal = document.getElementById('areaModal');
  const form = document.getElementById('areaForm');
  const title = document.getElementById('areaModalTitle');
  if (id) {
    const item = areasData.items.find(i => i.id === id);
    if (!item) { alert('Area not found.'); return; }
    title.textContent = 'Edit Area';
    form.id_field.value = item.id;
    form.created_at_field.value = item.created_at;
    form.city.value = item.city || '';
    form.area.value = item.area || '';
    form.status.value = item.status || 'Active';
  } else {
    title.textContent = 'Add Service Area';
    form.reset();
    form.id_field.value = genId('AR');
    form.created_at_field.value = new Date().toISOString();
    form.status.value = 'Active';
  }
  modal.classList.add('show');
}

function closeAreaModal() {
  document.getElementById('areaModal').classList.remove('show');
  editingAreaId = null;
}

async function handleSaveArea(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true; submitBtn.textContent = 'Saving...';

  const city = form.city.value.trim();
  const area = form.area.value.trim();

  // Duplicate check
  const dupe = areasData.items.find(a =>
    (a.city || '').toLowerCase() === city.toLowerCase() &&
    (a.area || '').toLowerCase() === area.toLowerCase() &&
    a.id !== editingAreaId
  );
  if (dupe) {
    alert(`"${area}, ${city}" already exists.`);
    submitBtn.disabled = false; submitBtn.textContent = '💾 Save Area';
    return;
  }

  const row = {
    id: form.id_field.value,
    city: city,
    area: area,
    status: form.status.value,
    created_at: form.created_at_field.value
  };

  try {
    let items = [...areasData.items];
    if (editingAreaId) {
      const idx = items.findIndex(i => i.id === editingAreaId);
      if (idx >= 0) items[idx] = row; else items.push(row);
    } else items.push(row);

    await window.CsvAPI.saveAll(defaultHeaders(PATH_AREAS), items, areasData.sha, getToken(),
      editingAreaId ? `Update area ${city}/${area}` : `Add area ${city}/${area}`, PATH_AREAS);
    closeAreaModal();
    await loadAreas();
  } catch (err) {
    alert('Save failed: ' + err.message);
    submitBtn.disabled = false; submitBtn.textContent = '💾 Save Area';
  }
}

async function toggleAreaStatus(id) {
  const item = areasData.items.find(i => i.id === id);
  if (!item) return;
  const newStatus = (item.status || '').toLowerCase() === 'inactive' ? 'Active' : 'Inactive';
  try {
    const items = areasData.items.map(i => i.id === id ? { ...i, status: newStatus } : i);
    await window.CsvAPI.saveAll(defaultHeaders(PATH_AREAS), items, areasData.sha, getToken(),
      `Set area ${item.city}/${item.area} to ${newStatus}`, PATH_AREAS);
    await loadAreas();
  } catch (err) {
    alert('Update failed: ' + err.message);
  }
}

async function deleteArea(id) {
  const item = areasData.items.find(i => i.id === id);
  if (!item) return;
  if (!confirm(`Delete area "${item.area}, ${item.city}"?`)) return;
  try {
    const items = areasData.items.filter(i => i.id !== id);
    await window.CsvAPI.saveAll(defaultHeaders(PATH_AREAS), items, areasData.sha, getToken(),
      `Delete area ${item.city}/${item.area}`, PATH_AREAS);
    await loadAreas();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
}

/* ===========================================================================
 * SECTION 5 — SETTINGS (now a tab, not a modal)
 * =========================================================================== */
function bindSettingsEvents() {
  const form = document.getElementById('settingsForm');
  if (!form) return;
  form.addEventListener('submit', handleSaveSettings);
  // Pre-fill on load + initial pill state. We prefer the token from
  // site-config.json (shared with every visitor) and fall back to the
  // legacy localStorage value so older setups still display correctly.
  const cfgTok = (siteConfigData.json && siteConfigData.json.public_form_token) || '';
  document.getElementById('publicToken').value = cfgTok || localStorage.getItem(STORAGE_PUBLIC) || '';
  refreshAutoSaveUi();

  document.getElementById('clearPublicBtn').addEventListener('click', async () => {
    // Clear both: site-config.json (so customers stop auto-saving) AND
    // localStorage (so this browser is consistent with the public site).
    try {
      if (siteConfigData.json) {
        delete siteConfigData.json.public_form_token;
        await saveSiteConfig('Clear public_form_token (auto-save OFF)');
      }
    } catch (err) {
      showMsg('settingsMsg', '❌ Could not clear public token from site-config.json: ' + err.message, 'error');
      return;
    }
    localStorage.removeItem(STORAGE_PUBLIC);
    document.getElementById('publicToken').value = '';
    showMsg('settingsMsg', '✅ Public token cleared. Customer forms will now only arrive on WhatsApp.', 'info');
    refreshAutoSaveUi();
  });
  document.getElementById('clearPassBtn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_PASS_HASH);
    showMsg('settingsMsg', 'Admin password cleared.', 'info');
  });

  const regenBtn = document.getElementById('regenSitemapBtn');
  if (regenBtn) {
    regenBtn.addEventListener('click', () => regenerateSitemap({ silent: false }));
  }
}

/* ===== SITEMAP AUTO-GENERATION ===== */
async function listRootHtmlFiles(token) {
  const gh = window.SITE_CONFIG && window.SITE_CONFIG.github;
  if (!gh) throw new Error('GitHub repo settings missing in site-config.');
  const res = await fetch(
    `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/?ref=${encodeURIComponent(gh.branch || 'main')}&t=${Date.now()}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`
      },
      cache: 'no-store'
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Could not list repo files (${res.status})`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .filter((f) => f.type === 'file' && /\.html$/i.test(f.name))
    .map((f) => f.name);
}

async function regenerateSitemap({ silent } = {}) {
  if (!window.C4aSitemapGen) throw new Error('Sitemap generator script not loaded.');
  const token = getToken();
  if (!token) throw new Error('GitHub token required. Log in again.');

  const btn = document.getElementById('regenSitemapBtn');
  const status = document.getElementById('sitemapStatus');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating...'; }

  try {
    const [config, htmlFiles, propertyData] = await Promise.all([
      window.C4aSitemapGen.loadConfig(),
      listRootHtmlFiles(token),
      window.CsvAPI.loadAllPublic('data/properties.csv').catch(() => ({ items: [] }))
    ]);
    const pages = ensurePagesArray().filter((p) => p.enabled !== false && p.slug);
    const properties = propertyData.items || [];
    const xml = window.C4aSitemapGen.generate(config, htmlFiles, pages, properties);
    const sha = await window.CsvAPI.getFileSha('sitemap.xml', token);
    await window.CsvAPI.putFile('sitemap.xml', xml, sha, token, 'Auto-generate sitemap.xml (admin)');

    const count = window.C4aSitemapGen.buildEntries(config, htmlFiles, pages, properties).length;
    const msg = `✅ Sitemap updated — ${count} URLs. Submit https://call4all.co.in/sitemap.xml in Google Search Console if needed.`;
    if (status) status.textContent = msg;
    if (!silent) showMsg('settingsMsg', msg, 'success');
    return count;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Regenerate Sitemap Now'; }
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const form = e.target;
  const publicTok = form.publicToken.value.trim();
  const newPass = form.newAdminPass.value;

  // Persist the public token to data/site-config.json so EVERY visitor's
  // browser receives it (the booking form needs it to write bookings.csv
  // on behalf of the customer). Keep a localStorage copy too so this
  // admin browser stays in sync even before the site-config CDN refreshes.
  if (publicTok) {
    try {
      if (!siteConfigData.json) siteConfigData.json = buildDefaultSiteConfig();
      siteConfigData.json.public_form_token = publicTok;
      await saveSiteConfig('Set public_form_token (auto-save ON)');
      localStorage.setItem(STORAGE_PUBLIC, publicTok);
    } catch (err) {
      showMsg('settingsMsg', '❌ Failed to save token to site-config.json: ' + err.message, 'error');
      return;
    }
  }

  if (newPass) {
    const hash = await sha256(newPass);
    localStorage.setItem(STORAGE_PASS_HASH, hash);
    document.getElementById('newAdminPass').value = '';
  }
  showMsg('settingsMsg', '✅ Settings saved. Auto-save now active for every visitor.', 'success');
  refreshAutoSaveUi();
}

/* Toggle the big "Auto-save: ENABLED / DISABLED" pill in Settings AND the
 * warning banner shown above the Bookings list. We check site-config first
 * (the authoritative source for what visitors actually see) and fall back
 * to localStorage for legacy setups. */
function refreshAutoSaveUi() {
  const cfgTok = (siteConfigData.json && siteConfigData.json.public_form_token) || '';
  const hasToken = !!(cfgTok || localStorage.getItem(STORAGE_PUBLIC));

  const pill = document.getElementById('autoSaveStatus');
  const label = document.getElementById('autoSaveLabel');
  const emoji = document.getElementById('autoSaveEmoji');
  const desc = document.getElementById('autoSaveDesc');
  if (pill && label && emoji && desc) {
    pill.classList.toggle('is-on', hasToken);
    label.textContent = hasToken ? 'ENABLED' : 'DISABLED';
    emoji.textContent = hasToken ? '✅' : '⚠️';
    desc.innerHTML = hasToken
      ? 'Any customer booking form submission is saved instantly to <code>data/bookings.csv</code> with <strong>Pending</strong> status — it appears in the admin panel right away.'
      : 'Customer booking forms currently only go to WhatsApp. <strong>They will not appear in the admin panel automatically.</strong> Set the "Public Auto-Save Token" below so every new request is saved to <code>data/bookings.csv</code> instantly.';
  }

  const banner = document.getElementById('autoSaveBanner');
  if (banner) banner.style.display = hasToken ? 'none' : 'block';
}

/* ===========================================================================
 * SECTION 6 — SITE CONFIG (Theme, Branding, Contact)
 * =========================================================================== */
async function loadSiteConfig() {
  try {
    const res = await window.CsvAPI.loadJson(PATH_SITE_CONFIG, getToken());
    siteConfigData = { json: res.json || {}, sha: res.sha || null };
    if (!siteConfigData.json || !Object.keys(siteConfigData.json).length) {
      // Build default
      siteConfigData.json = buildDefaultSiteConfig();
    }

    // Sync the rest of the admin UI with the freshest config.
    // Even if site.js already loaded a cached/raw copy, the API copy is the
    // authoritative one — apply it now so colors/branding everywhere match.
    syncSiteConfigToRuntime(siteConfigData.json);

    populateThemeForm();
    populateBrandingForm();
    populateContactForm();
    populateSettingsForm();
    renderFestivalPresetGrid();
    refreshSliderUI();
    refreshPagesUI();
  } catch (err) {
    console.warn('[admin] site-config load failed:', err.message);
    siteConfigData = { json: buildDefaultSiteConfig(), sha: null };
    populateThemeForm();
    populateBrandingForm();
    populateContactForm();
    populateSettingsForm();
    renderFestivalPresetGrid();
    refreshSliderUI();
    refreshPagesUI();
  }
}

/* Re-prefill the Settings tab fields after site-config.json has been
 * fetched. bindSettingsEvents() runs before that, so without this the
 * Public Token field would stay blank for a fresh login session. */
function populateSettingsForm() {
  const tokInput = document.getElementById('publicToken');
  if (!tokInput) return;
  const cfgTok = (siteConfigData.json && siteConfigData.json.public_form_token) || '';
  // Only overwrite if the field is currently blank or holds the older
  // localStorage-only value — never clobber what the admin is mid-typing.
  if (!tokInput.value || tokInput.value === (localStorage.getItem(STORAGE_PUBLIC) || '')) {
    tokInput.value = cfgTok || localStorage.getItem(STORAGE_PUBLIC) || '';
  }
  refreshAutoSaveUi();
}

/* Push the given site config into the running page (window.SITE_CONFIG +
 * <html>/<body> theme styles + cached localStorage copy). */
function syncSiteConfigToRuntime(cfg) {
  if (!cfg) return;
  if (typeof applyConfigToWindow === 'function') applyConfigToWindow(cfg);
  if (typeof applyTheme === 'function') applyTheme(window.SITE_CONFIG.theme);
  if (typeof applyBranding === 'function') applyBranding();
  if (typeof insertFestivalBannerIfNeeded === 'function') insertFestivalBannerIfNeeded();
  try { localStorage.setItem('c4a_site_config_v1', JSON.stringify(cfg)); } catch (e) {}
}

function buildDefaultSiteConfig() {
  return {
    version: 2,
    updated_at: new Date().toISOString(),
    branding: {
      site_name: 'Call4All',
      tagline: 'One Call. Every Service. Done.',
      logo_url: 'Imagelogo.png',
      logo_height: 55
    },
    theme: { ...window.FESTIVAL_PRESETS.default, preset: 'default' },
    contact: {
      phone: '+917737353588', phone_display: '+91 7737353588',
      whatsapp: '917737353588', email: 'info@call4all.co.in',
      website: 'www.call4all.co.in', address: 'India'
    },
    footer: { about_text: window.SITE_CONFIG.aboutText || '' },
    slider: {
      enabled: true,
      interval_ms: 4500,
      slides: [...((window.SITE_CONFIG.slider && window.SITE_CONFIG.slider.slides) || [])]
    },
    pages: []
  };
}

async function saveSiteConfig(message) {
  const cfg = siteConfigData.json;
  cfg.updated_at = new Date().toISOString();
  cfg.version = (cfg.version || 1);
  const res = await window.CsvAPI.saveJson(PATH_SITE_CONFIG, cfg, siteConfigData.sha, getToken(), message || 'Update site-config.json');
  if (res && res.content && res.content.sha) siteConfigData.sha = res.content.sha;

  // Apply changes immediately to this admin tab AND store fresh cache so
  // any other tab on this browser (e.g. an open homepage) reads the new
  // theme on its next reload — not the stale CDN copy.
  syncSiteConfigToRuntime(cfg);
}

/* ===== THEME ===== */
function bindThemeEvents() {
  const form = document.getElementById('themeForm');
  if (!form) return;

  // Sync color pickers ↔ hex inputs + live preview
  ['primary','primary_dark','accent','accent_dark','background'].forEach(key => {
    const picker = document.getElementById('th_' + key);
    const hex = document.getElementById('th_' + key + '_hex');
    if (!picker || !hex) return;
    picker.addEventListener('input', () => {
      hex.value = picker.value;
      previewTheme();
    });
    hex.addEventListener('input', () => {
      if (/^#[0-9a-f]{6}$/i.test(hex.value)) {
        picker.value = hex.value;
        previewTheme();
      }
    });
  });
  document.getElementById('th_festival_overlay').addEventListener('change', previewTheme);
  document.getElementById('th_festival_banner').addEventListener('input', previewTheme);

  document.getElementById('themeResetBtn').addEventListener('click', () => {
    applyPresetToForm('default');
    previewTheme();
  });
  document.getElementById('themePreviewBtn').addEventListener('click', previewTheme);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Saving...';
    try {
      siteConfigData.json.theme = readThemeFromForm();
      await saveSiteConfig('Update theme');
      showMsg('themeMsg',
        '✅ Theme saved! You and other logged-in users will see the new theme immediately. ' +
        'Public visitors (logged out) may take ~5 minutes (GitHub CDN cache).',
        'success');
      previewTheme();
    } catch (err) {
      showMsg('themeMsg', '❌ ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false; submitBtn.textContent = '💾 Save Theme';
    }
  });
}

function populateThemeForm() {
  const t = (siteConfigData.json && siteConfigData.json.theme) || window.FESTIVAL_PRESETS.default;
  ['primary','primary_dark','accent','accent_dark','background'].forEach(key => {
    const picker = document.getElementById('th_' + key);
    const hex = document.getElementById('th_' + key + '_hex');
    if (picker && t[key]) picker.value = t[key];
    if (hex && t[key]) hex.value = t[key];
  });
  const overlay = document.getElementById('th_festival_overlay');
  if (overlay) overlay.value = t.festival_overlay || 'none';
  const banner = document.getElementById('th_festival_banner');
  if (banner) banner.value = t.festival_banner || '';
}

function readThemeFromForm() {
  const existing = (siteConfigData.json && siteConfigData.json.theme) || {};
  return {
    preset: existing.preset || 'custom',
    primary: document.getElementById('th_primary').value,
    primary_dark: document.getElementById('th_primary_dark').value,
    accent: document.getElementById('th_accent').value,
    accent_dark: document.getElementById('th_accent_dark').value,
    background: document.getElementById('th_background').value,
    festival_overlay: document.getElementById('th_festival_overlay').value,
    festival_banner: document.getElementById('th_festival_banner').value,
    // Preserve the preset's themed logo so saving Theme keeps logo in sync.
    logo: existing.logo
  };
}

function previewTheme() {
  if (typeof applyTheme === 'function') applyTheme(readThemeFromForm());
  // Also refresh festival banner on this page
  if (typeof insertFestivalBannerIfNeeded === 'function') {
    window.SITE_CONFIG.theme.festival_banner = document.getElementById('th_festival_banner').value;
    insertFestivalBannerIfNeeded();
  }
}

function renderFestivalPresetGrid() {
  const grid = document.getElementById('festivalPresetGrid');
  if (!grid) return;
  const current = (siteConfigData.json && siteConfigData.json.theme && siteConfigData.json.theme.preset) || 'default';
  const presets = window.FESTIVAL_PRESETS;
  grid.innerHTML = Object.keys(presets).map(key => {
    const p = presets[key];
    return `
      <div class="preset-card ${key === current ? 'active' : ''}" data-preset="${key}">
        <div class="preset-emoji">${p.emoji}</div>
        <div class="preset-name">${escapeHtml(p.label)}</div>
        <div class="preset-swatches">
          <div class="swatch" style="background:${p.primary}"></div>
          <div class="swatch" style="background:${p.accent}"></div>
          <div class="swatch" style="background:${p.background};border-color:#ccc;"></div>
        </div>
      </div>
    `;
  }).join('');
  grid.querySelectorAll('.preset-card').forEach(card => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      applyPresetToForm(card.dataset.preset);
      previewTheme();
    });
  });
}

function applyPresetToForm(presetKey) {
  const preset = window.FESTIVAL_PRESETS[presetKey];
  if (!preset) return;
  if (!siteConfigData.json) siteConfigData.json = buildDefaultSiteConfig();
  siteConfigData.json.theme = { ...preset, preset: presetKey };
  // Auto-sync the matching themed 3D logo whenever a preset is picked, so
  // admin doesn't have to also visit the Branding tab. Custom upload still
  // wins later because the upload writes branding.logo_url at save time.
  if (preset.logo) {
    siteConfigData.json.branding = siteConfigData.json.branding || {};
    siteConfigData.json.branding.logo_url = preset.logo;
    if (window.SITE_CONFIG) window.SITE_CONFIG.logoUrl = preset.logo;
  }
  populateThemeForm();
  // Re-render branding tab pieces (the logo grid + current preview) so the
  // newly-active logo shows even if user hasn't switched tabs.
  renderLogoStyleGrid();
  refreshCurrentLogoPreview();
  if (typeof applyBranding === 'function') applyBranding();
  if (typeof rerenderSiteShell === 'function') rerenderSiteShell();
}

/* ===== BRANDING ===== */
function bindBrandingEvents() {
  const form = document.getElementById('brandingForm');
  if (!form) return;

  const fileInput = document.getElementById('br_logo_file');
  const preview = document.getElementById('newLogoPreview');
  fileInput.addEventListener('change', () => {
    pendingLogoUpload = fileInput.files && fileInput.files[0];
    if (pendingLogoUpload) {
      const r = new FileReader();
      r.onload = () => { preview.src = r.result; preview.classList.add('show'); };
      r.readAsDataURL(pendingLogoUpload);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Saving...';
    try {
      const cfg = siteConfigData.json;
      cfg.branding = cfg.branding || {};
      cfg.branding.site_name = document.getElementById('br_site_name').value.trim() || 'Call4All';
      cfg.branding.tagline = document.getElementById('br_tagline').value.trim();
      cfg.branding.logo_height = parseInt(document.getElementById('br_logo_height').value, 10) || 55;
      cfg.footer = cfg.footer || {};
      cfg.footer.about_text = document.getElementById('br_about_text').value.trim();

      if (pendingLogoUpload) {
        const status = document.getElementById('logoUploadStatus');
        status.textContent = 'Uploading logo...'; status.classList.add('show');
        const { path } = await window.CsvAPI.uploadImage(pendingLogoUpload, getToken(), {
          folder: 'assets/uploads/',
          prefix: 'logo',
          maxWidth: 600,
          quality: 0.92,
          message: 'Upload new site logo'
        });
        cfg.branding.logo_url = path;
        status.textContent = '✅ Logo uploaded.';
        pendingLogoUpload = null;
        document.getElementById('currentLogoPreview').src = window.CsvAPI && path
          ? `https://raw.githubusercontent.com/${window.SITE_CONFIG.github.owner}/${window.SITE_CONFIG.github.repo}/${window.SITE_CONFIG.github.branch}/${path}`
          : path;
      }

      await saveSiteConfig('Update branding');
      showMsg('brandingMsg',
        '✅ Branding saved! Refresh the page to see the new logo/name in the header. ' +
        'There may be a ~5 minute CDN delay for public visitors.',
        'success');

      // If "auto-sync" is checked, also push this logo into all PWA icon files
      const autoSync = document.getElementById('appIconAutoSync');
      if (autoSync && autoSync.checked) {
        try {
          await syncLogoToPwaIcons();
        } catch (e) {
          showMsg('appIconMsg', '⚠️ Auto-sync of app icon failed: ' + e.message, 'error');
        }
      }
    } catch (err) {
      showMsg('brandingMsg', '❌ ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false; submitBtn.textContent = '💾 Save Branding';
    }
  });

  // ===== PWA App Icon controls =====
  const syncBtn = document.getElementById('appIconSyncBtn');
  const refreshPreviewBtn = document.getElementById('appIconRefreshPreviewBtn');
  const bgPicker = document.getElementById('appIconBg');
  const bgTransparent = document.getElementById('appIconTransparent');
  const useThemeBtn = document.getElementById('appIconUseTheme');

  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      syncBtn.disabled = true;
      const originalText = syncBtn.textContent;
      syncBtn.textContent = 'Syncing...';
      try {
        await syncLogoToPwaIcons();
      } catch (err) {
        showMsg('appIconMsg', '❌ ' + err.message, 'error');
      } finally {
        syncBtn.disabled = false; syncBtn.textContent = originalText;
      }
    });
  }
  if (refreshPreviewBtn) refreshPreviewBtn.addEventListener('click', refreshAppIconPreview);
  if (bgPicker) bgPicker.addEventListener('input', refreshAppIconPreview);
  if (bgTransparent) bgTransparent.addEventListener('change', () => {
    if (bgPicker) bgPicker.disabled = bgTransparent.checked;
    refreshAppIconPreview();
  });
  if (useThemeBtn) useThemeBtn.addEventListener('click', () => {
    const themeColor = (siteConfigData.json && siteConfigData.json.theme && siteConfigData.json.theme.primary) || '#1e3c72';
    if (bgPicker) { bgPicker.value = themeColor; bgPicker.disabled = false; }
    if (bgTransparent) bgTransparent.checked = false;
    refreshAppIconPreview();
  });
}

/* ===========================================================================
 * PWA APP ICON — auto-generate from current website logo
 * =========================================================================== */
const PWA_ICON_SIZES = [
  { size: 72,  path: 'assets/icons/icon-72.png',  maskable: false },
  { size: 96,  path: 'assets/icons/icon-96.png',  maskable: false },
  { size: 144, path: 'assets/icons/icon-144.png', maskable: false },
  { size: 152, path: 'assets/icons/icon-152.png', maskable: false },
  { size: 167, path: 'assets/icons/icon-167.png', maskable: false },
  { size: 180, path: 'assets/icons/icon-180.png', maskable: false },
  { size: 192, path: 'assets/icons/icon-192.png', maskable: false },
  { size: 512, path: 'assets/icons/icon-512.png', maskable: false },
  { size: 192, path: 'assets/icons/icon-maskable-192.png', maskable: true },
  { size: 512, path: 'assets/icons/icon-maskable-512.png', maskable: true },
  { size: 32,  path: 'assets/icons/favicon-32.png', maskable: false },
  { size: 16,  path: 'assets/icons/favicon-16.png', maskable: false }
];

function getAppIconBg() {
  const transparent = document.getElementById('appIconTransparent');
  if (transparent && transparent.checked) return 'transparent';
  const picker = document.getElementById('appIconBg');
  return (picker && picker.value) || '#ffffff';
}

function currentLogoUrl() {
  const b = (siteConfigData.json && siteConfigData.json.branding) || {};
  const url = b.logo_url || 'Imagelogo.png';
  if (url.startsWith('http')) return url;
  if (url.startsWith('assets/uploads/')) {
    return `https://raw.githubusercontent.com/${window.SITE_CONFIG.github.owner}/${window.SITE_CONFIG.github.repo}/${window.SITE_CONFIG.github.branch}/${url}`;
  }
  // Local file at site root (e.g. Imagelogo.png)
  return url;
}

function loadLogoForCanvas() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the logo image. Make sure a logo is saved in branding.'));
    const url = currentLogoUrl();
    img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
  });
}

function renderLogoToSquareCanvas(img, size, maskable) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const bg = getAppIconBg();
  if (bg === 'transparent') {
    ctx.clearRect(0, 0, size, size);
  } else {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
  }
  // Maskable icons need a safe zone — 20% padding all around so platform
  // shape masks (circles/squircles) don't cut into the logo.
  const paddingPct = maskable ? 0.20 : 0.08;
  const safeSize = size * (1 - 2 * paddingPct);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) throw new Error('Logo has zero dimensions.');
  const scale = Math.min(safeSize / iw, safeSize / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, dx, dy, dw, dh);
  return canvas;
}

function canvasToPngBase64(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas → PNG conversion failed.'));
      const r = new FileReader();
      r.onload = () => {
        const url = String(r.result || '');
        const idx = url.indexOf(',');
        resolve(idx >= 0 ? url.slice(idx + 1) : url);
      };
      r.onerror = () => reject(r.error || new Error('FileReader error'));
      r.readAsDataURL(blob);
    }, 'image/png');
  });
}

async function refreshAppIconPreview() {
  const canvas = document.getElementById('appIconPreview');
  if (!canvas) return;
  try {
    const img = await loadLogoForCanvas();
    const c = renderLogoToSquareCanvas(img, 192, false);
    const ctx = canvas.getContext('2d');
    canvas.width = 192; canvas.height = 192;
    ctx.clearRect(0, 0, 192, 192);
    ctx.drawImage(c, 0, 0);
  } catch (e) {
    const ctx = canvas.getContext('2d');
    canvas.width = 192; canvas.height = 192;
    ctx.fillStyle = '#fee';
    ctx.fillRect(0, 0, 192, 192);
    ctx.fillStyle = '#933';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Logo load failed', 96, 96);
  }
}

async function syncLogoToPwaIcons() {
  const progressEl = document.getElementById('appIconProgress');
  const msgEl = document.getElementById('appIconMsg');
  if (msgEl) { msgEl.className = 'form-message'; msgEl.textContent = ''; }

  const setProgress = (txt) => { if (progressEl) progressEl.textContent = txt; };

  setProgress('📥 Loading current logo...');
  const img = await loadLogoForCanvas();

  const total = PWA_ICON_SIZES.length;
  let done = 0;
  let failed = [];

  for (const spec of PWA_ICON_SIZES) {
    setProgress(`📤 Uploading ${spec.path} (${++done}/${total})...`);
    try {
      const canvas = renderLogoToSquareCanvas(img, spec.size, spec.maskable);
      const base64 = await canvasToPngBase64(canvas);
      const sha = await window.CsvAPI.getFileSha(spec.path, getToken());
      await window.CsvAPI.putFileBase64(spec.path, base64, sha, getToken(),
        `Sync PWA icon ${spec.path} from website logo`);
    } catch (e) {
      failed.push({ path: spec.path, error: e.message });
    }
  }

  if (failed.length === 0) {
    setProgress(`✅ All ${total} app icons updated successfully.`);
    showMsg('appIconMsg',
      `✅ ${total} PWA icons synced from the current website logo. ` +
      `New installs will see the new icon immediately. ` +
      `Already-installed users may need to reinstall the app on their phone to refresh the icon. ` +
      `Public CDN may take ~5 minutes.`,
      'success');
  } else {
    setProgress(`⚠️ Synced ${total - failed.length}/${total} icons — ${failed.length} failed.`);
    showMsg('appIconMsg',
      '⚠️ Some icons failed:\n' + failed.map(f => `• ${f.path}: ${f.error}`).join('\n'),
      'error');
  }
  await refreshAppIconPreview();
}

function populateBrandingForm() {
  const b = (siteConfigData.json && siteConfigData.json.branding) || {};
  const f = (siteConfigData.json && siteConfigData.json.footer) || {};
  document.getElementById('br_site_name').value = b.site_name || 'Call4All';
  document.getElementById('br_tagline').value = b.tagline || '';
  document.getElementById('br_logo_height').value = b.logo_height || 55;
  document.getElementById('br_about_text').value = f.about_text || '';
  refreshCurrentLogoPreview();
  renderLogoStyleGrid();
  // Refresh the PWA icon live preview from the current logo
  refreshAppIconPreview();
}

/* Re-render the small "Current Logo" thumbnail in branding tab so it always
 * matches whatever logo_url is in siteConfigData (uploaded file, themed SVG,
 * or 'auto-3d' inline svg). */
function refreshCurrentLogoPreview() {
  const box = document.getElementById('currentLogoPreviewBox');
  const img = document.getElementById('currentLogoPreview');
  if (!box) return;
  const b = (siteConfigData.json && siteConfigData.json.branding) || {};
  const url = b.logo_url || 'Imagelogo.png';
  if (url === 'auto-3d') {
    if (typeof renderAutoLogoSvg === 'function') {
      box.innerHTML = renderAutoLogoSvg({ size: 80 });
    } else if (img) {
      img.src = 'assets/icons/themed-logos/logo-3d-auto.svg';
    }
    return;
  }
  if (!img) {
    box.innerHTML = `<img id="currentLogoPreview" src="${url}" alt="Current logo" style="max-height:80px;max-width:100%;">`;
    return;
  }
  if (url.startsWith('assets/uploads/') && window.SITE_CONFIG && window.SITE_CONFIG.github) {
    img.src = `https://raw.githubusercontent.com/${window.SITE_CONFIG.github.owner}/${window.SITE_CONFIG.github.repo}/${window.SITE_CONFIG.github.branch}/${url}`;
  } else {
    img.src = url;
  }
}

/* Render the 3D Logo Style picker grid in the Branding tab.
 * Each card represents one of the themed SVG logos (or the special
 * inline "auto-3d" logo). Click selects that logo as the active site logo. */
const LOGO_STYLE_CHOICES = [
  { id: 'auto', file: 'auto-3d',                                           label: 'Auto 3D',       meta: 'Theme color follows live', badge: 'Recommended' },
  { id: 'default',     file: 'assets/icons/themed-logos/logo-3d-default.svg',     label: 'Default',       meta: 'Brand classic' },
  { id: 'resort',      file: 'assets/icons/themed-logos/logo-3d-resort.svg',      label: 'Resort',        meta: 'Calm green & gold' },
  { id: 'diwali',      file: 'assets/icons/themed-logos/logo-3d-diwali.svg',      label: 'Diwali',        meta: 'Festive lamps' },
  { id: 'holi',        file: 'assets/icons/themed-logos/logo-3d-holi.svg',        label: 'Holi',          meta: 'Color burst' },
  { id: 'christmas',   file: 'assets/icons/themed-logos/logo-3d-christmas.svg',   label: 'Christmas',     meta: 'Snow & spruce' },
  { id: 'eid',         file: 'assets/icons/themed-logos/logo-3d-eid.svg',         label: 'Eid',           meta: 'Crescent moon' },
  { id: 'independence',file: 'assets/icons/themed-logos/logo-3d-independence.svg',label: 'Independence',  meta: 'Tricolor pride' },
  { id: 'summer',      file: 'assets/icons/themed-logos/logo-3d-summer.svg',      label: 'Summer',        meta: 'Sun & ocean' }
];

function renderLogoStyleGrid() {
  const grid = document.getElementById('logoStyleGrid');
  if (!grid) return;
  const b = (siteConfigData.json && siteConfigData.json.branding) || {};
  const current = b.logo_url || '';

  grid.innerHTML = LOGO_STYLE_CHOICES.map(choice => {
    const isActive = (choice.file === current) ||
                     (choice.file === 'auto-3d' && current === 'auto-3d');
    const thumb = (choice.file === 'auto-3d')
      ? `<div class="lsc-thumb lsc-thumb-auto">${
          (typeof renderAutoLogoSvg === 'function')
            ? renderAutoLogoSvg({ size: 64 })
            : `<img src="assets/icons/themed-logos/logo-3d-auto.svg" alt="Auto 3D logo">`
        }</div>`
      : `<div class="lsc-thumb"><img src="${choice.file}" alt="${choice.label} logo"></div>`;
    return `
      <div class="logo-style-card ${isActive ? 'active' : ''}" data-logo-file="${choice.file}" data-logo-id="${choice.id}" role="button" tabindex="0" aria-pressed="${isActive}">
        ${thumb}
        <div class="lsc-name">${choice.label}</div>
        <div class="lsc-meta">${choice.meta}</div>
        ${choice.badge ? `<div class="lsc-badge">${choice.badge}</div>` : ''}
      </div>
    `;
  }).join('');

  const select = (file) => {
    siteConfigData.json = siteConfigData.json || buildDefaultSiteConfig();
    siteConfigData.json.branding = siteConfigData.json.branding || {};
    siteConfigData.json.branding.logo_url = file;
    grid.querySelectorAll('.logo-style-card').forEach(c => {
      const isActiveCard = c.dataset.logoFile === file;
      c.classList.toggle('active', isActiveCard);
      c.setAttribute('aria-pressed', isActiveCard ? 'true' : 'false');
    });
    refreshCurrentLogoPreview();
    if (window.SITE_CONFIG) {
      window.SITE_CONFIG.logoUrl = file;
      if (typeof applyBranding === 'function') applyBranding();
      if (typeof rerenderSiteShell === 'function') rerenderSiteShell();
    }
    showMsg('brandingMsg',
      'Logo style selected. Click "💾 Save Branding" to make it live for everyone.',
      'success');
  };

  grid.querySelectorAll('.logo-style-card').forEach(card => {
    card.addEventListener('click', () => select(card.dataset.logoFile));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select(card.dataset.logoFile);
      }
    });
  });
}

/* ===== CONTACT ===== */
function bindContactEvents() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Saving...';
    try {
      const cfg = siteConfigData.json;
      cfg.contact = cfg.contact || {};
      cfg.contact.phone = document.getElementById('ct_phone').value.trim();
      cfg.contact.phone_display = document.getElementById('ct_phone_display').value.trim();
      cfg.contact.whatsapp = document.getElementById('ct_whatsapp').value.trim().replace(/\D/g, '');
      cfg.contact.email = document.getElementById('ct_email').value.trim();
      cfg.contact.website = document.getElementById('ct_website').value.trim();
      cfg.contact.address = document.getElementById('ct_address').value.trim();
      await saveSiteConfig('Update contact info');
      showMsg('contactMsg',
        '✅ Contact info saved! Applied instantly in your browser. ' +
        'Public visitors may take ~5 minutes (CDN cache).',
        'success');
    } catch (err) {
      showMsg('contactMsg', '❌ ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false; submitBtn.textContent = '💾 Save Contact Info';
    }
  });
}

function populateContactForm() {
  const c = (siteConfigData.json && siteConfigData.json.contact) || {};
  document.getElementById('ct_phone').value = c.phone || '';
  document.getElementById('ct_phone_display').value = c.phone_display || '';
  document.getElementById('ct_whatsapp').value = c.whatsapp || '';
  document.getElementById('ct_email').value = c.email || '';
  document.getElementById('ct_website').value = c.website || '';
  document.getElementById('ct_address').value = c.address || '';
}

/* ===========================================================================
 * SECTION 7 — GALLERY
 * =========================================================================== */
function bindGalleryEvents() {
  const addBtn = document.getElementById('addGalleryBtn');
  if (!addBtn) return;
  addBtn.addEventListener('click', () => openGalleryModal(null));
  document.getElementById('refreshGalleryBtn').addEventListener('click', loadGallery);
  document.getElementById('gallerySearchInput').addEventListener('input', renderGalleryAdminGrid);
  document.getElementById('galleryCategoryFilter').addEventListener('change', renderGalleryAdminGrid);
  document.getElementById('galleryForm').addEventListener('submit', handleSaveGallery);
  document.getElementById('galleryModalCloseBtn').addEventListener('click', closeGalleryModal);
  document.getElementById('galleryModalCancelBtn').addEventListener('click', closeGalleryModal);

  const fileInput = document.getElementById('gal_file');
  const preview = document.getElementById('galleryPreview');
  fileInput.addEventListener('change', () => {
    pendingGalleryUpload = fileInput.files && fileInput.files[0];
    if (pendingGalleryUpload) {
      const r = new FileReader();
      r.onload = () => { preview.src = r.result; preview.classList.add('show'); };
      r.readAsDataURL(pendingGalleryUpload);
    }
  });
}

async function loadGallery() {
  const grid = document.getElementById('galleryAdminGrid');
  if (!grid) return;
  grid.innerHTML = '<p style="text-align:center;padding:30px;color:var(--text-light);">Loading...</p>';
  try {
    galleryData = await window.CsvAPI.loadAll(getToken(), PATH_GALLERY);
    if (!galleryData.headers.length) galleryData.headers = defaultHeaders(PATH_GALLERY);
    document.getElementById('badgeGallery').textContent = galleryData.items.length;
    populateGalleryFilters();
    renderGalleryAdminGrid();
  } catch (err) {
    grid.innerHTML = `<p style="text-align:center;padding:30px;color:#dc3545;">❌ ${escapeHtml(err.message)}</p>`;
  }
}

function populateGalleryFilters() {
  const filter = document.getElementById('galleryCategoryFilter');
  if (!filter) return;
  const services = window.SITE_CONFIG.services;
  filter.innerHTML = '<option value="">All Categories</option>' +
    services.map(s => `<option value="${escapeAttr(s.name)}">${s.icon} ${escapeHtml(s.name)}</option>`).join('');
}

function renderGalleryAdminGrid() {
  const grid = document.getElementById('galleryAdminGrid');
  if (!grid) return;
  const search = (document.getElementById('gallerySearchInput').value || '').toLowerCase().trim();
  const cat = document.getElementById('galleryCategoryFilter').value;

  let items = [...galleryData.items];
  items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  if (cat) items = items.filter(i => i.category === cat);
  if (search) items = items.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(search)));

  if (!items.length) {
    grid.innerHTML = '<div class="empty-state"><div class="icon">🖼️</div><div>No images yet. Click ➕ Upload Image to add.</div></div>';
    return;
  }

  const cfg = window.SITE_CONFIG;
  const cards = items.map(it => {
    const fullUrl = it.image_path && it.image_path.startsWith('assets/uploads/')
      ? `https://raw.githubusercontent.com/${cfg.github.owner}/${cfg.github.repo}/${cfg.github.branch}/${it.image_path}`
      : it.image_path;
    return `
      <div class="gallery-card">
        <span class="cat-pill">${escapeHtml(it.category || '-')}</span>
        <img class="thumb" src="${escapeAttr(fullUrl)}" alt="${escapeAttr(it.title)}" loading="lazy" onerror="this.style.opacity=0.3;">
        <div class="info">
          <h4>${escapeHtml(it.title || '(untitled)')}</h4>
          ${it.description ? `<p>${escapeHtml(it.description)}</p>` : ''}
          <p style="font-size:11px;color:#888;margin-top:6px;">
            ${String(it.featured).toLowerCase() === 'true' ? '⭐ Featured · ' : ''}
            ${escapeHtml(it.status || 'Active')}
          </p>
          <div class="actions" style="margin-top:8px;">
            <button class="btn btn-primary btn-sm" onclick="openGalleryModal('${escapeAttr(it.id)}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteGallery('${escapeAttr(it.id)}')">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.innerHTML = `<div class="gallery-grid">${cards}</div>`;
}

function openGalleryModal(id) {
  editingGalleryId = id;
  pendingGalleryUpload = null;
  const modal = document.getElementById('galleryModal');
  const form = document.getElementById('galleryForm');
  const title = document.getElementById('galleryModalTitle');
  const fileNote = document.getElementById('galleryFileNote');
  const preview = document.getElementById('galleryPreview');
  preview.classList.remove('show');
  preview.src = '';

  // Populate category dropdown
  const services = window.SITE_CONFIG.services;
  document.getElementById('gal_category').innerHTML =
    services.map(s => `<option value="${escapeAttr(s.name)}">${s.icon} ${escapeHtml(s.name)}</option>`).join('');

  if (id) {
    const item = galleryData.items.find(i => i.id === id);
    if (!item) { alert('Image not found.'); return; }
    title.textContent = 'Edit Image - ' + (item.title || id);
    fileNote.textContent = '(leave empty to keep existing image)';
    form.id_field.value = item.id;
    form.timestamp_field.value = item.timestamp;
    form.image_path_existing.value = item.image_path || '';
    form.added_by.value = item.added_by || (localStorage.getItem(STORAGE_USER) || 'admin');
    form.category.value = item.category || '';
    form.title.value = item.title || '';
    form.description.value = item.description || '';
    form.sort_order.value = item.sort_order || '0';
    form.featured.value = String(item.featured || 'false').toLowerCase() === 'true' ? 'true' : 'false';
    form.status.value = item.status || 'Active';
    document.getElementById('gal_file').value = '';
  } else {
    title.textContent = 'Upload New Image';
    fileNote.textContent = '*';
    form.reset();
    form.id_field.value = genId('IMG');
    form.timestamp_field.value = new Date().toISOString();
    form.image_path_existing.value = '';
    form.added_by.value = localStorage.getItem(STORAGE_USER) || 'admin';
    form.status.value = 'Active';
    form.featured.value = 'false';
    form.sort_order.value = '0';
  }
  modal.classList.add('show');
}

function closeGalleryModal() {
  document.getElementById('galleryModal').classList.remove('show');
  editingGalleryId = null;
  pendingGalleryUpload = null;
}

async function handleSaveGallery(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const status = document.getElementById('galleryUploadStatus');
  submitBtn.disabled = true; submitBtn.textContent = 'Saving...';

  try {
    let imagePath = form.image_path_existing.value;

    if (pendingGalleryUpload) {
      status.textContent = 'Uploading image (compressing)...';
      status.classList.add('show');
      const { path } = await window.CsvAPI.uploadImage(pendingGalleryUpload, getToken(), {
        folder: 'assets/uploads/',
        prefix: 'gal-' + (form.category.value || 'misc').toLowerCase().replace(/\s+/g, '-'),
        maxWidth: 1400,
        quality: 0.82,
        message: 'Upload gallery image'
      });
      imagePath = path;
      status.textContent = '✅ Image uploaded.';
    } else if (!imagePath) {
      throw new Error('Please select an image file.');
    }

    const row = {
      id: form.id_field.value,
      timestamp: form.timestamp_field.value,
      category: form.category.value,
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      image_path: imagePath,
      featured: form.featured.value,
      sort_order: form.sort_order.value || '0',
      status: form.status.value,
      added_by: form.added_by.value || 'admin'
    };

    let items = [...galleryData.items];
    if (editingGalleryId) {
      const idx = items.findIndex(i => i.id === editingGalleryId);
      if (idx >= 0) items[idx] = row; else items.push(row);
    } else {
      items.push(row);
    }
    await window.CsvAPI.saveAll(defaultHeaders(PATH_GALLERY), items, galleryData.sha, getToken(),
      editingGalleryId ? `Update gallery item ${row.id}` : `Add gallery item ${row.id}`, PATH_GALLERY);
    closeGalleryModal();
    await loadGallery();
  } catch (err) {
    status.textContent = '';
    alert('Save failed: ' + err.message);
  } finally {
    submitBtn.disabled = false; submitBtn.textContent = '💾 Save Image';
  }
}

async function deleteGallery(id) {
  const item = galleryData.items.find(i => i.id === id);
  if (!item) return;
  if (!confirm(`Delete image "${item.title || id}"? This cannot be undone.\n\n(Note: actual image file in repo will remain.)`)) return;
  try {
    const items = galleryData.items.filter(i => i.id !== id);
    await window.CsvAPI.saveAll(defaultHeaders(PATH_GALLERY), items, galleryData.sha, getToken(),
      `Delete gallery item ${id}`, PATH_GALLERY);
    await loadGallery();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
}

/* ===========================================================================
 * SECTION — HERO SLIDER (admin-managed slides in site-config.json)
 * =========================================================================== */
let editingSlideId = null;
let pendingSlideBgUpload = null;

function ensureSliderConfig() {
  if (!siteConfigData.json) siteConfigData.json = buildDefaultSiteConfig();
  if (!siteConfigData.json.slider) {
    siteConfigData.json.slider = { enabled: true, interval_ms: 4500, slides: [] };
  }
  if (!Array.isArray(siteConfigData.json.slider.slides)) siteConfigData.json.slider.slides = [];
  return siteConfigData.json.slider;
}

function bindSliderEvents() {
  const addBtn = document.getElementById('addSlideBtn');
  const refreshBtn = document.getElementById('refreshSliderBtn');
  const saveCfgBtn = document.getElementById('saveSliderConfigBtn');
  const closeBtn = document.getElementById('slideModalCloseBtn');
  const cancelBtn = document.getElementById('slideCancelBtn');
  const form = document.getElementById('slideForm');
  const fileInput = document.getElementById('slideBgFile');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => openSlideModal(null));
  refreshBtn.addEventListener('click', loadSiteConfig);
  saveCfgBtn.addEventListener('click', saveSliderTopLevel);
  closeBtn.addEventListener('click', closeSlideModal);
  cancelBtn.addEventListener('click', closeSlideModal);
  form.addEventListener('submit', handleSaveSlide);

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById('slideBgPreview');
    if (!file) { pendingSlideBgUpload = null; preview.innerHTML = ''; return; }
    pendingSlideBgUpload = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.innerHTML = `<img src="${ev.target.result}" alt="preview" style="max-width:100%;max-height:200px;border-radius:8px;border:2px solid #e1e5eb;">`;
    };
    reader.readAsDataURL(file);
  });
}

function refreshSliderUI() {
  const slider = ensureSliderConfig();
  const enabledChk = document.getElementById('sliderEnabledChk');
  const intervalInput = document.getElementById('sliderIntervalInput');
  const badge = document.getElementById('badgeSlider');
  if (enabledChk) enabledChk.checked = slider.enabled !== false;
  if (intervalInput) intervalInput.value = Number(slider.interval_ms) || 4500;
  if (badge) badge.textContent = slider.slides.length;
  renderSliderTable();
}

function renderSliderTable() {
  const tbody = document.getElementById('sliderTableBody');
  if (!tbody) return;
  const slides = ensureSliderConfig().slides
    .slice()
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

  if (!slides.length) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><div class="icon">🎞️</div><div>No slides yet. Click <strong>Add Slide</strong> to create the first one.</div></div></td></tr>';
    return;
  }

  tbody.innerHTML = slides.map((s, i) => {
    const bgPreview = s.background_url
      ? `<img src="${escapeAttr(typeof window.assetUrl === 'function' ? window.assetUrl(s.background_url) : s.background_url)}" alt="bg" style="width:60px;height:34px;object-fit:cover;border-radius:4px;">`
      : '<span style="color:#999;">—</span>';
    const linkDisplay = s.link
      ? `<a href="${escapeAttr(s.link)}" target="_blank" style="font-size:12px;">${escapeHtml(s.link)}</a>`
      : '<span style="color:#999;">—</span>';
    return `
      <tr>
        <td>${i + 1}</td>
        <td style="font-size:22px;text-align:center;">${escapeHtml(s.icon || '')}</td>
        <td><strong>${escapeHtml(s.title || '')}</strong></td>
        <td class="msg-cell">${escapeHtml(s.subtitle || '')}</td>
        <td>${bgPreview}</td>
        <td>${linkDisplay}</td>
        <td style="text-align:center;">
          ${s.enabled !== false
            ? '<span class="status-badge status-complete">Enabled</span>'
            : '<span class="status-badge status-cancelled">Disabled</span>'}
        </td>
        <td>${escapeHtml(String(s.order || ''))}</td>
        <td>
          <div class="actions">
            <button class="btn btn-primary btn-sm" onclick="openSlideModal('${escapeAttr(s.id)}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSlide('${escapeAttr(s.id)}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openSlideModal(id) {
  editingSlideId = id;
  pendingSlideBgUpload = null;
  const form = document.getElementById('slideForm');
  form.reset();
  document.getElementById('slideBgPreview').innerHTML = '';
  const titleEl = document.getElementById('slideModalTitle');
  if (id) {
    const slide = ensureSliderConfig().slides.find(s => s.id === id);
    if (!slide) { alert('Slide not found.'); return; }
    titleEl.textContent = '✏️ Edit Slide';
    form.id_field.value = slide.id;
    form.icon.value = slide.icon || '';
    form.title.value = slide.title || '';
    form.subtitle.value = slide.subtitle || '';
    form.link.value = slide.link || '';
    form.order.value = slide.order || 100;
    form.enabled.checked = slide.enabled !== false;
    if (slide.background_url) {
      const url = typeof window.assetUrl === 'function' ? window.assetUrl(slide.background_url) : slide.background_url;
      document.getElementById('slideBgPreview').innerHTML =
        `<img src="${escapeAttr(url)}" style="max-width:100%;max-height:200px;border-radius:8px;border:2px solid #e1e5eb;">
         <p class="help-text">Current background. Upload a new file to replace.</p>`;
    }
  } else {
    titleEl.textContent = '➕ Add Slide';
    form.id_field.value = '';
    form.order.value = (ensureSliderConfig().slides.length + 1) * 1;
    form.enabled.checked = true;
  }
  document.getElementById('slideModal').classList.add('show');
}

function closeSlideModal() {
  document.getElementById('slideModal').classList.remove('show');
  editingSlideId = null;
  pendingSlideBgUpload = null;
}

async function handleSaveSlide(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true; submitBtn.textContent = 'Saving...';

  const slider = ensureSliderConfig();
  const id = form.id_field.value || ('s' + Date.now());
  let slide = slider.slides.find(s => s.id === id);
  const isNew = !slide;
  if (!slide) {
    slide = { id };
    slider.slides.push(slide);
  }
  slide.icon = form.icon.value.trim();
  slide.title = form.title.value.trim();
  slide.subtitle = form.subtitle.value.trim();
  slide.link = form.link.value.trim();
  slide.order = Number(form.order.value) || 100;
  slide.enabled = !!form.enabled.checked;

  try {
    if (pendingSlideBgUpload) {
      const { path } = await window.CsvAPI.uploadImage(pendingSlideBgUpload, getToken(), {
        prefix: 'slide-bg',
        maxWidth: 1600,
        quality: 0.85,
        message: `Upload slide background for ${slide.title || slide.id}`
      });
      slide.background_url = path;
    }
    await saveSiteConfig(`Slider: ${isNew ? 'add' : 'update'} slide ${slide.title}`);
    closeSlideModal();
    refreshSliderUI();
    alert('✅ Slide saved. Public visitors may take ~5 minutes (CDN cache).');
  } catch (err) {
    alert('Save failed: ' + err.message);
    submitBtn.disabled = false; submitBtn.textContent = '💾 Save Slide';
  }
}

async function deleteSlide(id) {
  if (!confirm('Delete this slide?')) return;
  const slider = ensureSliderConfig();
  slider.slides = slider.slides.filter(s => s.id !== id);
  try {
    await saveSiteConfig(`Slider: delete slide ${id}`);
    refreshSliderUI();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
}

async function saveSliderTopLevel() {
  const slider = ensureSliderConfig();
  const enabledChk = document.getElementById('sliderEnabledChk');
  const intervalInput = document.getElementById('sliderIntervalInput');
  slider.enabled = !!enabledChk.checked;
  slider.interval_ms = Math.max(2000, Number(intervalInput.value) || 4500);
  const btn = document.getElementById('saveSliderConfigBtn');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    await saveSiteConfig('Slider: update top-level settings');
    btn.textContent = '✅ Saved';
    setTimeout(() => { btn.textContent = '💾 Save Slider Settings'; btn.disabled = false; }, 1800);
  } catch (err) {
    alert('Save failed: ' + err.message);
    btn.textContent = '💾 Save Slider Settings'; btn.disabled = false;
  }
}

/* ===========================================================================
 * SECTION — CUSTOM PAGES (admin-managed pages stored in site-config.json)
 * =========================================================================== */
let editingPageId = null;

function ensurePagesArray() {
  if (!siteConfigData.json) siteConfigData.json = buildDefaultSiteConfig();
  if (!Array.isArray(siteConfigData.json.pages)) siteConfigData.json.pages = [];
  return siteConfigData.json.pages;
}

function bindPagesEvents() {
  const addBtn = document.getElementById('addPageBtn');
  const refreshBtn = document.getElementById('refreshPagesBtn');
  const search = document.getElementById('pagesSearchInput');
  const closeBtn = document.getElementById('pageModalCloseBtn');
  const cancelBtn = document.getElementById('pageCancelBtn');
  const form = document.getElementById('pageForm');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => openPageModal(null));
  refreshBtn.addEventListener('click', loadSiteConfig);
  if (search) search.addEventListener('input', renderPagesTable);
  closeBtn.addEventListener('click', closePageModal);
  cancelBtn.addEventListener('click', closePageModal);
  form.addEventListener('submit', handleSavePage);

  // Auto-generate slug from title if user hasn't typed one yet
  const titleInput = form.querySelector('input[name="title"]');
  const slugInput = form.querySelector('input[name="slug"]');
  titleInput.addEventListener('input', () => {
    if (!slugInput.dataset.touched) {
      slugInput.value = slugify(titleInput.value);
    }
  });
  slugInput.addEventListener('input', () => { slugInput.dataset.touched = '1'; });
}

function slugify(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function refreshPagesUI() {
  const badge = document.getElementById('badgePages');
  const pages = ensurePagesArray();
  if (badge) badge.textContent = pages.length;
  renderPagesTable();
}

function renderPagesTable() {
  const tbody = document.getElementById('pagesTableBody');
  if (!tbody) return;
  const search = (document.getElementById('pagesSearchInput') || { value: '' }).value.toLowerCase().trim();

  let pages = ensurePagesArray().slice()
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  if (search) {
    pages = pages.filter(p =>
      [p.title, p.slug, p.nav_label].some(v => String(v || '').toLowerCase().includes(search))
    );
  }

  if (!pages.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="icon">📄</div><div>No custom pages yet. Click <strong>Add New Page</strong> to create one.</div></div></td></tr>';
    return;
  }

  tbody.innerHTML = pages.map(p => {
    const updated = p.updated_at ? formatDate(p.updated_at) : '-';
    return `
      <tr>
        <td><strong>${escapeHtml(p.title || '')}</strong></td>
        <td>
          <code style="font-size:12px;">${escapeHtml(p.slug || '')}</code><br>
          <a href="page.html?slug=${encodeURIComponent(p.slug || '')}" target="_blank" style="font-size:11px;">🔗 View</a>
        </td>
        <td style="text-align:center;">${p.show_in_menu ? '✅' : '—'}</td>
        <td>${escapeHtml(String(p.order || ''))}</td>
        <td>
          ${p.enabled !== false
            ? '<span class="status-badge status-complete">Enabled</span>'
            : '<span class="status-badge status-cancelled">Disabled</span>'}
        </td>
        <td style="font-size:12px;">${escapeHtml(updated)}</td>
        <td>
          <div class="actions">
            <button class="btn btn-primary btn-sm" onclick="openPageModal('${escapeAttr(p.id)}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deletePage('${escapeAttr(p.id)}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openPageModal(id) {
  editingPageId = id;
  const form = document.getElementById('pageForm');
  form.reset();
  delete form.querySelector('input[name="slug"]').dataset.touched;
  const titleEl = document.getElementById('pageModalTitle');
  if (id) {
    const page = ensurePagesArray().find(p => p.id === id);
    if (!page) { alert('Page not found.'); return; }
    titleEl.textContent = '✏️ Edit Page';
    form.id_field.value = page.id;
    form.created_at_field.value = page.created_at || '';
    form.title.value = page.title || '';
    form.slug.value = page.slug || '';
    form.nav_label.value = page.nav_label || '';
    form.order.value = page.order || 100;
    form.meta_description.value = page.meta_description || '';
    form.html_content.value = page.html_content || '';
    form.show_in_menu.checked = !!page.show_in_menu;
    form.enabled.checked = page.enabled !== false;
    form.querySelector('input[name="slug"]').dataset.touched = '1';
  } else {
    titleEl.textContent = '➕ Add New Page';
    form.id_field.value = '';
    form.created_at_field.value = '';
    form.order.value = (ensurePagesArray().length + 1) * 10;
    form.show_in_menu.checked = false;
    form.enabled.checked = true;
  }
  document.getElementById('pageModal').classList.add('show');
}

function closePageModal() {
  document.getElementById('pageModal').classList.remove('show');
  editingPageId = null;
}

async function handleSavePage(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const slugVal = slugify(form.slug.value);
  if (!slugVal) { alert('Please enter a valid slug (a-z, 0-9, dashes).'); return; }

  const pages = ensurePagesArray();
  // Slug must be unique
  const dup = pages.find(p => p.slug === slugVal && p.id !== form.id_field.value);
  if (dup) { alert(`A page with slug "${slugVal}" already exists. Choose a different slug.`); return; }

  submitBtn.disabled = true; submitBtn.textContent = 'Saving...';

  const id = form.id_field.value || ('p' + Date.now());
  let page = pages.find(p => p.id === id);
  const isNew = !page;
  if (!page) {
    page = { id, created_at: new Date().toISOString() };
    pages.push(page);
  }
  page.title = form.title.value.trim();
  page.slug = slugVal;
  page.nav_label = form.nav_label.value.trim();
  page.meta_description = form.meta_description.value.trim();
  page.html_content = form.html_content.value;
  page.show_in_menu = !!form.show_in_menu.checked;
  page.enabled = !!form.enabled.checked;
  page.order = Number(form.order.value) || 100;
  page.updated_at = new Date().toISOString();
  if (!page.created_at) page.created_at = form.created_at_field.value || new Date().toISOString();

  try {
    await saveSiteConfig(`Pages: ${isNew ? 'create' : 'update'} "${page.title}"`);
    try {
      await regenerateSitemap({ silent: true });
    } catch (sitemapErr) {
      console.warn('[sitemap] auto-regen after page save:', sitemapErr.message);
    }
    closePageModal();
    refreshPagesUI();
    alert(`✅ Page saved. View it at:\npage.html?slug=${page.slug}\n\nSitemap.xml was updated automatically.\nPublic visitors may take ~5 minutes (CDN cache).`);
  } catch (err) {
    alert('Save failed: ' + err.message);
    submitBtn.disabled = false; submitBtn.textContent = '💾 Save Page';
  }
}

async function deletePage(id) {
  const page = ensurePagesArray().find(p => p.id === id);
  if (!page) return;
  if (!confirm(`Delete page "${page.title}"?\nSlug: ${page.slug}\n\nThis cannot be undone.`)) return;
  siteConfigData.json.pages = ensurePagesArray().filter(p => p.id !== id);
  try {
    await saveSiteConfig(`Pages: delete "${page.title}"`);
    try {
      await regenerateSitemap({ silent: true });
    } catch (sitemapErr) {
      console.warn('[sitemap] auto-regen after page delete:', sitemapErr.message);
    }
    refreshPagesUI();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
}
