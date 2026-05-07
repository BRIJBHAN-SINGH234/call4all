/* ===== Call4All - Booking Form Logic =====
 * Behavior:
 *  1. Build a nice WhatsApp message and open https://wa.me/...
 *  2. If a public-form GitHub token has been configured by admin
 *     (stored in localStorage as "c4a_public_token"), the form will
 *     also append a row to data/bookings.csv via the GitHub Contents API.
 *  3. If no token is configured, only WhatsApp is used (admin will add
 *     the entry manually from the admin panel after receiving the message).
 */

function renderBookingForm(options) {
  options = options || {};
  const preselected = options.service || '';
  const services = window.SITE_CONFIG.services;
  const optionsHtml = services.map(s =>
    `<option value="${s.name}" ${s.name === preselected ? 'selected' : ''}>${s.icon} ${s.name}</option>`
  ).join('');

  return `
    <section class="booking-section" id="book">
      <div class="booking-card">
        <h2>📋 Book a Service / Submit Your Requirement</h2>
        <p class="subtitle">Bharein form ya call karein <a href="tel:${window.SITE_CONFIG.phone}"><strong>${window.SITE_CONFIG.phoneDisplay}</strong></a> — hum aapko service provider tak pohchayenge.</p>
        <form id="bookingForm" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="bf_name">Full Name *</label>
              <input type="text" id="bf_name" name="name" placeholder="Your full name" required>
            </div>
            <div class="form-group">
              <label for="bf_phone">Phone Number *</label>
              <input type="tel" id="bf_phone" name="phone" placeholder="+91 XXXXX XXXXX" required pattern="[0-9+\\s\\-]{8,15}">
            </div>
          </div>
          <div class="form-group">
            <label for="bf_service">Service Required *</label>
            <select id="bf_service" name="service" required>
              <option value="">-- Select a service --</option>
              ${optionsHtml}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="bf_city">City *</label>
              <select id="bf_city" name="city" required>
                <option value="">Loading cities...</option>
              </select>
            </div>
            <div class="form-group">
              <label for="bf_area">Area / Locality *</label>
              <select id="bf_area" name="area" required disabled>
                <option value="">Select city first</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="bf_address">Full Address (House no, landmark)</label>
            <input type="text" id="bf_address" name="address" placeholder="e.g. House No 123, Near Shiv Mandir">
          </div>
          <div class="form-group">
            <label for="bf_message">Aapki Requirement *</label>
            <textarea id="bf_message" name="message" placeholder="Briefly describe what you need (date, quantity, budget, etc.)" required></textarea>
          </div>
          <button type="submit" class="btn btn-success btn-block" id="bf_submit">
            <span id="bf_submit_text">📤 Submit & Send via WhatsApp</span>
          </button>
          <p class="form-note">Submit karne par WhatsApp chat khulega, message bhejein. Hum 1 ghante ke andar reply karenge.</p>
          <div class="form-message" id="bf_msg"></div>
        </form>
      </div>
    </section>
  `;
}

function initBookingForm() {
  const form = document.getElementById('bookingForm');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';
  form.addEventListener('submit', handleBookingSubmit);
  loadAreasIntoForm();
}

let _areasCache = null;

async function loadAreasIntoForm() {
  const citySel = document.getElementById('bf_city');
  const areaSel = document.getElementById('bf_area');
  if (!citySel || !areaSel) return;

  try {
    const data = await window.CsvAPI.loadAllPublic('data/areas.csv');
    _areasCache = (data.items || []).filter(a => (a.status || '').toLowerCase() === 'active');

    const cities = [...new Set(_areasCache.map(a => a.city).filter(Boolean))].sort();
    if (cities.length === 0) {
      citySel.innerHTML = '<option value="">-- Type your city manually below --</option>';
      enableManualCityInput();
      return;
    }

    citySel.innerHTML = '<option value="">-- Select city --</option>' +
      cities.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join('') +
      '<option value="__other__">Other city (not listed)</option>';

    citySel.addEventListener('change', () => onCityChange(citySel, areaSel));
  } catch (err) {
    console.warn('Could not load service areas:', err);
    enableManualCityInput();
  }
}

function onCityChange(citySel, areaSel) {
  const selected = citySel.value;
  if (selected === '__other__') {
    enableManualCityInput();
    return;
  }
  if (!selected) {
    areaSel.disabled = true;
    areaSel.innerHTML = '<option value="">Select city first</option>';
    return;
  }
  const areas = (_areasCache || [])
    .filter(a => a.city === selected)
    .map(a => a.area)
    .filter(Boolean)
    .sort();
  areaSel.disabled = false;
  areaSel.innerHTML = '<option value="">-- Select area --</option>' +
    areas.map(a => `<option value="${escapeAttr(a)}">${escapeHtml(a)}</option>`).join('') +
    '<option value="__other__">Other area (not listed)</option>';
  areaSel.addEventListener('change', () => onAreaChange(areaSel), { once: true });
}

function onAreaChange(areaSel) {
  if (areaSel.value === '__other__') {
    replaceWithInput(areaSel, 'area', 'Type your area name');
  }
}

function enableManualCityInput() {
  const citySel = document.getElementById('bf_city');
  const areaSel = document.getElementById('bf_area');
  if (citySel) replaceWithInput(citySel, 'city', 'Type your city');
  if (areaSel) {
    areaSel.disabled = false;
    replaceWithInput(areaSel, 'area', 'Type your area');
  }
}

function replaceWithInput(selectEl, name, placeholder) {
  const input = document.createElement('input');
  input.type = 'text';
  input.name = name;
  input.id = selectEl.id;
  input.placeholder = placeholder;
  input.required = true;
  selectEl.parentNode.replaceChild(input, selectEl);
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function handleBookingSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    service: form.service.value.trim(),
    city: (form.city ? form.city.value.trim() : ''),
    area: (form.area ? form.area.value.trim() : ''),
    address: (form.address ? form.address.value.trim() : ''),
    message: form.message.value.trim()
  };

  if (!data.name || !data.phone || !data.service || !data.city || !data.area || !data.message) {
    showFormMessage('Please fill all required fields (name, phone, service, city, area, requirement).', 'error');
    return;
  }

  const submitBtn = document.getElementById('bf_submit');
  const submitText = document.getElementById('bf_submit_text');

  const id = 'BK' + Date.now();
  const timestamp = new Date().toISOString();
  const row = {
    id: id,
    timestamp: timestamp,
    name: data.name,
    phone: data.phone,
    service: data.service,
    city: data.city,
    area: data.area,
    address: data.address,
    message: data.message,
    status: 'New'
  };

  const waText = buildWhatsAppMessage(row);
  const waUrl = `https://wa.me/${window.SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(waText)}`;

  // CRITICAL: window.open() must be called synchronously inside the click
  // handler, otherwise modern browsers block it as a popup. Do this FIRST,
  // before any async work or button state changes.
  const waWindow = window.open(waUrl, '_blank');
  const popupBlocked = !waWindow || waWindow.closed || typeof waWindow.closed === 'undefined';

  // Now safely run async/background work
  submitBtn.disabled = true;
  submitText.textContent = '⏳ Sending...';

  // Optional: save to CSV in the background (no await — fire and forget)
  const publicToken = localStorage.getItem('c4a_public_token');
  if (publicToken) {
    window.CsvAPI.appendRow(row, publicToken, 'data/bookings.csv')
      .then(() => console.log('Booking saved to CSV:', id))
      .catch(err => console.error('Background CSV save failed:', err));
  }

  if (popupBlocked) {
    // Browser blocked the popup. Render a clickable button so user can open WhatsApp.
    showFormMessage(
      '⚠️ Browser ne popup block kiya. Neeche button click karein WhatsApp open karne ke liye.',
      'error'
    );
    submitText.innerHTML = '👉 Click here to open WhatsApp';
    submitBtn.disabled = false;
    submitBtn.onclick = function (ev) {
      ev.preventDefault();
      window.location.href = waUrl;
    };
  } else {
    showFormMessage(
      '✅ Aapki request taiyaar hai (Ref: ' + id + '). WhatsApp tab mein message bhej dein, hum 1 ghante mein reply karenge.',
      'success'
    );
    // Reset form for next submission after a short delay
    setTimeout(() => {
      form.reset();
      submitBtn.disabled = false;
      submitText.textContent = '📤 Submit & Send via WhatsApp';
    }, 1500);
  }
}

function buildWhatsAppMessage(row) {
  const lines = [
    '*📋 New Service Booking - Call4All*',
    '',
    `*Ref ID:* ${row.id}`,
    `*Name:* ${row.name}`,
    `*Phone:* ${row.phone}`,
    `*Service:* ${row.service}`,
    `*City:* ${row.city}`,
    `*Area:* ${row.area}`
  ];
  if (row.address) lines.push(`*Address:* ${row.address}`);
  lines.push('');
  lines.push('*Requirement:*');
  lines.push(row.message);
  lines.push('');
  lines.push(`_Submitted: ${new Date(row.timestamp).toLocaleString()}_`);
  return lines.join('\n');
}

function showFormMessage(text, type) {
  const el = document.getElementById('bf_msg');
  if (!el) return;
  el.className = 'form-message ' + type;
  el.textContent = text;
}

/* ===== CSV Helper (reused by admin) ===== */
window.CsvAPI = (function () {
  const cfg = window.SITE_CONFIG.github;

  function apiUrlFor(path) {
    return `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
  }
  function rawUrlFor(path) {
    return `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/${path}`;
  }

  function csvEscape(v) {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n\r]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function rowToCsv(row, cols) {
    cols = cols || ['id', 'timestamp', 'name', 'phone', 'service', 'city', 'area', 'address', 'message', 'status'];
    return cols.map(k => csvEscape(row[k] || '')).join(',');
  }

  function parseCsv(text) {
    const rows = [];
    let cur = '';
    let inQuotes = false;
    let curRow = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { cur += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { curRow.push(cur); cur = ''; }
        else if (ch === '\n') { curRow.push(cur); rows.push(curRow); curRow = []; cur = ''; }
        else if (ch === '\r') { /* ignore */ }
        else { cur += ch; }
      }
    }
    if (cur.length > 0 || curRow.length > 0) {
      curRow.push(cur);
      rows.push(curRow);
    }
    return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
  }

  function csvToObjects(text) {
    const rows = parseCsv(text);
    if (rows.length === 0) return { headers: [], items: [] };
    const headers = rows[0];
    const items = rows.slice(1).map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i] || ''; });
      return obj;
    });
    return { headers, items };
  }

  function objectsToCsv(headers, items) {
    const lines = [headers.join(',')];
    items.forEach(item => {
      lines.push(headers.map(h => csvEscape(item[h] || '')).join(','));
    });
    return lines.join('\n') + '\n';
  }

  function b64encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64decode(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\s/g, ''))));
  }

  const DEFAULT_HEADERS = {
    'data/bookings.csv': ['id', 'timestamp', 'name', 'phone', 'service', 'city', 'area', 'address', 'message', 'status'],
    'data/sources.csv': ['id', 'timestamp', 'category', 'name', 'city', 'area', 'address', 'contact_person', 'contact_phone', 'price', 'availability', 'notes', 'added_by'],
    'data/staff.csv': ['id', 'email', 'password_hash', 'name', 'phone', 'role', 'status', 'created_at', 'created_by'],
    'data/areas.csv': ['id', 'city', 'area', 'status', 'created_at'],
    'data/gallery.csv': ['id', 'timestamp', 'category', 'title', 'description', 'image_path', 'featured', 'sort_order', 'status', 'added_by']
  };

  async function getFile(path, token) {
    path = path || cfg.csvPath;
    const headers = { 'Accept': 'application/vnd.github+json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${apiUrlFor(path)}?ref=${cfg.branch}&t=${Date.now()}`, { headers, cache: 'no-store' });
    if (res.status === 404) {
      const cols = DEFAULT_HEADERS[path] || DEFAULT_HEADERS[cfg.csvPath];
      return { content: cols.join(',') + '\n', sha: null };
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to load ${path} (${res.status})`);
    }
    const json = await res.json();
    return { content: b64decode(json.content), sha: json.sha };
  }

  async function getFilePublic(path) {
    path = path || cfg.csvPath;
    const res = await fetch(`${rawUrlFor(path)}?t=${Date.now()}`, { cache: 'no-store' });
    if (res.status === 404) {
      const cols = DEFAULT_HEADERS[path] || DEFAULT_HEADERS[cfg.csvPath];
      return { content: cols.join(',') + '\n' };
    }
    if (!res.ok) {
      throw new Error(`Failed to load ${path} (${res.status})`);
    }
    const text = await res.text();
    return { content: text };
  }

  async function putFile(path, content, sha, token, message) {
    path = path || cfg.csvPath;
    const body = {
      message: message || `Update ${path} via Call4All site`,
      content: b64encode(content),
      branch: cfg.branch
    };
    if (sha) body.sha = sha;

    const res = await fetch(apiUrlFor(path), {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      let msg = err.message || `Failed to save ${path} (${res.status})`;
      if (res.status === 403 || /Resource not accessible/i.test(msg)) {
        msg = 'Aapke GitHub token mein "Contents: Read and write" permission nahi hai.\n\n' +
              'Fix karne ke liye:\n' +
              '1. Logout karein\n' +
              '2. Naya token banayein: https://github.com/settings/personal-access-tokens/new\n' +
              '3. Repository: BRIJBHAN-SINGH234/call4all select karein\n' +
              '4. Permissions → Contents → "Read and write" select karein\n' +
              '5. Generate token, copy karein, wapas login karein\n\n' +
              '(Original error: ' + msg + ')';
      } else if (res.status === 409) {
        msg = 'Conflict: file kisi ne update kar di hai. Refresh karein aur try karein.\n\n(Original: ' + msg + ')';
      } else if (res.status === 401) {
        msg = 'Token invalid ya expired hai. Logout karke naya token use karein.\n\n(Original: ' + msg + ')';
      }
      throw new Error(msg);
    }
    return res.json();
  }

  async function appendRow(row, token, path) {
    path = path || cfg.csvPath;
    const file = await getFile(path, token);
    let content = file.content;
    if (!content.endsWith('\n')) content += '\n';
    const cols = DEFAULT_HEADERS[path] || DEFAULT_HEADERS[cfg.csvPath];
    content += rowToCsv(row, cols) + '\n';
    return putFile(path, content, file.sha, token, `Add row to ${path}`);
  }

  async function loadAll(token, path) {
    path = path || cfg.csvPath;
    const file = await getFile(path, token);
    const parsed = csvToObjects(file.content);
    if (!parsed.headers.length) {
      parsed.headers = DEFAULT_HEADERS[path] || DEFAULT_HEADERS[cfg.csvPath];
    }
    return { ...parsed, sha: file.sha, raw: file.content };
  }

  async function loadAllPublic(path) {
    path = path || cfg.csvPath;
    const file = await getFilePublic(path);
    const parsed = csvToObjects(file.content);
    if (!parsed.headers.length) {
      parsed.headers = DEFAULT_HEADERS[path] || DEFAULT_HEADERS[cfg.csvPath];
    }
    return { ...parsed, raw: file.content };
  }

  async function saveAll(headers, items, sha, token, message, path) {
    path = path || cfg.csvPath;
    const content = objectsToCsv(headers, items);
    return putFile(path, content, sha, token, message);
  }

  /* ===== JSON file load/save (e.g. site-config.json) ===== */
  async function loadJson(path, token) {
    if (token) {
      const file = await getFile(path, token);
      let json = {};
      try { json = JSON.parse(file.content || '{}'); } catch (e) {}
      return { json, sha: file.sha };
    }
    const file = await getFilePublic(path);
    let json = {};
    try { json = JSON.parse(file.content || '{}'); } catch (e) {}
    return { json };
  }

  async function saveJson(path, json, sha, token, message) {
    const content = JSON.stringify(json, null, 2);
    return putFile(path, content, sha, token, message || `Update ${path}`);
  }

  /* ===== Image / Binary upload =====
     Reads File, optionally compresses to maxWidth, uploads to GitHub repo
     under given path. Returns the saved path (e.g. assets/uploads/foo.jpg). */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const dataUrl = String(r.result || '');
        const idx = dataUrl.indexOf(',');
        resolve(idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl);
      };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function compressImageFile(file, maxWidth = 1400, quality = 0.82) {
    return new Promise((resolve, reject) => {
      // Skip compression for SVG/GIF (animations/vectors lose quality)
      if (/svg|gif/i.test(file.type)) {
        return fileToBase64(file).then(b64 => resolve({ base64: b64, mime: file.type }));
      }
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          // Use JPEG for photos, PNG for transparency-likely files
          const outMime = /png/i.test(file.type) ? 'image/png' : 'image/jpeg';
          canvas.toBlob(blob => {
            if (!blob) return reject(new Error('Image compression failed'));
            const r2 = new FileReader();
            r2.onload = () => {
              const dataUrl = String(r2.result || '');
              const idx = dataUrl.indexOf(',');
              resolve({ base64: idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl, mime: outMime });
            };
            r2.readAsDataURL(blob);
          }, outMime, quality);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function safeFilename(name) {
    return String(name || 'file').replace(/[^a-z0-9._-]+/gi, '_').slice(0, 60);
  }

  async function uploadImage(file, token, opts) {
    opts = opts || {};
    if (!file) throw new Error('No file selected');
    if (!token) throw new Error('Not authenticated');

    const { base64, mime } = await compressImageFile(file, opts.maxWidth || 1400, opts.quality || 0.82);
    const ext = mime === 'image/png' ? 'png' : (mime === 'image/svg+xml' ? 'svg' : (mime === 'image/gif' ? 'gif' : 'jpg'));
    const slug = opts.prefix ? safeFilename(opts.prefix) + '-' : '';
    const baseName = safeFilename(file.name.replace(/\.[^.]+$/, ''));
    const filename = `${slug}${Date.now()}-${baseName}.${ext}`;
    const path = (opts.folder || 'assets/uploads/').replace(/\/?$/, '/') + filename;

    const res = await fetch(apiUrlFor(path), {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: opts.message || `Upload ${path} via Call4All admin`,
        content: base64,
        branch: cfg.branch
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      let msg = err.message || `Upload failed (${res.status})`;
      if (res.status === 403 || /Resource not accessible/i.test(msg)) {
        msg = 'Token mein "Contents: Read and write" permission nahi hai. Naya token banayein.';
      } else if (res.status === 401) {
        msg = 'Token invalid ya expired hai. Logout karke naya token use karein.';
      }
      throw new Error(msg);
    }
    return { path };
  }

  return {
    PATHS: {
      bookings: 'data/bookings.csv',
      sources: 'data/sources.csv',
      staff: 'data/staff.csv',
      areas: 'data/areas.csv',
      gallery: 'data/gallery.csv',
      siteConfig: 'data/site-config.json'
    },
    DEFAULT_HEADERS,
    appendRow,
    loadAll,
    loadAllPublic,
    saveAll,
    getFile,
    getFilePublic,
    putFile,
    loadJson,
    saveJson,
    uploadImage,
    fileToBase64,
    compressImageFile,
    csvToObjects,
    objectsToCsv,
    rowToCsv,
    parseCsv
  };
})();
