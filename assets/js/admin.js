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
  setupSidebarToggle();
  bindBookingEvents();
  bindSourceEvents();
  bindStaffEvents();
  bindAreaEvents();
  bindGalleryEvents();
  bindThemeEvents();
  bindBrandingEvents();
  bindContactEvents();
  bindSettingsEvents();

  document.getElementById('logoutBtn').addEventListener('click', logout);

  loadAllSections();
  loadSiteConfig();
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
  // Lazy-load section data on first activation
  if (tabName === 'gallery' && (!galleryData.items || !galleryData.items.length)) loadGallery();
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
 * SECTION 5 — SETTINGS (now a tab, not a modal)
 * =========================================================================== */
function bindSettingsEvents() {
  const form = document.getElementById('settingsForm');
  if (!form) return;
  form.addEventListener('submit', handleSaveSettings);
  // Pre-fill on load
  document.getElementById('publicToken').value = localStorage.getItem(STORAGE_PUBLIC) || '';

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

async function handleSaveSettings(e) {
  e.preventDefault();
  const form = e.target;
  const publicTok = form.publicToken.value.trim();
  const newPass = form.newAdminPass.value;
  if (publicTok) localStorage.setItem(STORAGE_PUBLIC, publicTok);
  if (newPass) {
    const hash = await sha256(newPass);
    localStorage.setItem(STORAGE_PASS_HASH, hash);
    document.getElementById('newAdminPass').value = '';
  }
  showMsg('settingsMsg', '✅ Settings saved on this browser.', 'success');
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
    renderFestivalPresetGrid();
  } catch (err) {
    console.warn('[admin] site-config load failed:', err.message);
    siteConfigData = { json: buildDefaultSiteConfig(), sha: null };
    populateThemeForm();
    populateBrandingForm();
    populateContactForm();
    renderFestivalPresetGrid();
  }
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
    version: 1,
    updated_at: new Date().toISOString(),
    branding: {
      site_name: 'Call4All',
      tagline: 'One Call. Every Service. Done.',
      logo_url: 'Imagelogo.png',
      logo_height: 55
    },
    theme: { ...window.FESTIVAL_PRESETS.default, preset: 'default' },
    contact: {
      phone: '+918387930687', phone_display: '+91 8387930687',
      whatsapp: '918387930687', email: 'info@call4all.co.in',
      website: 'www.call4all.co.in', address: 'India'
    },
    footer: { about_text: window.SITE_CONFIG.aboutText || '' }
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
        '✅ Theme saved! Aapke aur logged-in users ke browsers mein turant naya theme dikhega. ' +
        'Public visitors (logged out) ko ~5 min lag sakte hain (GitHub CDN cache).',
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
  return {
    preset: (siteConfigData.json && siteConfigData.json.theme && siteConfigData.json.theme.preset) || 'custom',
    primary: document.getElementById('th_primary').value,
    primary_dark: document.getElementById('th_primary_dark').value,
    accent: document.getElementById('th_accent').value,
    accent_dark: document.getElementById('th_accent_dark').value,
    background: document.getElementById('th_background').value,
    festival_overlay: document.getElementById('th_festival_overlay').value,
    festival_banner: document.getElementById('th_festival_banner').value
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
  populateThemeForm();
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
        '✅ Branding saved! Refresh karke header mein naya logo/name dikhega. ' +
        'Public visitors ke liye ~5 min CDN delay ho sakta hai.',
        'success');
    } catch (err) {
      showMsg('brandingMsg', '❌ ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false; submitBtn.textContent = '💾 Save Branding';
    }
  });
}

function populateBrandingForm() {
  const b = (siteConfigData.json && siteConfigData.json.branding) || {};
  const f = (siteConfigData.json && siteConfigData.json.footer) || {};
  document.getElementById('br_site_name').value = b.site_name || 'Call4All';
  document.getElementById('br_tagline').value = b.tagline || '';
  document.getElementById('br_logo_height').value = b.logo_height || 55;
  document.getElementById('br_about_text').value = f.about_text || '';
  const preview = document.getElementById('currentLogoPreview');
  if (preview && b.logo_url) {
    if (b.logo_url.startsWith('assets/uploads/')) {
      preview.src = `https://raw.githubusercontent.com/${window.SITE_CONFIG.github.owner}/${window.SITE_CONFIG.github.repo}/${window.SITE_CONFIG.github.branch}/${b.logo_url}`;
    } else {
      preview.src = b.logo_url;
    }
  }
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
        '✅ Contact info saved! Aapke browser mein turant apply ho gaya. ' +
        'Public visitors ko CDN cache ke liye ~5 min lag sakte hain.',
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
