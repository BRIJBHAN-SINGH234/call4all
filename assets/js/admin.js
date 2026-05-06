/* ===== Call4All - Admin Panel Logic =====
 * Login: requires GitHub Personal Access Token (PAT) with `contents:write`
 * scope on the call4all repo. Stored in localStorage on admin's browser.
 * Optional admin password (set in localStorage as "c4a_admin_pass") for
 * extra protection on shared devices.
 */

const STORAGE_TOKEN = 'c4a_admin_token';
const STORAGE_USER = 'c4a_admin_user';
const STORAGE_PASS_HASH = 'c4a_admin_pass_hash';
const STORAGE_PUBLIC = 'c4a_public_token';

let cachedData = { headers: [], items: [], sha: null };
let editingId = null;

document.addEventListener('DOMContentLoaded', () => {
  const loginView = document.getElementById('loginView');
  const adminPanel = document.getElementById('adminPanel');
  const isLoginVisible = loginView && loginView.style.display !== 'none';
  const isAdminVisible = adminPanel && adminPanel.style.display !== 'none';

  if (isLoginVisible && document.getElementById('loginForm')) initLogin();
  if (isAdminVisible && document.getElementById('adminPanel')) initAdmin();
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showMsg(elId, text, type) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = 'form-message ' + (type || 'info');
  el.textContent = text;
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
      if (!verify.ok) throw new Error('Invalid GitHub token. Check the token and try again.');

      const storedPassHash = localStorage.getItem(STORAGE_PASS_HASH);
      if (storedPassHash) {
        const inputHash = await sha256(pass || '');
        if (inputHash !== storedPassHash) {
          throw new Error('Wrong admin password.');
        }
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

/* ===== Admin Panel Init ===== */
function initAdmin() {
  if (!getToken()) {
    window.location.href = 'admin.html';
    return;
  }
  const userEl = document.getElementById('adminUser');
  if (userEl) userEl.textContent = localStorage.getItem(STORAGE_USER) || 'admin';

  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('refreshBtn').addEventListener('click', loadBookings);
  document.getElementById('addNewBtn').addEventListener('click', () => openEditModal(null));
  document.getElementById('exportBtn').addEventListener('click', exportCsv);
  document.getElementById('searchInput').addEventListener('input', renderTable);
  document.getElementById('statusFilter').addEventListener('change', renderTable);

  document.getElementById('editForm').addEventListener('submit', handleSaveBooking);
  document.getElementById('modalCloseBtn').addEventListener('click', closeEditModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeEditModal);

  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);
  const settingsForm = document.getElementById('settingsForm');
  if (settingsForm) settingsForm.addEventListener('submit', handleSaveSettings);
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', closeSettingsModal);
  const settingsCancelBtn = document.getElementById('settingsCancelBtn');
  if (settingsCancelBtn) settingsCancelBtn.addEventListener('click', closeSettingsModal);
  const clearPublicBtn = document.getElementById('clearPublicBtn');
  if (clearPublicBtn) clearPublicBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_PUBLIC);
    document.getElementById('publicToken').value = '';
    showMsg('settingsMsg', 'Public token cleared. Forms will only send via WhatsApp.', 'info');
  });
  const clearPassBtn = document.getElementById('clearPassBtn');
  if (clearPassBtn) clearPassBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_PASS_HASH);
    showMsg('settingsMsg', 'Admin password cleared.', 'info');
  });

  loadBookings();
}

/* ===== Load & Render ===== */
async function loadBookings() {
  const tbody = document.getElementById('bookingsBody');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;">Loading bookings from GitHub...</td></tr>';
  try {
    cachedData = await window.CsvAPI.loadAll(getToken());
    if (!cachedData.headers.length) {
      cachedData.headers = ['id', 'timestamp', 'name', 'phone', 'service', 'location', 'message', 'status'];
    }
    updateStats();
    renderTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#dc3545;">❌ ${escapeHtml(err.message)}</td></tr>`;
  }
}

function updateStats() {
  const items = cachedData.items;
  document.getElementById('statTotal').textContent = items.length;
  document.getElementById('statNew').textContent = items.filter(i => (i.status || '').toLowerCase() === 'new').length;
  document.getElementById('statContacted').textContent = items.filter(i => (i.status || '').toLowerCase() === 'contacted').length;
  document.getElementById('statCompleted').textContent = items.filter(i => (i.status || '').toLowerCase() === 'completed').length;
}

function renderTable() {
  const tbody = document.getElementById('bookingsBody');
  const search = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('statusFilter').value;

  let items = [...cachedData.items];
  items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  if (statusFilter) {
    items = items.filter(i => (i.status || '').toLowerCase() === statusFilter.toLowerCase());
  }
  if (search) {
    items = items.filter(i =>
      Object.values(i).some(v => String(v).toLowerCase().includes(search))
    );
  }

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="icon">📭</div><div>No bookings found.</div></div></td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.id)}</strong></td>
      <td>${formatDate(item.timestamp)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td><a href="tel:${escapeHtml(item.phone)}">${escapeHtml(item.phone)}</a><br>
          <a href="https://wa.me/${escapeHtml((item.phone || '').replace(/[^0-9]/g, ''))}" target="_blank" style="font-size:12px;">💬 WhatsApp</a></td>
      <td>${escapeHtml(item.service)}</td>
      <td>${escapeHtml(item.location)}</td>
      <td class="msg-cell">${escapeHtml(item.message)}</td>
      <td>
        <span class="status-badge status-${(item.status || 'new').toLowerCase()}">${escapeHtml(item.status || 'New')}</span>
        <div class="actions" style="margin-top:6px;">
          <button class="btn btn-primary btn-sm" onclick="openEditModal('${escapeHtml(item.id)}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteBooking('${escapeHtml(item.id)}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
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

/* ===== Add / Edit Modal ===== */
function openEditModal(id) {
  editingId = id;
  const modal = document.getElementById('editModal');
  const form = document.getElementById('editForm');
  const title = document.getElementById('modalTitle');
  const services = window.SITE_CONFIG.services;

  const serviceSelect = document.getElementById('em_service');
  serviceSelect.innerHTML = services.map(s =>
    `<option value="${s.name}">${s.icon} ${s.name}</option>`
  ).join('');

  if (id) {
    const item = cachedData.items.find(i => i.id === id);
    if (!item) { alert('Booking not found.'); return; }
    title.textContent = 'Edit Booking - ' + id;
    form.id_field.value = item.id;
    form.timestamp_field.value = item.timestamp;
    form.name.value = item.name || '';
    form.phone.value = item.phone || '';
    form.service.value = item.service || '';
    form.location.value = item.location || '';
    form.message.value = item.message || '';
    form.status.value = item.status || 'New';
  } else {
    title.textContent = 'Add New Booking';
    form.reset();
    form.id_field.value = 'BK' + Date.now();
    form.timestamp_field.value = new Date().toISOString();
    form.status.value = 'New';
  }

  modal.classList.add('show');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('show');
  editingId = null;
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
    location: form.location.value.trim(),
    message: form.message.value.trim(),
    status: form.status.value
  };

  try {
    let items = [...cachedData.items];
    if (editingId) {
      const idx = items.findIndex(i => i.id === editingId);
      if (idx >= 0) items[idx] = row; else items.push(row);
    } else {
      items.push(row);
    }
    const headers = cachedData.headers.length ? cachedData.headers : ['id', 'timestamp', 'name', 'phone', 'service', 'location', 'message', 'status'];
    await window.CsvAPI.saveAll(headers, items, cachedData.sha, getToken(),
      editingId ? `Update booking ${row.id}` : `Add booking ${row.id}`);
    closeEditModal();
    await loadBookings();
  } catch (err) {
    alert('Save failed: ' + err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Booking';
  }
}

async function deleteBooking(id) {
  if (!confirm(`Delete booking ${id}? This cannot be undone.`)) return;
  try {
    const items = cachedData.items.filter(i => i.id !== id);
    const headers = cachedData.headers.length ? cachedData.headers : ['id', 'timestamp', 'name', 'phone', 'service', 'location', 'message', 'status'];
    await window.CsvAPI.saveAll(headers, items, cachedData.sha, getToken(), `Delete booking ${id}`);
    await loadBookings();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
}

/* ===== Export CSV ===== */
function exportCsv() {
  const headers = cachedData.headers.length ? cachedData.headers : ['id', 'timestamp', 'name', 'phone', 'service', 'location', 'message', 'status'];
  const csv = window.CsvAPI.objectsToCsv(headers, cachedData.items);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `call4all-bookings-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ===== Settings Modal ===== */
function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  document.getElementById('publicToken').value = localStorage.getItem(STORAGE_PUBLIC) || '';
  document.getElementById('newAdminPass').value = '';
  showMsg('settingsMsg', '', 'info');
  document.getElementById('settingsMsg').className = 'form-message';
  modal.classList.add('show');
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
