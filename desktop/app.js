/**
 * FINANZASAPP — PANEL DE CONTROL LAPTOP / ESCRITORIO
 * Conexión centralizada a la base de datos en la nube y gráficos con Chart.js
 */

const API_BASE = window.location.origin + '/api';

// Generador de UUID v4
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Identificador único de laptop
let deviceId = localStorage.getItem('finanzas_laptop_device_id');
if (!deviceId) {
  deviceId = 'laptop-' + uuidv4().substring(0, 8);
  localStorage.setItem('finanzas_laptop_device_id', deviceId);
}

// Estado Desktop
const DesktopState = {
  token: localStorage.getItem('finanzas_token') || null,
  user: JSON.parse(localStorage.getItem('finanzas_user') || 'null'),
  accounts: [],
  transactions: [],
  cards: [],
  debts: [],
  budgets: [],
  recurring: [],
  analytics: null,
  lastSync: '1970-01-01T00:00:00.000Z',
  currentTxType: 'egreso',
  currentView: 'dashboard'
};

// Formateador de moneda en pesos colombianos ($ 500.000)
function formatCurrency(amount) {
  const val = parseFloat(amount) || 0;
  return '$ ' + Math.round(val).toLocaleString('es-CO');
}

// Instancias de gráficos Chart.js
let chartIncomeExpense = null;
let chartCategories = null;
let chartBudgets = null;
let chartNetworth = null;

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkAuthAndInit();
});

function setupEventListeners() {
  document.getElementById('btn-desktop-sync').addEventListener('click', () => syncWithCloud(true));
  document.getElementById('btn-desktop-logout').addEventListener('click', handleLogout);
  document.getElementById('form-desktop-tx').addEventListener('submit', handleDesktopTxSubmit);
  document.getElementById('form-desktop-account').addEventListener('submit', handleDesktopAccountSubmit);
  document.getElementById('form-desktop-card').addEventListener('submit', handleDesktopCardSubmit);
  document.getElementById('form-desktop-debt').addEventListener('submit', handleDesktopDebtSubmit);
  document.getElementById('form-desktop-debt-pay').addEventListener('submit', handleDesktopDebtPaymentSubmit);
  document.getElementById('form-desktop-budget').addEventListener('submit', handleDesktopBudgetSubmit);
  document.getElementById('form-desktop-auth').addEventListener('submit', handleDesktopAuthSubmit);
  
  const formAdminPass = document.getElementById('form-admin-change-pass');
  if (formAdminPass) formAdminPass.addEventListener('submit', handleAdminChangePassSubmit);

  // Fecha por defecto en modales
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('dtx-date');
  if (dateInput) dateInput.value = today;

  // Sincronización automática periódica cada 30 segundos
  setInterval(() => {
    if (DesktopState.token && navigator.onLine) {
      syncWithCloud(false);
    }
  }, 30000);
}

// Autenticación inicial
async function checkAuthAndInit() {
  if (!DesktopState.token) {
    openModal('modal-desktop-auth');
  } else {
    updateUserWidget();
    await fetchAllData();
  }
}

let desktopAuthMode = 'login';
function toggleDesktopAuthMode(mode) {
  desktopAuthMode = mode;
  document.getElementById('tab-dlogin').classList.toggle('active', mode === 'login');
  document.getElementById('tab-dregister').classList.toggle('active', mode === 'register');
  document.getElementById('dauth-group-name').style.display = mode === 'register' ? 'flex' : 'none';
  document.getElementById('btn-dauth-submit').textContent = mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta';
}

async function handleDesktopAuthSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('dauth-username');
  const passwordInput = document.getElementById('dauth-password');
  const nameInput = document.getElementById('dauth-name');

  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  const name = nameInput ? nameInput.value.trim() : '';

  if (!username || !password) {
    alert('Por favor escribe tu usuario y contraseña');
    return;
  }

  const endpoint = desktopAuthMode === 'login' ? '/auth/login' : '/auth/register';
  const body = desktopAuthMode === 'login' ? { username, password } : { username, password, name };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      DesktopState.token = data.token;
      DesktopState.user = data.user;
      localStorage.setItem('finanzas_token', data.token);
      localStorage.setItem('finanzas_user', JSON.stringify(data.user));
      closeModal('modal-desktop-auth');
      updateUserWidget();
      await fetchAllData();

      // Si es administrador (usuario 1, contraseña 1), entrar directo a la administración
      if (data.isAdmin || data.user.role === 'admin' || data.user.username === '1') {
        navigate('admin');
      }
    } else {
      alert(data.error || 'Usuario o contraseña incorrectos');
    }
  } catch (err) {
    alert('Error conectando con el servidor: ' + err.message);
  }
}

function handleLogout() {
  if (confirm('¿Cerrar sesión en esta laptop?')) {
    localStorage.clear();
    location.reload();
  }
}

function updateUserWidget() {
  if (DesktopState.user) {
    const username = DesktopState.user.username || 'Usuario';
    const name = DesktopState.user.name || username;
    const isAdmin = DesktopState.user.role === 'admin' || username === '1';

    document.getElementById('desktop-user-name').textContent = name;
    const roleEl = document.getElementById('desktop-user-role');
    if (roleEl) {
      roleEl.textContent = isAdmin ? '👑 Administrador' : `@${username}`;
      roleEl.style.color = isAdmin ? '#fbbf24' : '#60a5fa';
    }
    document.getElementById('desktop-avatar').textContent = (name || username).charAt(0).toUpperCase();

    // Mostrar botón de administración solo si es administrador
    const btnAdmin = document.getElementById('btn-nav-admin');
    if (btnAdmin) {
      btnAdmin.style.display = isAdmin ? 'flex' : 'none';
    }
  }
}

// ==========================================================
// CONSULTA COMPLETA Y SINCRONIZACIÓN EN LA NUBE
// ==========================================================

async function fetchAllData() {
  if (!DesktopState.token) return;
  setSyncBadge('syncing', 'Sincronizando...');

  try {
    const [accRes, txRes, cardRes, debtRes, budgetRes, recurRes, analyticsRes] = await Promise.all([
      fetch(`${API_BASE}/accounts`, { headers: { 'Authorization': `Bearer ${DesktopState.token}` } }),
      fetch(`${API_BASE}/transactions`, { headers: { 'Authorization': `Bearer ${DesktopState.token}` } }),
      fetch(`${API_BASE}/cards`, { headers: { 'Authorization': `Bearer ${DesktopState.token}` } }),
      fetch(`${API_BASE}/debts`, { headers: { 'Authorization': `Bearer ${DesktopState.token}` } }),
      fetch(`${API_BASE}/budgets`, { headers: { 'Authorization': `Bearer ${DesktopState.token}` } }),
      fetch(`${API_BASE}/recurring`, { headers: { 'Authorization': `Bearer ${DesktopState.token}` } }),
      fetch(`${API_BASE}/reports/analytics`, { headers: { 'Authorization': `Bearer ${DesktopState.token}` } })
    ]);

    if (accRes.ok) DesktopState.accounts = (await accRes.json()).accounts || [];
    if (txRes.ok) DesktopState.transactions = (await txRes.json()).transactions || [];
    if (cardRes.ok) DesktopState.cards = (await cardRes.json()).cards || [];
    if (debtRes.ok) DesktopState.debts = (await debtRes.json()).debts || [];
    if (budgetRes.ok) DesktopState.budgets = (await budgetRes.json()).budgets || [];
    if (recurRes.ok) DesktopState.recurring = (await recurRes.json()).rules || [];
    if (analyticsRes.ok) DesktopState.analytics = await analyticsRes.json();

    DesktopState.lastSync = new Date().toISOString();
    setSyncBadge('synced', '🟢 Sincronizado');
    const timeStr = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('desktop-last-sync').textContent = `Última sincronización: ${timeStr}`;

    renderDashboard();
    renderTransactionsTable();
    renderAccountsView();
    renderCardsView();
    renderDebtsView();
    renderBudgetsView();
    renderRecurringView();
    renderCalendarView();
    populateDesktopAccountSelects();
  } catch (err) {
    console.error('Error cargando datos en laptop:', err);
    setSyncBadge('offline', '🔴 Sin conexión');
  }
}

async function syncWithCloud(manual = false) {
  await fetchAllData();
  if (manual) alert('🟢 Información sincronizada exitosamente con la base de datos en la nube.');
}

function setSyncBadge(status, text) {
  const badge = document.getElementById('desktop-sync-badge');
  const txt = document.getElementById('desktop-sync-text');
  if (!badge || !txt) return;

  if (status === 'synced') {
    txt.textContent = text || '🟢 Sincronizado';
    badge.style.color = '#34d399';
  } else if (status === 'syncing') {
    txt.textContent = text || '🟡 Sincronizando...';
    badge.style.color = '#fbbf24';
  } else {
    txt.textContent = text || '🔴 Sin conexión';
    badge.style.color = '#f87171';
  }
}

// ==========================================================
// NAVEGACIÓN ENTRE VISTAS DESKTOP
// ==========================================================

function navigate(viewName) {
  DesktopState.currentView = viewName;
  document.querySelectorAll('.desktop-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add('active');

  const targetBtn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
  if (targetBtn) targetBtn.classList.add('active');

  // Actualizar títulos
  const titles = {
    dashboard: ['Dashboard Financiero', 'Visión general de tus finanzas en tiempo real'],
    transactions: ['Movimientos & Historial', 'Listado detallado con filtros avanzados'],
    accounts: ['Mis Cuentas y Efectivo', 'Gestión de bancos, billeteras digitales y dinero físico'],
    cards: ['Tarjetas de Crédito', 'Control de límites, cupo utilizado y fechas de corte'],
    debts: ['Deudas & Compromisos', 'Seguimiento de préstamos y registro de abonos'],
    budgets: ['Presupuestos', 'Control de gasto semanal y mensual por categoría'],
    recurring: ['Gastos Recurrentes', 'Suscripciones fijas, servicios y salarios'],
    calendar: ['Calendario de Pagos', 'Vencimientos próximos y fechas clave'],
    export: ['Informes & Exportación', 'Descarga de datos en CSV, JSON y reportes impresos'],
    admin: ['👑 Panel de Administración', 'Visualización de usuarios y control de contraseñas']
  };

  if (titles[viewName]) {
    document.getElementById('page-title').textContent = titles[viewName][0];
    document.getElementById('page-subtitle').textContent = titles[viewName][1];
  }

  if (viewName === 'dashboard') renderCharts();
  if (viewName === 'admin') loadAdminUsers();
}

// ==========================================================
// RENDERIZADO DEL DASHBOARD & KPIS
// ==========================================================

function renderDashboard() {
  // 1. Dinero Disponible Total, Cuentas y Efectivo
  let totalAvailable = 0;
  let banks = 0;
  let cash = 0;

  DesktopState.accounts.forEach(acc => {
    if (acc.is_deleted) return;
    const bal = parseFloat(acc.balance) || 0;
    totalAvailable += bal;
    if (acc.type && acc.type.toLowerCase() === 'efectivo') {
      cash += bal;
    } else {
      banks += bal;
    }
  });

  document.getElementById('kpi-total-available').textContent = formatCurrency(totalAvailable);
  document.getElementById('kpi-banks-balance').textContent = formatCurrency(banks);
  document.getElementById('kpi-cash-balance').textContent = formatCurrency(cash);

  // 2. Tarjetas de Crédito
  let totalLimit = 0;
  let totalUsed = 0;
  DesktopState.cards.forEach(c => {
    if (c.is_deleted) return;
    totalLimit += parseFloat(c.credit_limit) || 0;
    totalUsed += parseFloat(c.used_amount) || 0;
  });
  const creditAvail = Math.max(0, totalLimit - totalUsed);
  document.getElementById('kpi-credit-available').textContent = formatCurrency(creditAvail);
  document.getElementById('kpi-credit-total').textContent = `Límite Total: ${formatCurrency(totalLimit)}`;

  // 3. Deudas Pendientes
  let totalPendingDebt = 0;
  DesktopState.debts.forEach(d => {
    if (d.is_deleted) return;
    totalPendingDebt += parseFloat(d.pending_amount) || 0;
  });
  document.getElementById('kpi-total-debts').textContent = formatCurrency(totalPendingDebt);

  // 4. Ingresos, Egresos y Balance del Mes Actual
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  let monthInc = 0;
  let monthExp = 0;

  DesktopState.transactions.forEach(t => {
    if (t.is_deleted || (t.date && !t.date.startsWith(currentMonthStr))) return;
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'ingreso') monthInc += amt;
    if (t.type === 'egreso') monthExp += amt;
  });

  document.getElementById('kpi-month-income').textContent = '+' + formatCurrency(monthInc);
  document.getElementById('kpi-month-expense').textContent = '-' + formatCurrency(monthExp);

  const monthBalance = monthInc - monthExp;
  const balanceEl = document.getElementById('kpi-month-balance');
  balanceEl.textContent = (monthBalance >= 0 ? '+' : '') + formatCurrency(monthBalance);
  balanceEl.style.color = monthBalance >= 0 ? '#34d399' : '#f87171';

  // Render de Diagnósticos Inteligentes
  renderInsights();

  // Render de Gráficos Chart.js
  renderCharts();
}

function renderInsights() {
  const container = document.getElementById('insights-container');
  if (!container) return;

  if (DesktopState.analytics && DesktopState.analytics.insights) {
    container.innerHTML = DesktopState.analytics.insights.map(txt => `
      <p><i class="fas fa-check-circle" style="color: #60a5fa; margin-right: 6px;"></i> ${txt}</p>
    `).join('');
  } else {
    container.innerHTML = `<p>Registra transacciones para generar diagnósticos financieros automatizados.</p>`;
  }
}

// ==========================================================
// RENDERIZADO DE GRÁFICAS (CHART.JS) CON DATOS REALES
// ==========================================================

function renderCharts() {
  if (!window.Chart) return;

  // CHART 1: INGRESOS VS EGRESOS (ÚLTIMOS 6 MESES)
  const ctxIE = document.getElementById('chart-income-expense');
  if (ctxIE && DesktopState.analytics && DesktopState.analytics.charts) {
    const history = DesktopState.analytics.charts.monthlyHistory || [];
    const labels = history.map(h => h.month);
    const incomeData = history.map(h => h.income);
    const expenseData = history.map(h => h.expense);

    if (chartIncomeExpense) chartIncomeExpense.destroy();
    chartIncomeExpense = new Chart(ctxIE, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Ingresos', data: incomeData, backgroundColor: '#10b981', borderRadius: 6 },
          { label: 'Egresos', data: expenseData, backgroundColor: '#ef4444', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8' } } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  // CHART 2: GASTOS POR CATEGORÍA
  const ctxCat = document.getElementById('chart-categories');
  if (ctxCat && DesktopState.analytics && DesktopState.analytics.charts) {
    const catData = DesktopState.analytics.charts.byCategory || { labels: [], values: [] };

    const labels = catData.labels.length > 0 ? catData.labels : ['Sin gastos'];
    const values = catData.values.length > 0 ? catData.values : [1];
    const colors = ['#ef4444', '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

    if (chartCategories) chartCategories.destroy();
    chartCategories = new Chart(ctxCat, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#141e33'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } }
      }
    });
  }

  // CHART 3: PRESUPUESTOS VS GASTO REAL
  const ctxB = document.getElementById('chart-budgets-bar');
  if (ctxB) {
    const activeBudgets = DesktopState.budgets.filter(b => !b.is_deleted);
    const bLabels = activeBudgets.map(b => b.category || 'General');
    const bLimits = activeBudgets.map(b => parseFloat(b.limit_amount) || 0);
    const bSpents = activeBudgets.map(b => {
      return DesktopState.transactions
        .filter(t => !t.is_deleted && t.type === 'egreso' && (!b.category || b.category === t.category))
        .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    });

    if (chartBudgets) chartBudgets.destroy();
    chartBudgets = new Chart(ctxB, {
      type: 'bar',
      data: {
        labels: bLabels.length > 0 ? bLabels : ['Sin presupuestos'],
        datasets: [
          { label: 'Presupuesto Límite', data: bLimits.length > 0 ? bLimits : [0], backgroundColor: '#3b82f6', borderRadius: 4 },
          { label: 'Gasto Real', data: bSpents.length > 0 ? bSpents : [0], backgroundColor: '#f59e0b', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8' } } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  // CHART 4: PATRIMONIO ACTIVO VS PASIVO
  const ctxNW = document.getElementById('chart-networth');
  if (ctxNW) {
    let totalCash = 0;
    let totalBanks = 0;
    let totalDebts = 0;

    DesktopState.accounts.forEach(a => {
      if (a.is_deleted) return;
      const b = parseFloat(a.balance) || 0;
      if (a.type && a.type.toLowerCase() === 'efectivo') totalCash += b;
      else totalBanks += b;
    });
    DesktopState.debts.forEach(d => {
      if (!d.is_deleted) totalDebts += parseFloat(d.pending_amount) || 0;
    });

    if (chartNetworth) chartNetworth.destroy();
    chartNetworth = new Chart(ctxNW, {
      type: 'pie',
      data: {
        labels: ['Dinero en Bancos', 'Efectivo Físico', 'Deudas Pendientes'],
        datasets: [{
          data: [totalBanks, totalCash, totalDebts],
          backgroundColor: ['#2563eb', '#10b981', '#ef4444'],
          borderWidth: 2,
          borderColor: '#141e33'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } }
      }
    });
  }
}

// ==========================================================
// TABLA DE MOVIMIENTOS Y FILTROS AVANZADOS
// ==========================================================

function renderTransactionsTable() {
  const tbody = document.getElementById('transactions-tbody');
  if (!tbody) return;

  const search = (document.getElementById('filter-search')?.value || '').toLowerCase();
  const typeFilter = document.getElementById('filter-type')?.value || 'todos';
  const accountFilter = document.getElementById('filter-account')?.value || 'todas';
  const startDate = document.getElementById('filter-start-date')?.value;
  const endDate = document.getElementById('filter-end-date')?.value;

  let filtered = [...DesktopState.transactions].filter(t => !t.is_deleted);

  if (typeFilter !== 'todos') filtered = filtered.filter(t => t.type === typeFilter);
  if (accountFilter !== 'todas') filtered = filtered.filter(t => t.account_id === accountFilter || t.to_account_id === accountFilter);
  if (startDate) filtered = filtered.filter(t => t.date >= startDate);
  if (endDate) filtered = filtered.filter(t => t.date <= endDate);
  if (search) {
    filtered = filtered.filter(t =>
      (t.description && t.description.toLowerCase().includes(search)) ||
      (t.category && t.category.toLowerCase().includes(search)) ||
      (t.notes && t.notes.toLowerCase().includes(search))
    );
  }

  // Ordenar descendente
  filtered.sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`) - new Date(`${a.date}T${a.time || '00:00'}`));

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 24px;">No se encontraron movimientos con los filtros seleccionados.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const isExp = t.type === 'egreso';
    const isInc = t.type === 'ingreso';
    const sign = isExp ? '-' : (isInc ? '+' : '⇄ ');
    const amtClass = isExp ? '#f87171' : (isInc ? '#34d399' : '#60a5fa');

    const acc = DesktopState.accounts.find(a => a.id === t.account_id);
    let accName = acc ? acc.name : 'Cuenta';
    if (t.type === 'transferencia' && t.to_account_id) {
      const toAcc = DesktopState.accounts.find(a => a.id === t.to_account_id);
      accName += ` → ${toAcc ? toAcc.name : 'Destino'}`;
    }

    return `
      <tr>
        <td><strong>${t.date}</strong> <span style="font-size: 0.75rem; color: #94a3b8;">${t.time || ''}</span></td>
        <td><span class="badge-tag ${t.type}">${t.type}</span></td>
        <td>${t.description || t.category}</td>
        <td>${t.category}</td>
        <td>${accName}</td>
        <td>${t.payment_method || 'Transferencia'}</td>
        <td style="font-weight: 700; color: ${amtClass};">${sign}${formatCurrency(t.amount)}</td>
        <td>
          <button class="btn-icon-logout" title="Eliminar transacción" onclick="deleteTransaction('${t.id}')">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function applyFilters() {
  renderTransactionsTable();
}

async function deleteTransaction(id) {
  if (!confirm('¿Eliminar esta transacción? Su impacto en saldos será revertido.')) return;

  try {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${DesktopState.token}` }
    });
    if (res.ok) {
      await fetchAllData();
    } else {
      alert('Error eliminando transacción');
    }
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  }
}

// ==========================================================
// VISTAS: CUENTAS, TARJETAS, DEUDAS, PRESUPUESTOS
// ==========================================================

function renderAccountsView() {
  const grid = document.getElementById('accounts-grid');
  if (!grid) return;

  const active = DesktopState.accounts.filter(a => !a.is_deleted);
  if (active.length === 0) {
    grid.innerHTML = `<p style="color: #94a3b8;">No tienes cuentas creadas.</p>`;
    return;
  }

  grid.innerHTML = active.map(a => `
    <div class="account-box">
      <div class="account-box-head">
        <div class="acc-icon-circle"><i class="fas fa-${a.icon || 'wallet'}"></i></div>
        <span class="badge-tag ingreso">${a.type}</span>
      </div>
      <h4>${a.name}</h4>
      <div class="balance">${formatCurrency(a.balance)}</div>
    </div>
  `).join('');
}

function renderCardsView() {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  const active = DesktopState.cards.filter(c => !c.is_deleted);
  if (active.length === 0) {
    grid.innerHTML = `<p style="color: #94a3b8;">No tienes tarjetas de crédito registradas.</p>`;
    return;
  }

  grid.innerHTML = active.map(c => {
    const limit = parseFloat(c.credit_limit) || 0;
    const used = parseFloat(c.used_amount) || 0;
    const avail = Math.max(0, limit - used);

    return `
      <div class="credit-card-ui">
        <div class="cc-chip-row">
          <div class="cc-chip"></div>
          <span class="cc-bank">${c.bank}</span>
        </div>
        <div style="font-size: 1.15rem; font-weight: 700;">${c.name}</div>
        <div class="cc-meta-row">
          <div><span>Cupo Total</span><strong>${formatCurrency(limit)}</strong></div>
          <div><span>Utilizado</span><strong>${formatCurrency(used)}</strong></div>
          <div><span>Disponible</span><strong style="color: #34d399;">${formatCurrency(avail)}</strong></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #cbd5e1; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
          <span>Corte: Día ${c.cutoff_day}</span>
          <span>Pago: Día ${c.payment_day}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderDebtsView() {
  const tbody = document.getElementById('debts-tbody');
  if (!tbody) return;

  const active = DesktopState.debts.filter(d => !d.is_deleted);
  if (active.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 24px;">No tienes deudas pendientes.</td></tr>`;
    return;
  }

  tbody.innerHTML = active.map(d => `
    <tr>
      <td><strong>${d.entity_person}</strong></td>
      <td>${d.description || 'Sin descripción'}</td>
      <td>${formatCurrency(d.initial_amount)}</td>
      <td style="color: #f87171; font-weight: 700;">${formatCurrency(d.pending_amount)}</td>
      <td>${formatCurrency(d.monthly_installment || 0)}</td>
      <td>${d.due_date || 'Sin fecha'}</td>
      <td><span class="badge-status ${d.status}">${d.status}</span></td>
      <td>
        <button class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openDesktopDebtPayModal('${d.id}', '${d.entity_person}', ${d.pending_amount})">
          Abonar
        </button>
      </td>
    </tr>
  `).join('');
}

function renderBudgetsView() {
  const container = document.getElementById('budgets-container');
  if (!container) return;

  const active = DesktopState.budgets.filter(b => !b.is_deleted);
  if (active.length === 0) {
    container.innerHTML = `<p style="color: #94a3b8;">No has definido presupuestos mensuales ni semanales.</p>`;
    return;
  }

  container.innerHTML = active.map(b => {
    const limit = parseFloat(b.limit_amount) || 0;
    const spent = DesktopState.transactions
      .filter(t => !t.is_deleted && t.type === 'egreso' && (!b.category || b.category === t.category))
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
    const barColor = pct >= 100 ? '#ef4444' : (pct >= 80 ? '#f59e0b' : '#3b82f6');

    return `
      <div class="account-box">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h4>${b.category || 'Presupuesto General'}</h4>
          <span style="font-size: 0.8rem; font-weight: 700; color: ${barColor};">${pct}%</span>
        </div>
        <div style="width: 100%; height: 8px; background: #090d16; border-radius: 4px; overflow: hidden; margin: 8px 0;">
          <div style="height: 100%; width: ${pct}%; background: ${barColor}; border-radius: 4px;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
          <span>Gastado: <strong>${formatCurrency(spent)}</strong></span>
          <span>Límite: <strong>${formatCurrency(limit)}</strong></span>
        </div>
      </div>
    `;
  }).join('');
}

function renderRecurringView() {
  const tbody = document.getElementById('recurring-tbody');
  if (!tbody) return;

  const active = DesktopState.recurring.filter(r => !r.is_deleted);
  if (active.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 24px;">No hay reglas recurrentes configuradas.</td></tr>`;
    return;
  }

  tbody.innerHTML = active.map(r => {
    const acc = DesktopState.accounts.find(a => a.id === r.account_id);
    return `
      <tr>
        <td><span class="badge-tag ${r.type}">${r.type}</span></td>
        <td><strong>${r.description}</strong></td>
        <td>${r.category}</td>
        <td style="font-weight: 700;">${formatCurrency(r.amount)}</td>
        <td>${r.frequency}</td>
        <td>Día ${r.execution_day}</td>
        <td>${acc ? acc.name : 'Cuenta'}</td>
        <td>
          <button class="btn-icon-logout" onclick="deleteRecurring('${r.id}')"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

async function deleteRecurring(id) {
  if (!confirm('¿Eliminar esta regla recurrente?')) return;
  await fetch(`${API_BASE}/recurring/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${DesktopState.token}` }
  });
  await fetchAllData();
}

function renderCalendarView() {
  const container = document.getElementById('calendar-events-container');
  if (!container) return;

  const events = [];
  // Tarjetas
  DesktopState.cards.forEach(c => {
    if (!c.is_deleted) {
      events.push({ title: `Corte Tarjeta: ${c.name}`, day: c.cutoff_day, type: 'corte' });
      events.push({ title: `Pago Tarjeta: ${c.name}`, day: c.payment_day, type: 'pago' });
    }
  });
  // Deudas
  DesktopState.debts.forEach(d => {
    if (!d.is_deleted && d.due_date) {
      events.push({ title: `Vencimiento Deuda: ${d.entity_person} (${formatCurrency(d.pending_amount)})`, day: d.due_date, type: 'deuda' });
    }
  });

  if (events.length === 0) {
    container.innerHTML = `<p style="color: #94a3b8;">No hay compromisos financieros próximos programados.</p>`;
    return;
  }

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
      ${events.map(ev => `
        <div class="account-box">
          <div style="font-size: 0.8rem; color: #60a5fa; text-transform: uppercase;"><i class="fas fa-calendar-day"></i> Compromiso</div>
          <strong>${ev.title}</strong>
          <span style="font-size: 0.85rem; color: #94a3b8;">Fecha / Día programado: ${ev.day}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ==========================================================
// SELECTORES DINÁMICOS
// ==========================================================

function populateDesktopAccountSelects() {
  const accSel = document.getElementById('dtx-account');
  const toAccSel = document.getElementById('dtx-to-account');
  const debtAccSel = document.getElementById('dtx-debt-account');
  const filterAcc = document.getElementById('filter-account');

  const options = DesktopState.accounts
    .filter(a => !a.is_deleted)
    .map(a => `<option value="${a.id}">${a.name} (${formatCurrency(a.balance)})</option>`)
    .join('');

  if (accSel) accSel.innerHTML = options;
  if (toAccSel) toAccSel.innerHTML = options;
  if (debtAccSel) debtAccSel.innerHTML = options;
  if (filterAcc) filterAcc.innerHTML = `<option value="todas">Todas las cuentas</option>` + options;

  populateDesktopCategorySelect();
}

const expenseCategories = [
  'Alimentación', 'Mercado', 'Restaurante', 'Transporte', 'Bus', 'Taxi', 'Gasolina',
  'Educación', 'Vivienda', 'Arriendo', 'Servicios', 'Internet', 'Entretenimiento',
  'Streaming', 'Salud', 'Compras', 'Ropa', 'Tecnología', 'Finanzas', 'Otros'
];
const incomeCategories = [
  'Salario', 'Trabajo', 'Negocio', 'Ventas', 'Comisión', 'Inversiones', 'Regalos', 'Otros'
];

function populateDesktopCategorySelect() {
  const catSel = document.getElementById('dtx-category');
  const bCatSel = document.getElementById('dbudget-category');
  if (!catSel) return;

  const cats = DesktopState.currentTxType === 'ingreso' ? incomeCategories : expenseCategories;
  catSel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');

  if (bCatSel) {
    bCatSel.innerHTML = `<option value="todas">Presupuesto General</option>` + expenseCategories.map(c => `<option value="${c}">${c}</option>`).join('');
  }
}

// ==========================================================
// MODAL DE MOVIMIENTOS DESKTOP
// ==========================================================

function openTxModal(type = 'egreso') {
  setDesktopTxType(type);
  document.getElementById('dtx-amount').value = '';
  document.getElementById('dtx-description').value = '';
  openModal('modal-tx');
}

function setDesktopTxType(type) {
  DesktopState.currentTxType = type;
  document.querySelectorAll('#modal-tx .tx-type-tabs .type-tab').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-type') === type);
  });

  const isTransfer = type === 'transferencia';
  document.getElementById('dtx-group-to-account').style.display = isTransfer ? 'flex' : 'none';
  document.getElementById('dtx-group-category').style.display = isTransfer ? 'none' : 'flex';
  document.getElementById('lbl-dtx-account').textContent = isTransfer ? 'Cuenta Origen' : 'Cuenta';

  populateDesktopCategorySelect();
}

async function handleDesktopTxSubmit(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('dtx-amount').value);
  const account_id = document.getElementById('dtx-account').value;
  const to_account_id = document.getElementById('dtx-to-account').value;
  const category = document.getElementById('dtx-category').value;
  const description = document.getElementById('dtx-description').value;
  const date = document.getElementById('dtx-date').value;
  const payment_method = document.getElementById('dtx-method').value;
  const notes = document.getElementById('dtx-notes').value;

  if (!amount || amount <= 0 || !account_id) return alert('Por favor ingresa un monto válido y una cuenta');

  const newTx = {
    id: uuidv4(),
    account_id,
    to_account_id: DesktopState.currentTxType === 'transferencia' ? to_account_id : null,
    type: DesktopState.currentTxType,
    amount,
    category: DesktopState.currentTxType === 'transferencia' ? 'Transferencia' : category,
    description: description || (DesktopState.currentTxType === 'transferencia' ? 'Transferencia entre cuentas' : category),
    payment_method,
    date,
    notes,
    device_id: deviceId
  };

  try {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DesktopState.token}`
      },
      body: JSON.stringify(newTx)
    });

    if (res.ok) {
      closeModal('modal-tx');
      await fetchAllData();
    } else {
      const data = await res.json();
      alert('Error registrando transacción: ' + (data.error || 'Desconocido'));
    }
  } catch (err) {
    alert('Error al conectar con la base de datos en la nube: ' + err.message);
  }
}

// Abono a Deuda en Desktop
function openDesktopDebtPayModal(debtId, entity, pending) {
  document.getElementById('dtx-debt-id').value = debtId;
  document.getElementById('dtx-debt-info').textContent = `Deuda con: ${entity} | Saldo Pendiente: ${formatCurrency(pending)}`;
  document.getElementById('dtx-debt-amount').value = '';
  openModal('modal-debt-pay');
}

async function handleDesktopDebtPaymentSubmit(e) {
  e.preventDefault();
  const debtId = document.getElementById('dtx-debt-id').value;
  const amount = parseFloat(document.getElementById('dtx-debt-amount').value);
  const account_id = document.getElementById('dtx-debt-account').value;

  if (!amount || amount <= 0) return alert('Monto inválido');

  try {
    const res = await fetch(`${API_BASE}/debts/${debtId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DesktopState.token}`
      },
      body: JSON.stringify({ amount, account_id, device_id: deviceId })
    });

    if (res.ok) {
      closeModal('modal-debt-pay');
      await fetchAllData();
    } else {
      alert('Error registrando abono');
    }
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  }
}

// Nueva Cuenta
async function handleDesktopAccountSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('dacc-name').value;
  const type = document.getElementById('dacc-type').value;
  const balance = parseFloat(document.getElementById('dacc-balance').value) || 0;

  try {
    const res = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DesktopState.token}`
      },
      body: JSON.stringify({ name, type, balance, device_id: deviceId })
    });

    if (res.ok) {
      closeModal('modal-account');
      await fetchAllData();
    }
  } catch (err) {
    alert('Error creando cuenta');
  }
}

// Nueva Tarjeta
async function handleDesktopCardSubmit(e) {
  e.preventDefault();
  const bank = document.getElementById('dcard-bank').value;
  const name = document.getElementById('dcard-name').value;
  const credit_limit = parseFloat(document.getElementById('dcard-limit').value);
  const used_amount = parseFloat(document.getElementById('dcard-used').value) || 0;
  const cutoff_day = parseInt(document.getElementById('dcard-cutoff').value);
  const payment_day = parseInt(document.getElementById('dcard-payment').value);

  try {
    const res = await fetch(`${API_BASE}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DesktopState.token}`
      },
      body: JSON.stringify({ bank, name, credit_limit, used_amount, cutoff_day, payment_day, device_id: deviceId })
    });

    if (res.ok) {
      closeModal('modal-card');
      await fetchAllData();
    }
  } catch (err) {
    alert('Error guardando tarjeta');
  }
}

// Nueva Deuda
async function handleDesktopDebtSubmit(e) {
  e.preventDefault();
  const entity_person = document.getElementById('ddebt-entity').value;
  const description = document.getElementById('ddebt-desc').value;
  const initial_amount = parseFloat(document.getElementById('ddebt-initial').value);
  const pending_amount = parseFloat(document.getElementById('ddebt-pending').value);
  const monthly_installment = parseFloat(document.getElementById('ddebt-installment').value) || 0;
  const due_date = document.getElementById('ddebt-due').value || null;

  try {
    const res = await fetch(`${API_BASE}/debts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DesktopState.token}`
      },
      body: JSON.stringify({ entity_person, description, initial_amount, pending_amount, monthly_installment, due_date, device_id: deviceId })
    });

    if (res.ok) {
      closeModal('modal-debt');
      await fetchAllData();
    }
  } catch (err) {
    alert('Error registrando deuda');
  }
}

// Nuevo Presupuesto
async function handleDesktopBudgetSubmit(e) {
  e.preventDefault();
  const category = document.getElementById('dbudget-category').value;
  const limit_amount = parseFloat(document.getElementById('dbudget-limit').value);
  const start_date = document.getElementById('dbudget-start').value;
  const end_date = document.getElementById('dbudget-end').value;

  try {
    const res = await fetch(`${API_BASE}/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DesktopState.token}`
      },
      body: JSON.stringify({ category, limit_amount, start_date, end_date, device_id: deviceId })
    });

    if (res.ok) {
      closeModal('modal-budget');
      await fetchAllData();
    }
  } catch (err) {
    alert('Error creando presupuesto');
  }
}

// ==========================================================
// EXPORTACIÓN DE DATOS
// ==========================================================

function exportCsv() {
  if (!DesktopState.token) return;
  window.open(`${API_BASE}/export/csv?token=${DesktopState.token}`, '_blank');
}

function exportJson() {
  const data = {
    exported_at: new Date().toISOString(),
    accounts: DesktopState.accounts,
    transactions: DesktopState.transactions,
    cards: DesktopState.cards,
    debts: DesktopState.debts,
    budgets: DesktopState.budgets,
    recurring: DesktopState.recurring
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finanzas_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

// Helpers de Modales
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'flex';
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

// ==========================================================
// MODO ADMINISTRADOR (USUARIO 1, CONTRASEÑA 1)
// ==========================================================

async function loadAdminUsers() {
  if (!DesktopState.token) return;
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #94a3b8; padding: 20px;">Cargando usuarios...</td></tr>`;

  try {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { 'Authorization': `Bearer ${DesktopState.token}` }
    });
    const data = await res.json();
    if (data.success) {
      const users = data.users || [];
      if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #94a3b8; padding: 20px;">No hay usuarios registrados.</td></tr>`;
        return;
      }

      tbody.innerHTML = users.map(u => `
        <tr>
          <td><strong style="color: #60a5fa;">${u.username}</strong></td>
          <td>${u.name || u.username}</td>
          <td><span class="badge-tag ${u.role === 'admin' ? 'egreso' : 'ingreso'}">${u.role}</span></td>
          <td>
            <code style="background: rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 6px; font-weight: 700; color: #fbbf24;">
              ${u.password_plain || '••••••••'}
            </code>
          </td>
          <td>${(u.created_at || '').substring(0, 10)}</td>
          <td>${u.accounts_count}</td>
          <td>${u.transactions_count}</td>
          <td style="font-weight: 700;">${formatCurrency(u.total_balance)}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn-primary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="openAdminChangePassModal('${u.id}', '${u.username}')">
                <i class="fas fa-key"></i> Cambiar
              </button>
              ${u.username !== '1' ? `
                <button class="btn-icon-logout" title="Eliminar usuario" onclick="adminDeleteUser('${u.id}', '${u.username}')">
                  <i class="fas fa-trash"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #f87171; padding: 20px;">${data.error || 'Acceso no autorizado'}</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #f87171; padding: 20px;">Error al cargar usuarios: ${err.message}</td></tr>`;
  }
}

function openAdminChangePassModal(userId, username) {
  document.getElementById('admin-target-user-id').value = userId;
  document.getElementById('admin-target-user-info').textContent = `Usuario: @${username}`;
  document.getElementById('admin-new-password').value = '';
  openModal('modal-admin-change-pass');
}

async function handleAdminChangePassSubmit(e) {
  e.preventDefault();
  const userId = document.getElementById('admin-target-user-id').value;
  const new_password = document.getElementById('admin-new-password').value;

  if (!new_password) return alert('Ingresa una contraseña');

  try {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DesktopState.token}`
      },
      body: JSON.stringify({ new_password })
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ ' + data.message);
      closeModal('modal-admin-change-pass');
      loadAdminUsers();
    } else {
      alert('Error: ' + data.error);
    }
  } catch (err) {
    alert('Error al actualizar contraseña: ' + err.message);
  }
}

async function adminDeleteUser(userId, username) {
  if (!confirm(`¿Estás seguro de eliminar al usuario @${username}? Esta acción no se puede deshacer.`)) return;

  try {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${DesktopState.token}` }
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ ' + data.message);
      loadAdminUsers();
    } else {
      alert('Error: ' + data.error);
    }
  } catch (err) {
    alert('Error al eliminar usuario: ' + err.message);
  }
}
