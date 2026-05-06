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

let bookingsData = { headers: [], items: [], sha: null };
let sourcesData = { headers: [], items: [], sha: null };
let staffData = { headers: [], items: [], sha: null };
let areasData = { headers: [], items: [], sha: null };

let editingBookingId = null;
let editingSourceId = null;
let editingStaffId = null;
let editingAreaId = null;

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
      if (!verify.ok) throw new Error('Invalid GitHub token. Check the token and try again.');

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
  bindBookingEvents();
  bindSourceEvents();
  bindStaffEvents();
  bindAreaEvents();
  bindSettingsEvents();

  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);

  loadAllSections();
}

function setupTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
}
function switchTab(tabName) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tabName));
}

async function loadAllSections() {
  loadBookings();
  loadSources();
  loadStaff();
  loadAreas();
}

/* ===========================================================================
 * SECTION 1 — BOOKINGS
 * =========================================================================== */
function bindBookingEvents() {
  document.getElementById('refreshBtn').addEventListener('click', loadBookings);
  document.getElementById('addNewBtn').addEventListener('click', () => openBookingModal(null));
  document.getElementById('exportBtn').addEventListener('click', exportBookingsCsv);
  document.getElementById('searchInput').addEventListener('input', renderBookingsTable);
  document.getElementById('statusFilter').addEventListener('change', renderBookingsTable);
  document.getElementById('editForm').addEventListener('submit', handleSaveBooking);
  document.getElementById('modalCloseBtn').addEventListener('click', closeBookingModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeBookingModal);
}

async function loadBookings() {
  const tbody = document.getElementById('bookingsBody');
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;">Loading...</td></tr>';
  try {
    bookingsData = await window.CsvAPI.loadAll(getToken(), PATH_BOOKINGS);
    if (!bookingsData.headers.length) bookingsData.headers = defaultHeaders(PATH_BOOKINGS);
    updateBookingsStats();
    renderBookingsTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:#dc3545;">❌ ${escapeHtml(err.message)}</td></tr>`;
  }
}

function updateBookingsStats() {
  const items = bookingsData.items;
  document.getElementById('statTotal').textContent = items.length;
  document.getElementById('statNew').textContent = items.filter(i => (i.status || '').toLowerCase() === 'new').length;
  document.getElementById('statContacted').textContent = items.filter(i => (i.status || '').toLowerCase() === 'contacted').length;
  document.getElementById('statCompleted').textContent = items.filter(i => (i.status || '').toLowerCase() === 'completed').length;
  document.getElementById('badgeBookings').textContent = items.length;
}

function renderBookingsTable() {
  const tbody = document.getElementById('bookingsBody');
  const search = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('statusFilter').value;

  let items = [...bookingsData.items];
  items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  if (statusFilter) items = items.filter(i => (i.status || '').toLowerCase() === statusFilter.toLowerCase());
  if (search) items = items.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(search)));

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><div class="icon">📭</div><div>No bookings found.</div></div></td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => {
    const cityArea = [item.city, item.area].filter(Boolean).join(' / ');
    const phoneClean = (item.phone || '').replace(/[^0-9]/g, '');
    return `
      <tr>
        <td><strong>${escapeHtml(item.id)}</strong></td>
        <td>${formatDate(item.timestamp)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td><a href="tel:${escapeAttr(item.phone)}">${escapeHtml(item.phone)}</a><br>
            <a href="https://wa.me/${phoneClean}" target="_blank" style="font-size:12px;">💬 WhatsApp</a></td>
        <td>${escapeHtml(item.service)}</td>
        <td>${escapeHtml(cityArea || (item.location || '-'))}</td>
        <td class="msg-cell">${escapeHtml(item.address || '-')}</td>
        <td class="msg-cell">${escapeHtml(item.message)}</td>
        <td>
          <span class="status-badge status-${(item.status || 'new').toLowerCase()}">${escapeHtml(item.status || 'New')}</span>
          <div class="actions" style="margin-top:6px;">
            <button class="btn btn-primary btn-sm" onclick="openBookingModal('${escapeAttr(item.id)}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteBooking('${escapeAttr(item.id)}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
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

  if (id) {
    const item = bookingsData.items.find(i => i.id === id);
    if (!item) { alert('Booking not found.'); return; }
    title.textContent = 'Edit Booking - ' + id;
    form.id_field.value = item.id;
    form.timestamp_field.value = item.timestamp;
    form.name.value = item.name || '';
    form.phone.value = item.phone || '';
    form.service.value = item.service || '';
    form.city.value = item.city || item.location || '';
    form.area.value = item.area || '';
    form.address.value = item.address || '';
    form.message.value = item.message || '';
    form.status.value = item.status || 'New';
  } else {
    title.textContent = 'Add New Booking';
    form.reset();
    form.id_field.value = genId('BK');
    form.timestamp_field.value = new Date().toISOString();
    form.status.value = 'New';
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
    status: form.status.value
  };

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
 * SECTION 5 — SETTINGS
 * =========================================================================== */
function bindSettingsEvents() {
  document.getElementById('settingsForm').addEventListener('submit', handleSaveSettings);
  document.getElementById('settingsCloseBtn').addEventListener('click', closeSettingsModal);
  document.getElementById('settingsCancelBtn').addEventListener('click', closeSettingsModal);
  document.getElementById('clearPublicBtn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_PUBLIC);
    document.getElementById('publicToken').value = '';
    showMsg('settingsMsg', 'Public token cleared. Forms will only send via WhatsApp.', 'info');
  });
  document.getElementById('clearPassBtn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_PASS_HASH);
    showMsg('settingsMsg', 'Admin password cleared.', 'info');
  });
}

function openSettingsModal() {
  document.getElementById('publicToken').value = localStorage.getItem(STORAGE_PUBLIC) || '';
  document.getElementById('newAdminPass').value = '';
  document.getElementById('settingsMsg').className = 'form-message';
  document.getElementById('settingsMsg').textContent = '';
  document.getElementById('settingsModal').classList.add('show');
}
function closeSettingsModal() {
  document.getElementById('settingsModal').classList.remove('show');
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const form = e.target;
  const publicTok = form.publicToken.value.trim();
  const newPass = form.newAdminPass.value;
  if (publicTok) localStorage.setItem(STORAGE_PUBLIC, publicTok);
  if (newPass) {
    const hash = await sha256(newPass);
    localStorage.setItem(STORAGE_PASS_HASH, hash);
  }
  showMsg('settingsMsg', '✅ Settings saved on this browser.', 'success');
}
