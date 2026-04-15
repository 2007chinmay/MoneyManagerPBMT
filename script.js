/* ── Storage ──────────────────────────────────── */
const KEYS = { balances: 'pbmt_balances', expenses: 'pbmt_expenses', nextId: 'pbmt_nid' };
const COLORS = ['#3d6b58','#c07c4a','#c9a84c','#5a7fa0','#8b6ba8'];

function loadBalances() {
  try { return JSON.parse(localStorage.getItem(KEYS.balances)) || { cash:0, upi:0, bank:0 }; }
  catch { return { cash:0, upi:0, bank:0 }; }
}
function saveBalances(b) { localStorage.setItem(KEYS.balances, JSON.stringify(b)); }

function loadExpenses() {
  try { return JSON.parse(localStorage.getItem(KEYS.expenses)) || []; }
  catch { return []; }
}
function saveExpenses(e) { localStorage.setItem(KEYS.expenses, JSON.stringify(e)); }

function nextId() {
  const n = parseInt(localStorage.getItem(KEYS.nextId) || '1', 10);
  localStorage.setItem(KEYS.nextId, String(n + 1));
  return n;
}

/* ── Format helpers ───────────────────────────── */
function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR' }).format(n);
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' });
}

/* ── Navigation ───────────────────────────────── */
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const section = document.getElementById('page-' + page);
  if (section) section.classList.add('active');

  document.querySelectorAll('[data-page="' + page + '"]').forEach(l => l.classList.add('active'));

  if (page === 'home') renderHome();
  if (page === 'entries') renderEntries();
  if (page === 'add-balance') renderBalanceList();

  window.scrollTo(0, 0);
}

/* ── Route on hash ────────────────────────────── */
function routeFromHash() {
  const map = { '#home':'home', '#entries':'entries', '#add-expense':'add-expense', '#add-balance':'add-balance' };
  navigate(map[location.hash] || 'home');
}
window.addEventListener('hashchange', routeFromHash);
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => setTimeout(routeFromHash, 10));
});

/* ── Home Page ────────────────────────────────── */
function computeSummary() {
  const balances  = loadBalances();
  const expenses  = loadExpenses();
  const total     = balances.cash + balances.upi + balances.bank;
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  const catMap = {}, methMap = {};
  expenses.forEach(e => {
    catMap[e.category]      = catMap[e.category]      || { total:0, count:0 };
    catMap[e.category].total  += e.amount;
    catMap[e.category].count  += 1;
    methMap[e.paymentMethod]  = methMap[e.paymentMethod] || { total:0, count:0 };
    methMap[e.paymentMethod].total += e.amount;
    methMap[e.paymentMethod].count += 1;
  });

  const catBreakdown = Object.entries(catMap)
    .map(([cat, { total, count }]) => ({ cat, total, count, pct: totalSpent > 0 ? Math.round(total/totalSpent*100) : 0 }))
    .sort((a,b) => b.total - a.total);

  const recent = [...expenses].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  return { balances, total, totalSpent, count: expenses.length, catBreakdown, methMap, recent };
}

function renderHome() {
  const s = computeSummary();

  document.getElementById('total-balance').textContent = fmt(s.total);
  document.getElementById('total-spent').textContent   = fmt(s.totalSpent);
  document.getElementById('tx-count').textContent      = s.count + ' transaction' + (s.count !== 1 ? 's' : '');

  if (s.catBreakdown.length > 0) {
    document.getElementById('top-category').textContent       = s.catBreakdown[0].cat;
    document.getElementById('top-category-amount').textContent = fmt(s.catBreakdown[0].total) + ' spent';
  } else {
    document.getElementById('top-category').textContent       = 'None';
    document.getElementById('top-category-amount').textContent = '';
  }

  drawPie(s.catBreakdown);
  drawBar(s.balances);
  renderRecentList(s.recent);
}

function drawPie(breakdown) {
  const canvas  = document.getElementById('pie-chart');
  const legend  = document.getElementById('pie-legend');
  const empty   = document.getElementById('pie-empty');
  const ctx     = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  legend.innerHTML = '';

  if (!breakdown.length) {
    canvas.style.display = 'none';
    legend.style.display  = 'none';
    empty.classList.remove('hidden');
    return;
  }

  canvas.style.display = '';
  legend.style.display  = '';
  empty.classList.add('hidden');

  const cx = canvas.width / 2, cy = canvas.height / 2, r = 80, inner = 52;
  let angle = -Math.PI / 2;

  breakdown.forEach((item, i) => {
    const slice = (item.total / breakdown.reduce((s,x)=>s+x.total,0)) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();

    const li = document.createElement('div');
    li.className = 'legend-item';
    li.innerHTML = `<span class="legend-dot" style="background:${COLORS[i % COLORS.length]}"></span>
      <span>${cap(item.cat)} — ${item.pct}%</span>`;
    legend.appendChild(li);

    angle += slice;
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#f5f2ee';
  ctx.fill();
}

function drawBar(balances) {
  const canvas = document.getElementById('bar-chart');
  const empty  = document.getElementById('bar-empty');
  const ctx    = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const items = [
    { label:'Bank', value: balances.bank, color: COLORS[1] },
    { label:'UPI',  value: balances.upi,  color: COLORS[3] },
    { label:'Cash', value: balances.cash, color: COLORS[2] },
  ].filter(d => d.value > 0);

  if (!items.length) {
    canvas.style.display = 'none';
    empty.classList.remove('hidden');
    return;
  }

  canvas.style.display = '';
  empty.classList.add('hidden');

  const max   = Math.max(...items.map(d => d.value));
  const barH  = 28, gap = 24, labelW = 44, rightPad = 10;
  const availW = canvas.width - labelW - rightPad;
  canvas.height = items.length * (barH + gap) + 20;

  ctx.font = '13px Segoe UI, system-ui, sans-serif';
  ctx.fillStyle = '#6b7280';

  items.forEach((item, i) => {
    const y   = 10 + i * (barH + gap);
    const barW = max > 0 ? (item.value / max) * availW : 0;

    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'right';
    ctx.fillText(item.label, labelW - 8, y + barH / 2 + 5);

    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.roundRect(labelW, y, Math.max(barW, 4), barH, 4);
    ctx.fill();
  });
}

function renderRecentList(expenses) {
  const list  = document.getElementById('recent-list');
  const empty = document.getElementById('recent-empty');
  list.innerHTML = '';

  if (!expenses.length) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  expenses.forEach(e => {
    list.appendChild(makeEntryItem(e, false));
  });
}

/* ── Entries Page ─────────────────────────────── */
function renderEntries() {
  const cat    = document.getElementById('filter-category').value;
  const method = document.getElementById('filter-method').value;
  const all    = loadExpenses();

  const filtered = all
    .filter(e => cat    === 'all' || e.category      === cat)
    .filter(e => method === 'all' || e.paymentMethod === method)
    .sort((a,b) => new Date(b.date) - new Date(a.date));

  const list  = document.getElementById('entries-list');
  const empty = document.getElementById('entries-empty');
  list.innerHTML = '';

  if (!filtered.length) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  filtered.forEach(e => list.appendChild(makeEntryItem(e, true)));
}

function makeEntryItem(e, showDelete) {
  const el = document.createElement('div');
  el.className = 'entry-item';
  el.innerHTML = `
    <div class="entry-left">
      <div class="entry-cat">${cap(e.category)} <span class="badge">${e.paymentMethod.toUpperCase()}</span></div>
      ${e.note ? `<div class="entry-note">${esc(e.note)}</div>` : ''}
      <div class="entry-meta">${fmtDate(e.date)}</div>
    </div>
    <div class="entry-right">
      <div class="entry-amount">${fmt(e.amount)}</div>
      ${showDelete ? `<button class="delete-btn" title="Delete" data-id="${e.id}">&#128465;</button>` : ''}
    </div>`;

  if (showDelete) {
    el.querySelector('.delete-btn').addEventListener('click', () => openDeleteModal(e.id));
  }
  return el;
}

/* ── Balance Page ─────────────────────────────── */
function renderBalanceList() {
  const b    = loadBalances();
  const list = document.getElementById('balance-list');
  const items = [
    { type:'bank', label:'Bank Account' },
    { type:'upi',  label:'UPI' },
    { type:'cash', label:'Physical Cash' },
  ];
  list.innerHTML = items.map(i => `
    <div class="balance-item">
      <div><div class="balance-label">${i.label}</div><div class="balance-sub">${i.type}</div></div>
      <div class="balance-amount">${fmt(b[i.type])}</div>
    </div>`).join('');
}

/* ── Add Expense Form ─────────────────────────── */
document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];

document.getElementById('expense-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const cat    = document.getElementById('exp-category').value;
  const method = document.getElementById('exp-method').value;
  const date   = document.getElementById('exp-date').value;
  const note   = document.getElementById('exp-note').value.trim();

  if (!amount || amount <= 0) return;

  const expenses = loadExpenses();
  expenses.push({ id: nextId(), amount, category: cat, paymentMethod: method, date: new Date(date).toISOString(), note: note || null, createdAt: new Date().toISOString() });
  saveExpenses(expenses);

  const balances = loadBalances();
  balances[method] = Math.max(0, balances[method] - amount);
  saveBalances(balances);

  this.reset();
  document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
  showToast('Expense recorded');
  navigate('entries');
});

/* ── Add Balance Form ─────────────────────────── */
document.getElementById('balance-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const type   = document.getElementById('bal-type').value;
  const mode   = document.getElementById('bal-mode').value;
  const amount = parseFloat(document.getElementById('bal-amount').value);

  if (isNaN(amount) || amount < 0) return;

  const balances = loadBalances();
  balances[type] = mode === 'set' ? amount : balances[type] + amount;
  saveBalances(balances);

  this.reset();
  showToast('Balance updated');
  navigate('home');
});

/* ── Filters ─────────────────────────────────── */
document.getElementById('filter-category').addEventListener('change', renderEntries);
document.getElementById('filter-method').addEventListener('change', renderEntries);

/* ── Delete Modal ─────────────────────────────── */
let pendingDeleteId = null;

function openDeleteModal(id) {
  pendingDeleteId = id;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  pendingDeleteId = null;
  document.getElementById('modal-overlay').classList.add('hidden');
}

document.getElementById('confirm-delete-btn').addEventListener('click', function() {
  if (pendingDeleteId == null) return;

  const expenses = loadExpenses();
  const exp      = expenses.find(e => e.id === pendingDeleteId);

  if (exp) {
    const balances   = loadBalances();
    balances[exp.paymentMethod] += exp.amount;
    saveBalances(balances);
    saveExpenses(expenses.filter(e => e.id !== pendingDeleteId));
  }

  closeModal();
  showToast('Entry deleted');
  renderEntries();
});

document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

/* ── Toast ───────────────────────────────────── */
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
}

/* ── Utilities ───────────────────────────────── */
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

/* ── Init ────────────────────────────────────── */
routeFromHash();
