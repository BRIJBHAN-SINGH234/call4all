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
          <div class="form-row">
            <div class="form-group">
              <label for="bf_service">Service Required *</label>
              <select id="bf_service" name="service" required>
                <option value="">-- Select a service --</option>
                ${optionsHtml}
              </select>
            </div>
            <div class="form-group">
              <label for="bf_location">City / Location *</label>
              <input type="text" id="bf_location" name="location" placeholder="e.g. Delhi, Jaipur" required>
            </div>
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
}

async function handleBookingSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    service: form.service.value.trim(),
    location: form.location.value.trim(),
    message: form.message.value.trim()
  };

  if (!data.name || !data.phone || !data.service || !data.location || !data.message) {
    showFormMessage('Please fill all required fields.', 'error');
    return;
  }

  const submitBtn = document.getElementById('bf_submit');
  const submitText = document.getElementById('bf_submit_text');
  submitBtn.disabled = true;
  submitText.textContent = '⏳ Submitting...';

  const id = 'BK' + Date.now();
  const timestamp = new Date().toISOString();
  const row = {
    id: id,
    timestamp: timestamp,
    name: data.name,
    phone: data.phone,
    service: data.service,
    location: data.location,
    message: data.message,
    status: 'New'
  };

  let savedToCsv = false;
  let saveError = null;

  const publicToken = localStorage.getItem('c4a_public_token');
  if (publicToken) {
    try {
      await window.CsvAPI.appendRow(row, publicToken);
      savedToCsv = true;
    } catch (err) {
      saveError = err.message || String(err);
      console.error('GitHub CSV save failed:', err);
    }
  }

  const waText = buildWhatsAppMessage(row);
  const waUrl = `https://wa.me/${window.SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(waText)}`;

  if (savedToCsv) {
    showFormMessage('✅ Aapki request save ho gayi (Ref: ' + id + '). Ab WhatsApp khul raha hai — message bhej dein.', 'success');
  } else if (saveError) {
    showFormMessage('⚠️ WhatsApp khul raha hai. (CSV auto-save fail hua, admin manually add karega.)', 'info');
  } else {
    showFormMessage('✅ Aapki request taiyaar hai. WhatsApp khul raha hai — message bhej dein.', 'success');
  }

  setTimeout(() => {
    window.open(waUrl, '_blank');
    form.reset();
    submitBtn.disabled = false;
    submitText.textContent = '📤 Submit & Send via WhatsApp';
  }, 800);
}

function buildWhatsAppMessage(row) {
  return [
    '*📋 New Service Booking - Call4All*',
    '',
    `*Ref ID:* ${row.id}`,
    `*Name:* ${row.name}`,
    `*Phone:* ${row.phone}`,
    `*Service:* ${row.service}`,
    `*Location:* ${row.location}`,
    '',
    '*Requirement:*',
    row.message,
    '',
    `_Submitted: ${new Date(row.timestamp).toLocaleString()}_`
  ].join('\n');
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
  const apiBase = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.csvPath}`;

  function csvEscape(v) {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n\r]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function rowToCsv(row) {
    const cols = ['id', 'timestamp', 'name', 'phone', 'service', 'location', 'message', 'status'];
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

  async function getFile(token) {
    const headers = { 'Accept': 'application/vnd.github+json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${apiBase}?ref=${cfg.branch}`, { headers });
    if (res.status === 404) {
      return { content: 'id,timestamp,name,phone,service,location,message,status\n', sha: null };
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to load CSV (${res.status})`);
    }
    const json = await res.json();
    return { content: b64decode(json.content), sha: json.sha };
  }

  async function putFile(content, sha, token, message) {
    const body = {
      message: message || 'Update bookings.csv via Call4All site',
      content: b64encode(content),
      branch: cfg.branch
    };
    if (sha) body.sha = sha;

    const res = await fetch(apiBase, {
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
      throw new Error(err.message || `Failed to save CSV (${res.status})`);
    }
    return res.json();
  }

  async function appendRow(row, token) {
    const file = await getFile(token);
    let content = file.content;
    if (!content.endsWith('\n')) content += '\n';
    content += rowToCsv(row) + '\n';
    return putFile(content, file.sha, token, `Add booking ${row.id}`);
  }

  async function loadAll(token) {
    const file = await getFile(token);
    const parsed = csvToObjects(file.content);
    return { ...parsed, sha: file.sha, raw: file.content };
  }

  async function saveAll(headers, items, sha, token, message) {
    const content = objectsToCsv(headers, items);
    return putFile(content, sha, token, message);
  }

  return {
    appendRow,
    loadAll,
    saveAll,
    getFile,
    putFile,
    csvToObjects,
    objectsToCsv,
    rowToCsv,
    parseCsv
  };
})();
