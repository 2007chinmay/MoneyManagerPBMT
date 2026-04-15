/* =============================================
   PBMT — Precision Bore Mill Tech
   script.js
   ============================================= */

'use strict';

// ==========================================
//  STORAGE & DATA
// ==========================================
const STORAGE_KEY = 'pbmt_jobs';
const DEFAULT_CATS = ['Milling', 'Boring', 'Keyway', 'Tap Hole', 'Reamer'];
const DEFAULT_CLIENTS = ['Koti Systems', 'Syntesis', 'J J Glastronics', 'Hymech'];
const CHART_COLORS = ['#14b8a6','#38bdf8','#4ade80','#fbbf24','#a78bfa','#f472b6'];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function getJobs() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) { seedData(); return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
  return JSON.parse(raw);
}

function setJobs(jobs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

function seedData() {
  const now = new Date();
  const m = (mo, d) => new Date(now.getFullYear(), now.getMonth() + mo, d);
  const iso = d => d.toISOString().split('T')[0];
  const jobs = [
    { id: uid(), productName: 'Hydraulic Cylinder Block', clientName: 'Koti Systems',   workType: 'New Work', receivedDate: iso(m(0,2)),   workDoneDate: iso(m(0,5)),   description: 'Precision boring of hydraulic cylinder block', notes: 'Tolerance ±0.01mm', categories: ['Boring','Milling'],   quantity:4,  amountPerPiece:2500, total:10000, imageData:null, createdAt: m(0,2).toISOString(),  status:'Completed' },
    { id: uid(), productName: 'Gear Housing',             clientName: 'Syntesis',        workType: 'New Work', receivedDate: iso(m(0,8)),   workDoneDate: iso(m(0,10)),  description: 'Keyway cutting and boring on gear housing',    notes: 'DIN standard keyway', categories: ['Keyway','Boring'],    quantity:2,  amountPerPiece:3500, total:7000,  imageData:null, createdAt: m(0,8).toISOString(),  status:'Completed' },
    { id: uid(), productName: 'Pump Body Casting',        clientName: 'J J Glastronics', workType: 'Rework',   receivedDate: iso(m(0,12)),  workDoneDate: '',            description: 'Rework on pump body tap holes',               notes: 'M12 tap holes re-threading', categories: ['Tap Hole','Reamer'], quantity:6,  amountPerPiece:1200, total:7200,  imageData:null, createdAt: m(0,12).toISOString(), status:'Pending'   },
    { id: uid(), productName: 'Motor End Shield',         clientName: 'Hymech',          workType: 'New Work', receivedDate: iso(m(-1,20)), workDoneDate: iso(m(-1,25)), description: 'Boring and milling of motor end shield',      notes: 'Batch order - regular client', categories: ['Boring','Milling'], quantity:8,  amountPerPiece:1800, total:14400, imageData:null, createdAt: m(-1,20).toISOString(), status:'Completed' },
    { id: uid(), productName: 'Valve Body',               clientName: 'Koti Systems',    workType: 'New Work', receivedDate: iso(m(-2,10)), workDoneDate: iso(m(-2,15)), description: 'Precision reaming on valve body bores',       notes: 'H7 tolerance required', categories: ['Reamer','Boring'],   quantity:10, amountPerPiece:950,  total:9500,  imageData:null, createdAt: m(-2,10).toISOString(), status:'Completed' },
  ];
  setJobs(jobs);
}

// ==========================================
//  STATS HELPERS
// ==========================================
function getStats() {
  const jobs = getJobs();
  const now = new Date();
  const cm = now.getMonth(), cy = now.getFullYear();
  let totalEarnings = 0, monthlyEarnings = 0, pending = 0, completed = 0;
  jobs.forEach(j => {
    totalEarnings += j.total;
    const d = new Date(j.createdAt);
    if (d.getMonth() === cm && d.getFullYear() === cy) monthlyEarnings += j.total;
    if (j.status === 'Pending') pending++; else completed++;
  });
  return { totalJobs: jobs.length, totalEarnings, monthlyEarnings, pending, completed };
}

function getCategoryDist() {
  const jobs = getJobs();
  const map = {};
  jobs.forEach(j => j.categories.forEach(c => { map[c] = (map[c] || 0) + 1; }));
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function getMonthlyEarnings() {
  const jobs = getJobs();
  const now = new Date();
  const months = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString('en-IN', { month:'short', year:'2-digit' });
    months[key] = 0;
  }
  jobs.forEach(j => {
    const d = new Date(j.createdAt);
    const key = d.toLocaleDateString('en-IN', { month:'short', year:'2-digit' });
    if (key in months) months[key] += j.total;
  });
  return Object.entries(months).map(([month, earnings]) => ({ month, earnings }));
}

// ==========================================
//  FORMATTING
// ==========================================
function fmtINR(v) {
  return new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(v);
}
function fmtDate(s) {
  if (!s) return '—';
  return new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
function fmtShortDate(s) {
  if (!s) return '';
  return new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}

// ==========================================
//  TOAST
// ==========================================
function toast(title, desc = '', type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="toast-title">${title}</div>${desc ? `<div class="toast-desc">${desc}</div>` : ''}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3000);
}

// ==========================================
//  SCREEN ROUTING
// ==========================================
let currentScreen = 'dashboard';

function showScreen(name, args = {}) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`screen-${name}`);
  if (el) el.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === name);
  });
  currentScreen = name;

  if (name === 'dashboard') renderDashboard();
  if (name === 'add-job') initAddJobForm(args.jobId || null);
  if (name === 'records') renderRecords();
  if (name === 'detail' && args.jobId) renderDetail(args.jobId);
  if (name === 'scan') initScan();
}

// ==========================================
//  CHARTS (Chart.js)
// ==========================================
let pieChart = null, barChart = null;

function renderDashboard() {
  const stats = getStats();
  document.getElementById('stat-total-jobs').textContent = stats.totalJobs;
  document.getElementById('stat-monthly').textContent = fmtINR(stats.monthlyEarnings);
  document.getElementById('stat-pending').textContent = stats.pending;
  document.getElementById('stat-completed').textContent = stats.completed;
  document.getElementById('stat-total-earnings').textContent = fmtINR(stats.totalEarnings);

  renderPieChart();
  renderBarChart();
}

function renderPieChart() {
  const data = getCategoryDist();
  const ctx = document.getElementById('pie-chart').getContext('2d');
  if (pieChart) pieChart.destroy();

  if (data.length === 0) {
    document.getElementById('pie-legend').innerHTML = '<span style="color:var(--text-sub);font-size:12px">No data yet</span>';
    return;
  }

  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.name),
      datasets: [{ data: data.map(d => d.value), backgroundColor: CHART_COLORS, borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: false,
      cutout: '60%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } } }
    }
  });

  document.getElementById('pie-legend').innerHTML = data.map((d, i) =>
    `<div class="legend-item">
      <span class="legend-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>
      <span class="legend-name">${d.name}</span>
      <span class="legend-val">${d.value}</span>
    </div>`
  ).join('');
}

function renderBarChart() {
  const data = getMonthlyEarnings();
  const ctx = document.getElementById('bar-chart').getContext('2d');
  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.month),
      datasets: [{
        label: 'Earnings',
        data: data.map(d => d.earnings),
        backgroundColor: '#14b8a6',
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 40,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmtINR(ctx.raw)}` } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8b949e', font: { size: 11 } }, border: { display: false } },
        y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 11 }, callback: v => `${(v/1000).toFixed(0)}k` }, border: { display: false } }
      }
    }
  });
}

// ==========================================
//  SCAN
// ==========================================
let mediaStream = null;

function initScan() {
  // Reset to initial state
  resetScanUI();
}

function resetScanUI() {
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  const video = document.getElementById('camera-video');
  const captured = document.getElementById('captured-img');
  const placeholder = document.getElementById('camera-placeholder');
  const corners = document.getElementById('camera-corners');
  const err = document.getElementById('camera-error');
  video.style.display = 'none';
  captured.style.display = 'none';
  err.style.display = 'none';
  placeholder.style.display = 'flex';
  corners.style.display = 'none';
  document.getElementById('btn-open-camera').style.display = 'inline-flex';
  document.getElementById('btn-capture').style.display = 'none';
  document.getElementById('retake-confirm').style.display = 'none';
}

async function startCamera() {
  try {
    const placeholder = document.getElementById('camera-placeholder');
    const corners = document.getElementById('camera-corners');
    const video = document.getElementById('camera-video');
    const err = document.getElementById('camera-error');
    placeholder.style.display = 'none';
    err.style.display = 'none';
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width:{ideal:1280}, height:{ideal:960} } });
    video.srcObject = mediaStream;
    video.style.display = 'block';
    corners.style.display = 'block';
    document.getElementById('btn-open-camera').style.display = 'none';
    document.getElementById('btn-capture').style.display = 'inline-flex';
  } catch {
    document.getElementById('camera-error').style.display = 'flex';
    document.getElementById('camera-placeholder').style.display = 'none';
  }
}

function capturePhoto() {
  const video = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  const img = document.getElementById('captured-img');
  const corners = document.getElementById('camera-corners');
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  img.src = dataUrl;
  img.style.display = 'block';
  video.style.display = 'none';
  corners.style.display = 'none';
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  document.getElementById('btn-capture').style.display = 'none';
  document.getElementById('retake-confirm').style.display = 'flex';
}

function retakePhoto() {
  document.getElementById('captured-img').style.display = 'none';
  document.getElementById('retake-confirm').style.display = 'none';
  document.getElementById('camera-corners').style.display = 'none';
  startCamera();
}

function confirmPhoto() {
  const src = document.getElementById('captured-img').src;
  localStorage.setItem('pbmt_scanned_image', src);
  toast('Image Saved', 'Photo saved. Attach it when adding a job.', 'success');
  resetScanUI();
}

// ==========================================
//  ADD / EDIT JOB FORM
// ==========================================
let selectedCategories = [];

function initAddJobForm(editId = null) {
  selectedCategories = [];
  const form = document.getElementById('job-form');
  document.getElementById('edit-job-id').value = editId || '';
  document.getElementById('add-job-title').textContent = editId ? 'Edit Job' : 'Add New Job';

  // Set defaults
  document.getElementById('f-product').value = '';
  document.getElementById('f-client').value = '';
  document.getElementById('f-custom-client').value = '';
  document.getElementById('custom-client-group').style.display = 'none';
  document.getElementById('f-work-type').value = 'New Work';
  document.getElementById('wt-new').classList.add('active');
  document.getElementById('wt-rework').classList.remove('active');
  document.getElementById('f-received').value = new Date().toISOString().split('T')[0];
  document.getElementById('f-done').value = '';
  document.getElementById('f-desc').value = '';
  document.getElementById('f-notes').value = '';
  document.getElementById('f-qty').value = 1;
  document.getElementById('f-rate').value = '';
  document.getElementById('f-total').textContent = '₹0';
  document.getElementById('f-custom-cat').value = '';
  document.getElementById('custom-cat-row').style.display = 'none';
  document.getElementById('image-attach-card').style.display = 'none';

  // Scanned image
  const scanned = localStorage.getItem('pbmt_scanned_image');
  if (scanned && !editId) {
    document.getElementById('form-attached-img').src = scanned;
    document.getElementById('image-attach-card').style.display = 'block';
  }

  // Load edit data
  if (editId) {
    const job = getJobs().find(j => j.id === editId);
    if (job) {
      document.getElementById('f-product').value = job.productName;
      const isPreset = DEFAULT_CLIENTS.includes(job.clientName);
      document.getElementById('f-client').value = isPreset ? job.clientName : 'Others';
      if (!isPreset) {
        document.getElementById('f-custom-client').value = job.clientName;
        document.getElementById('custom-client-group').style.display = 'flex';
      }
      document.getElementById('f-work-type').value = job.workType;
      document.getElementById('wt-new').classList.toggle('active', job.workType === 'New Work');
      document.getElementById('wt-rework').classList.toggle('active', job.workType === 'Rework');
      document.getElementById('f-received').value = job.receivedDate || '';
      document.getElementById('f-done').value = job.workDoneDate || '';
      document.getElementById('f-desc').value = job.description || '';
      document.getElementById('f-notes').value = job.notes || '';
      document.getElementById('f-qty').value = job.quantity;
      document.getElementById('f-rate').value = job.amountPerPiece;
      updateTotal();
      selectedCategories = [...job.categories];
      if (job.imageData) {
        document.getElementById('form-attached-img').src = job.imageData;
        document.getElementById('image-attach-card').style.display = 'block';
      }
    }
  }

  renderCategoryChips();
  renderSelectedTags();
}

function renderCategoryChips() {
  const allCats = [...DEFAULT_CATS, 'Others'];
  document.getElementById('category-chips').innerHTML = allCats.map(cat => {
    const isOthers = cat === 'Others';
    const isSelected = selectedCategories.includes(cat);
    return `<label class="chip ${isSelected ? 'selected' : ''}" data-cat="${cat}">
      ${isOthers ? 'Others' : cat}
    </label>`;
  }).join('');

  document.querySelectorAll('#category-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.cat;
      if (cat === 'Others') {
        const row = document.getElementById('custom-cat-row');
        row.style.display = row.style.display === 'none' ? 'flex' : 'none';
        return;
      }
      if (selectedCategories.includes(cat)) {
        selectedCategories = selectedCategories.filter(c => c !== cat);
      } else {
        selectedCategories.push(cat);
      }
      chip.classList.toggle('selected', selectedCategories.includes(cat));
      renderSelectedTags();
    });
  });
}

function renderSelectedTags() {
  document.getElementById('selected-categories').innerHTML = selectedCategories.map(c =>
    `<span class="tag">${c} <span class="tag-remove" data-cat="${c}">×</span></span>`
  ).join('');
  document.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCategories = selectedCategories.filter(c => c !== btn.dataset.cat);
      renderCategoryChips();
      renderSelectedTags();
    });
  });
}

function updateTotal() {
  const qty = parseFloat(document.getElementById('f-qty').value) || 0;
  const rate = parseFloat(document.getElementById('f-rate').value) || 0;
  document.getElementById('f-total').textContent = fmtINR(qty * rate);
}

function submitJob(e) {
  e.preventDefault();
  const editId = document.getElementById('edit-job-id').value;
  const productName = document.getElementById('f-product').value.trim();
  const clientSel = document.getElementById('f-client').value;
  const clientName = clientSel === 'Others'
    ? document.getElementById('f-custom-client').value.trim()
    : clientSel;
  const workType = document.getElementById('f-work-type').value;
  const receivedDate = document.getElementById('f-received').value;
  const workDoneDate = document.getElementById('f-done').value;
  const description = document.getElementById('f-desc').value.trim();
  const notes = document.getElementById('f-notes').value.trim();
  const quantity = parseInt(document.getElementById('f-qty').value) || 1;
  const amountPerPiece = parseFloat(document.getElementById('f-rate').value) || 0;
  const total = quantity * amountPerPiece;
  const imgEl = document.getElementById('form-attached-img');
  const imageData = document.getElementById('image-attach-card').style.display !== 'none' ? imgEl.src : null;

  if (!productName) { toast('Error', 'Product Name is required.', 'error'); return; }
  if (!clientName) { toast('Error', 'Client Name is required.', 'error'); return; }
  if (selectedCategories.length === 0) { toast('Error', 'Select at least one category.', 'error'); return; }

  const jobs = getJobs();
  if (editId) {
    const idx = jobs.findIndex(j => j.id === editId);
    if (idx !== -1) {
      jobs[idx] = { ...jobs[idx], productName, clientName, workType, receivedDate, workDoneDate, description, notes, categories: [...selectedCategories], quantity, amountPerPiece, total, imageData: imageData || jobs[idx].imageData, status: workDoneDate ? 'Completed' : 'Pending' };
      setJobs(jobs);
      toast('Updated', `${productName} has been updated.`, 'success');
    }
  } else {
    const job = { id: uid(), productName, clientName, workType, receivedDate, workDoneDate, description, notes, categories: [...selectedCategories], quantity, amountPerPiece, total, imageData, createdAt: new Date().toISOString(), status: workDoneDate ? 'Completed' : 'Pending' };
    jobs.push(job);
    setJobs(jobs);
    localStorage.removeItem('pbmt_scanned_image');
    toast('Job Added', `${productName} has been saved.`, 'success');
  }
  showScreen('records');
}

// ==========================================
//  RECORDS
// ==========================================
let recordsSearch = '';

function renderRecords() {
  const jobs = getJobs();
  const q = recordsSearch.toLowerCase();
  const filtered = q ? jobs.filter(j =>
    j.productName.toLowerCase().includes(q) ||
    j.clientName.toLowerCase().includes(q) ||
    j.description.toLowerCase().includes(q)
  ) : jobs;

  const grouped = {};
  filtered.forEach(j => {
    if (!grouped[j.clientName]) grouped[j.clientName] = [];
    grouped[j.clientName].push(j);
  });

  const list = document.getElementById('records-list');
  const clients = Object.keys(grouped).sort();

  if (clients.length === 0) {
    list.innerHTML = '<div class="empty-state">No records found</div>';
    return;
  }

  list.innerHTML = clients.map(client => {
    const cjobs = grouped[client];
    return `<div class="client-group">
      <div class="client-header">
        <span class="client-name">${client}</span>
        <span class="client-badge">${cjobs.length} job${cjobs.length !== 1 ? 's' : ''}</span>
      </div>
      ${cjobs.map(j => `
        <div class="job-card" data-id="${j.id}" role="button" tabindex="0">
          <div class="job-thumb">
            ${j.imageData
              ? `<img src="${j.imageData}" alt="${j.productName}" />`
              : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`
            }
          </div>
          <div class="job-info">
            <div class="job-name">${j.productName}</div>
            <div class="job-meta">
              <span class="badge badge-${j.status.toLowerCase()}">${j.status}</span>
              <span style="font-size:11px;color:var(--text-sub)">${fmtShortDate(j.receivedDate)}</span>
            </div>
          </div>
          <span class="job-total">${fmtINR(j.total)}</span>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      `).join('')}
    </div>`;
  }).join('');

  list.querySelectorAll('.job-card').forEach(card => {
    card.addEventListener('click', () => showScreen('detail', { jobId: card.dataset.id }));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') showScreen('detail', { jobId: card.dataset.id }); });
  });
}

// ==========================================
//  JOB DETAIL
// ==========================================
let detailJobId = null;

function renderDetail(id) {
  detailJobId = id;
  const job = getJobs().find(j => j.id === id);
  if (!job) { showScreen('records'); return; }
  document.getElementById('detail-title').textContent = 'Job Details';
  const el = document.getElementById('detail-content');

  const cats = job.categories.map(c => `<span class="detail-tag">${c}</span>`).join('');
  const tags = [
    `<span class="detail-tag">${job.workType}</span>`,
    ...job.categories.map(c => `<span class="detail-tag">${c}</span>`)
  ].join('');

  el.innerHTML = `
    ${job.imageData ? `<img class="detail-img" src="${job.imageData}" alt="${job.productName}" />` : ''}

    <div class="detail-card">
      <div class="detail-row" style="margin-bottom:10px">
        <span style="font-size:15px;font-weight:600">${job.productName}</span>
        <span class="badge badge-${job.status.toLowerCase()}">${job.status}</span>
      </div>
      <div class="detail-field">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>${job.clientName}</span>
      </div>
      <div class="detail-field">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>Received: ${fmtDate(job.receivedDate)}</span>
      </div>
      ${job.workDoneDate ? `<div class="detail-field">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span>Done: ${fmtDate(job.workDoneDate)}</span>
      </div>` : ''}
      <div class="detail-tags">${tags}</div>
    </div>

    <div class="detail-card">
      <div class="detail-section">Pricing</div>
      <table class="price-table">
        <tr><td style="color:var(--text-sub)">Quantity</td><td>${job.quantity}</td></tr>
        <tr><td style="color:var(--text-sub)">Amount / Piece</td><td>${fmtINR(job.amountPerPiece)}</td></tr>
        <tr class="total-row"><td>Total</td><td>${fmtINR(job.total)}</td></tr>
      </table>
    </div>

    ${(job.description || job.notes) ? `
    <div class="detail-card">
      ${job.description ? `<div class="desc-block" style="margin-bottom:${job.notes?'12px':'0'}"><strong>Description</strong>${job.description}</div>` : ''}
      ${job.notes ? `<div class="desc-block"><strong>Notes</strong>${job.notes}</div>` : ''}
    </div>` : ''}
  `;
}

// ==========================================
//  DELETE
// ==========================================
let pendingDeleteId = null;

function openDeleteModal(id) {
  pendingDeleteId = id;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeDeleteModal() {
  pendingDeleteId = null;
  document.getElementById('modal-overlay').style.display = 'none';
}

function confirmDelete() {
  if (!pendingDeleteId) return;
  const jobs = getJobs().filter(j => j.id !== pendingDeleteId);
  setJobs(jobs);
  closeDeleteModal();
  toast('Deleted', 'Job has been deleted.', 'info');
  showScreen('records');
}

// ==========================================
//  EXPORT
// ==========================================
function exportPDF() {
  window.print();
}

function exportImage() {
  const list = document.getElementById('records-list');
  if (!list) return;
  toast('Feature', 'Use your browser screenshot to save the records view.', 'info');
}

// ==========================================
//  PWA / SERVICE WORKER
// ==========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// ==========================================
//  INIT & EVENT BINDING
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

  // Bottom nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.screen));
  });

  // Camera
  document.getElementById('btn-open-camera').addEventListener('click', startCamera);
  document.getElementById('btn-capture').addEventListener('click', capturePhoto);
  document.getElementById('btn-retake').addEventListener('click', retakePhoto);
  document.getElementById('btn-confirm').addEventListener('click', confirmPhoto);

  // Work type toggle
  document.getElementById('wt-new').addEventListener('click', () => {
    document.getElementById('f-work-type').value = 'New Work';
    document.getElementById('wt-new').classList.add('active');
    document.getElementById('wt-rework').classList.remove('active');
  });
  document.getElementById('wt-rework').addEventListener('click', () => {
    document.getElementById('f-work-type').value = 'Rework';
    document.getElementById('wt-rework').classList.add('active');
    document.getElementById('wt-new').classList.remove('active');
  });

  // Client select
  document.getElementById('f-client').addEventListener('change', function() {
    document.getElementById('custom-client-group').style.display = this.value === 'Others' ? 'flex' : 'none';
  });

  // Qty/rate total calc
  document.getElementById('f-qty').addEventListener('input', updateTotal);
  document.getElementById('f-rate').addEventListener('input', updateTotal);

  // Custom category add
  document.getElementById('btn-add-cat').addEventListener('click', () => {
    const val = document.getElementById('f-custom-cat').value.trim();
    if (val && !selectedCategories.includes(val)) {
      selectedCategories.push(val);
      document.getElementById('f-custom-cat').value = '';
      renderCategoryChips();
      renderSelectedTags();
    }
  });
  document.getElementById('f-custom-cat').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-add-cat').click(); }
  });

  // Remove attached image
  document.getElementById('btn-remove-img').addEventListener('click', () => {
    document.getElementById('image-attach-card').style.display = 'none';
    document.getElementById('form-attached-img').src = '';
    localStorage.removeItem('pbmt_scanned_image');
  });

  // Form submit
  document.getElementById('job-form').addEventListener('submit', submitJob);

  // Records search
  document.getElementById('records-search').addEventListener('input', function() {
    recordsSearch = this.value;
    renderRecords();
  });

  // Export buttons
  document.getElementById('btn-export-pdf').addEventListener('click', exportPDF);
  document.getElementById('btn-export-img').addEventListener('click', exportImage);

  // Detail back
  document.getElementById('btn-back-detail').addEventListener('click', () => showScreen('records'));

  // Detail edit
  document.getElementById('btn-edit-job').addEventListener('click', () => {
    if (detailJobId) showScreen('add-job', { jobId: detailJobId });
  });

  // Detail delete
  document.getElementById('btn-delete-job').addEventListener('click', () => {
    if (detailJobId) openDeleteModal(detailJobId);
  });

  // Modal
  document.getElementById('modal-cancel').addEventListener('click', closeDeleteModal);
  document.getElementById('modal-confirm').addEventListener('click', confirmDelete);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeDeleteModal();
  });

  // Load dashboard by default
  showScreen('dashboard');
});
let deferredPrompt;

const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // stop automatic popup

  deferredPrompt = e;

  // show install button
  if (installBtn) {
    installBtn.style.display = "block";
  }
});

installBtn?.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt(); // show install popup

  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === "accepted") {
    console.log("Installed ✅");
  } else {
    console.log("Cancelled ❌");
  }

  deferredPrompt = null;
  installBtn.style.display = "none";
});

window.addEventListener("appinstalled", () => {
  alert("PBMT Installed Successfully 🎉");
});
