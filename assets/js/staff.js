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

const PATH_SOURCES = 'data/sources.csv';
const PATH_STAFF = 'data/staff.csv';
const PATH_AREAS = 'data/areas.csv';

let staffSourcesData = { headers: [], items: [], sha: null };
let staffAreasCache = [];
let staffEditingId = null;

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

  document.getElementById('staffAddSourceBtn').addEventListener('click', () => openStaffSourceModal(null));
  document.getElementById('staffRefreshBtn').addEventListener('click', loadStaffData);
  document.getElementById('staffSrcSearch').addEventListener('input', renderStaffSourcesTable);
  document.getElementById('staffSrcCategoryFilter').addEventListener('change', renderStaffSourcesTable);
  document.getElementById('staffSrcMineFilter').addEventListener('change', renderStaffSourcesTable);

  document.getElementById('staffSourceForm').addEventListener('submit', handleStaffSaveSource);
  document.getElementById('staffSrcCloseBtn').addEventListener('click', closeStaffSourceModal);
  document.getElementById('staffSrcCancelBtn').addEventListener('click', closeStaffSourceModal);
  document.getElementById('staff_src_city').addEventListener('change', updateStaffAreaOptions);

  populateStaffCategoryFilter();
  loadStaffData();
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
