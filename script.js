/* ── Init Fix (IMPORTANT) ───────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  routeFromHash();
});

/* ── Storage ───────────────────────────────── */
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

/* ── Format helpers ───────────────────────── */
function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR' }).format(n);
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' });
}

/* ── Navigation ───────────────────────────── */
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

/* ── Routing ─────────────────────────────── */
function routeFromHash() {
  const map = { '#home':'home', '#entries':'entries', '#add-expense':'add-expense', '#add-balance':'add-balance' };
  navigate(map[location.hash] || 'home');
}

window.addEventListener('hashchange', routeFromHash);

/* ── Home Page ───────────────────────────── */
function computeSummary() {
  const balances  = loadBalances();
  const expenses  = loadExpenses();
  const total     = balances.cash + balances.upi + balances.bank;
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  const catMap = {};
  expenses.forEach(e => {
    catMap[e.category] = catMap[e.category] || 0;
    catMap[e.category] += e.amount;
  });

  const catBreakdown = Object.entries(catMap)
    .map(([cat, total]) => ({
      cat,
      total,
      pct: totalSpent > 0 ? Math.round(total/totalSpent*100) : 0
    }))
    .sort((a,b) => b.total - a.total);

  const recent = [...expenses].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  return { balances, total, totalSpent, count: expenses.length, catBreakdown, recent };
}

function renderHome() {
  const s = computeSummary();

  setText('total-balance', fmt(s.total));
  setText('total-spent', fmt(s.totalSpent));
  setText('tx-count', s.count + ' transactions');

  if (s.catBreakdown.length > 0) {
    setText('top-category', s.catBreakdown[0].cat);
  } else {
    setText('top-category', 'None');
  }

  drawPie(s.catBreakdown);
  drawBar(s.balances);
  renderRecentList(s.recent);
}

/* ── Pie Chart ───────────────────────────── */
function drawPie(data) {
  const canvas = document.getElementById('pie-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let total = data.reduce((s, d) => s + d.total, 0);
  if (total === 0) return;

  let angle = 0;
  data.forEach((d, i) => {
    const slice = (d.total / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(100, 100);
    ctx.arc(100, 100, 80, angle, angle + slice);
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    angle += slice;
  });
}

/* ── Bar Chart (FIXED) ───────────────────── */
function drawBar(balances) {
  const canvas = document.getElementById('bar-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const items = [
    { label:'Bank', value: balances.bank, color: COLORS[1] },
    { label:'UPI',  value: balances.upi,  color: COLORS[3] },
    { label:'Cash', value: balances.cash, color: COLORS[2] },
  ];

  const max = Math.max(...items.map(i => i.value), 1);

  items.forEach((item, i) => {
    const y = 30 * i + 20;
    const width = (item.value / max) * 200;

    ctx.fillStyle = item.color;
    ctx.fillRect(50, y, width, 20);

    ctx.fillStyle = '#000';
    ctx.fillText(item.label, 10, y + 15);
  });
}

/* ── Recent List ─────────────────────────── */
function renderRecentList(list) {
  const el = document.getElementById('recent-list');
  if (!el) return;

  el.innerHTML = list.map(e => `
    <div>${cap(e.category)} - ${fmt(e.amount)}</div>
  `).join('');
}

/* ── Add Expense ─────────────────────────── */
document.getElementById('expense-form')?.addEventListener('submit', function(e) {
  e.preventDefault();

  const amount = parseFloat(document.getElementById('exp-amount').value);
  const cat = document.getElementById('exp-category').value;
  const method = document.getElementById('exp-method').value;

  if (!amount) return;

  const expenses = loadExpenses();
  expenses.push({ id: nextId(), amount, category: cat, paymentMethod: method, date: new Date().toISOString() });
  saveExpenses(expenses);

  const balances = loadBalances();
  balances[method] -= amount;
  saveBalances(balances);

  this.reset();
  alert("Expense added");
});

/* ── Add Balance ─────────────────────────── */
document.getElementById('balance-form')?.addEventListener('submit', function(e) {
  e.preventDefault();

  const type = document.getElementById('bal-type').value;
  const amount = parseFloat(document.getElementById('bal-amount').value);

  const balances = loadBalances();
  balances[type] += amount;
  saveBalances(balances);

  this.reset();
  alert("Balance updated");
});

/* ── Utils ──────────────────────────────── */
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
