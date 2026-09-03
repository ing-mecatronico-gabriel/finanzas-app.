/**
 * FINANZASAPP — CLIENTE MÓVIL PWA
 * Arquitectura Offline-First con Cola de Sincronización Local y Resolución LWW
 */

const API_BASE = window.location.origin + '/api';

// Generador de UUID v4 para registros únicos
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Identificador único persistente del dispositivo celular
let deviceId = localStorage.getItem('finanzas_mobile_device_id');
if (!deviceId) {
  deviceId = 'mobile-' + uuidv4().substring(0, 8);
  localStorage.setItem('finanzas_mobile_device_id', deviceId);
}

// Estado de la aplicación
const AppState = {
  token: localStorage.getItem('finanzas_token') || null,
  user: JSON.parse(localStorage.getItem('finanzas_user') || 'null'),
  accounts: JSON.parse(localStorage.getItem('finanzas_accounts') || '[]'),
  transactions: JSON.parse(localStorage.getItem('finanzas_transactions') || '[]'),
  cards: JSON.parse(localStorage.getItem('finanzas_cards') || '[]'),
  debts: JSON.parse(localStorage.getItem('finanzas_debts') || '[]'),
  budgets: JSON.parse(localStorage.getItem('finanzas_budgets') || '[]'),
  syncQueue: JSON.parse(localStorage.getItem('finanzas_mobile_queue') || '[]'),
  lastSync: localStorage.getItem('finanzas_last_sync') || '1970-01-01T00:00:00.000Z',
  isOnline: navigator.onLine,
  isSyncing: false,
  currentTxType: 'egreso',
  activeTab: 'home'
};

// Formateador de moneda en pesos colombianos ($ 500.000)
function formatCurrency(amount) {
  const val = parseFloat(amount) || 0;
  return '$ ' + Math.round(val).toLocaleString('es-CO');
}

// Registro del Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/mobile/sw.js')
      .then(reg => console.log('📱 Service Worker registrado con éxito:', reg.scope))
      .catch(err => console.warn('⚠️ Error registrando SW:', err));
  });
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkAuthAndInit();
});

function setupEventListeners() {
  // Detección de conectividad en tiempo real
  window.addEventListener('online', () => {
    AppState.isOnline = true;
    document.getElementById('offline-banner').style.display = 'none';
    updateSyncIndicator('syncing', 'Conectando...');
    performAutoSync();
  });

  window.addEventListener('offline', () => {
    AppState.isOnline = false;
    document.getElementById('offline-banner').style.display = 'flex';
    updateSyncIndicator('offline', 'Sin conexión');
  });

  // Botón flotante (+)
  document.getElementById('btn-floating-add').addEventListener('click', () => {
    openTransactionModal(AppState.currentTxType);
  });

  // Formulario de Transacción
  document.getElementById('form-transaction').addEventListener('submit', handleTransactionSubmit);

  // Formulario de Abono a Deuda
  document.getElementById('form-debt-payment').addEventListener('submit', handleDebtPaymentSubmit);

  // Formulario de Nueva Cuenta
  document.getElementById('btn-add-account-quick').addEventListener('click', () => {
    openModal('modal-new-account');
  });
  document.getElementById('form-new-account').addEventListener('submit', handleNewAccountSubmit);

  // Sincronización Manual
  document.getElementById('btn-manual-sync').addEventListener('click', () => {
    performAutoSync(true);
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', handleLogout);

  // Formulario de Auth
  document.getElementById('form-auth').addEventListener('submit', handleAuthSubmit);

  // Fecha por defecto en transacciones
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('tx-date');
  if (dateInput) dateInput.value = today;
}

// Autenticación inicial
async function checkAuthAndInit() {
  if (!AppState.token) {
    // Si no hay token, crear automáticamente usuario demo o abrir modal auth
    openAuthModal();
  } else {
    updateUserDisplay();
    renderAllViews();
    if (AppState.isOnline) {
      await performAutoSync();
    } else {
      updateSyncIndicator('offline', 'Sin conexión');
    }
  }
}

function openAuthModal() {
  const modal = document.getElementById('modal-auth');
  if (modal) modal.style.display = 'flex';
}

function closeAuthModal() {
  const modal = document.getElementById('modal-auth');
  if (modal) modal.style.display = 'none';
}

let authMode = 'login';
function toggleAuthMode(mode) {
  authMode = mode;
  document.getElementById('tab-login').classList.toggle('active', mode === 'login');
  document.getElementById('tab-register').classList.toggle('active', mode === 'register');
  document.getElementById('auth-group-name').style.display = mode === 'register' ? 'flex' : 'none';
  document.getElementById('btn-auth-submit').textContent = mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta';
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');
  const nameInput = document.getElementById('auth-name');

  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  const name = nameInput ? nameInput.value.trim() : '';

  if (!username || !password) {
    alert('Ingresa tu usuario y contraseña');
    return;
  }

  const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
  const body = authMode === 'login' ? { username, password } : { username, password, name };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      AppState.token = data.token;
      AppState.user = data.user;
      localStorage.setItem('finanzas_token', data.token);
      localStorage.setItem('finanzas_user', JSON.stringify(data.user));
      closeAuthModal();
      updateUserDisplay();
      await performAutoSync();
    } else {
      alert(data.error || 'Usuario o contraseña incorrectos');
    }
  } catch (err) {
    alert('No se pudo conectar con el servidor: ' + err.message);
  }
}

function handleLogout() {
  if (confirm('¿Cerrar sesión en este dispositivo?')) {
    localStorage.clear();
    location.reload();
  }
}

function updateUserDisplay() {
  if (AppState.user) {
    const username = AppState.user.username || 'Usuario';
    const name = AppState.user.name || username;
    const isAdmin = AppState.user.role === 'admin' || username === '1';

    document.getElementById('user-display-name').textContent = name;
    document.getElementById('setting-user-name').textContent = name;
    
    const roleEl = document.getElementById('setting-user-role');
    if (roleEl) {
      roleEl.textContent = isAdmin ? '👑 Administrador' : `@${username}`;
      roleEl.style.color = isAdmin ? '#fbbf24' : '#60a5fa';
    }
    document.getElementById('header-avatar').textContent = (name || username).charAt(0).toUpperCase();

    // Mostrar panel admin si es usuario 1 / admin
    const adminItem = document.getElementById('item-admin-mobile');
    if (adminItem) {
      adminItem.style.display = isAdmin ? 'flex' : 'none';
    }
  }
}

// ==========================================================
// MOTOR DE SINCRONIZACIÓN OFFLINE-FIRST (PUSH + PULL)
// ==========================================================

async function performAutoSync(manual = false) {
  if (!AppState.token || AppState.isSyncing) return;
  if (!navigator.onLine) {
    updateSyncIndicator('offline', 'Sin conexión');
    return;
  }

  AppState.isSyncing = true;
  updateSyncIndicator('syncing', 'Sincronizando...');

  try {
    // PASO 1: Subir cambios locales acumulados en la cola offline (PUSH)
    if (AppState.syncQueue.length > 0) {
      const itemsToPush = [...AppState.syncQueue];
      const pushRes = await fetch(`${API_BASE}/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AppState.token}`
        },
        body: JSON.stringify({
          device_id: deviceId,
          items: itemsToPush
        })
      });

      if (pushRes.ok) {
        // Vaciar la cola de cambios subidos
        AppState.syncQueue = [];
        localStorage.setItem('finanzas_mobile_queue', JSON.stringify([]));
      }
    }

    // PASO 2: Descargar cambios generados en la nube desde la última sincronización (PULL)
    const pullRes = await fetch(`${API_BASE}/sync/pull?since=${encodeURIComponent(AppState.lastSync)}`, {
      headers: {
        'Authorization': `Bearer ${AppState.token}`
      }
    });

    if (pullRes.ok) {
      const pullData = await pullRes.json();
      if (pullData.success) {
        mergePulledData(pullData.changes);
        AppState.lastSync = pullData.server_timestamp;
        localStorage.setItem('finanzas_last_sync', AppState.lastSync);
      }
    }

    // Actualizar vista y marcar como sincronizado
    updateSyncIndicator('synced', 'Sincronizado');
    const syncTimeStr = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('last-sync-time').textContent = `Última: Hoy ${syncTimeStr}`;
    document.getElementById('offline-queue-count').textContent = '0 cambios pendientes';
    renderAllViews();

    if (manual) alert('🟢 Sincronización con la nube completada con éxito');
  } catch (err) {
    console.warn('Fallo en sincronización:', err);
    updateSyncIndicator('offline', 'Error de red');
  } finally {
    AppState.isSyncing = false;
  }
}

// Mezclar cambios descargados de la nube con resolución LWW
function mergePulledData(changes) {
  if (!changes) return;

  const collections = ['accounts', 'transactions', 'credit_cards', 'debts', 'budgets'];
  collections.forEach(col => {
    const pulledList = changes[col] || [];
    if (pulledList.length === 0) return;

    let localList = AppState[col === 'credit_cards' ? 'cards' : col] || [];

    pulledList.forEach(item => {
      const idx = localList.findIndex(x => x.id === item.id);
      if (idx !== -1) {
        // Actualizar si la marca de tiempo de la nube es igual o más reciente
        if (new Date(item.updated_at) >= new Date(localList[idx].updated_at || 0)) {
          if (item.is_deleted) {
            localList.splice(idx, 1);
          } else {
            localList[idx] = item;
          }
        }
      } else if (!item.is_deleted) {
        localList.push(item);
      }
    });

    AppState[col === 'credit_cards' ? 'cards' : col] = localList;
    localStorage.setItem(`finanzas_${col}`, JSON.stringify(localList));
  });
}

function updateSyncIndicator(status, text) {
  const pill = document.getElementById('sync-pill');
  const txt = document.getElementById('sync-text');
  if (!pill || !txt) return;

  pill.className = 'sync-status-pill ' + status;
  txt.textContent = text;
}

// ==========================================================
// GESTIÓN Y RENDERIZADO DE VISTAS MÓVILES
// ==========================================================

function switchTab(tabId) {
  AppState.activeTab = tabId;
  document.querySelectorAll('.app-view').forEach(view => view.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

  const activeView = document.getElementById(`view-${tabId}`);
  if (activeView) activeView.classList.add('active');

  const activeNavBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (activeNavBtn) activeNavBtn.classList.add('active');

  renderAllViews();
}

function renderAllViews() {
  renderBalanceCard();
  renderAccountsList();
  renderRecentTransactions();
  renderCardsAndDebts();
  renderBudgets();
  populateAccountSelects();
}

// Render del saldo disponible total y desglose
function renderBalanceCard() {
  let total = 0;
  let cash = 0;
  let banks = 0;

  AppState.accounts.forEach(acc => {
    if (acc.is_deleted) return;
    const b = parseFloat(acc.balance) || 0;
    total += b;
    if (acc.type && acc.type.toLowerCase() === 'efectivo') {
      cash += b;
    } else {
      banks += b;
    }
  });

  document.getElementById('total-available-balance').textContent = formatCurrency(total);
  document.getElementById('cash-balance').textContent = formatCurrency(cash);
  document.getElementById('banks-balance').textContent = formatCurrency(banks);

  // Estadísticas del mes actual
  const currentMonth = new Date().toISOString().substring(0, 7);
  let monthInc = 0;
  let monthExp = 0;

  AppState.transactions.forEach(t => {
    if (t.is_deleted || (t.date && !t.date.startsWith(currentMonth))) return;
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'ingreso') monthInc += amt;
    if (t.type === 'egreso') monthExp += amt;
  });

  document.getElementById('monthly-income-stat').textContent = '+' + formatCurrency(monthInc);
  document.getElementById('monthly-expense-stat').textContent = '-' + formatCurrency(monthExp);
}

// Render de cuentas en scroll horizontal
function renderAccountsList() {
  const container = document.getElementById('accounts-list-container');
  if (!container) return;

  const activeAccounts = AppState.accounts.filter(a => !a.is_deleted);
  if (activeAccounts.length === 0) {
    container.innerHTML = `<div style="color: #94a3b8; font-size: 0.85rem; padding: 10px;">No hay cuentas activas.</div>`;
    return;
  }

  container.innerHTML = activeAccounts.map(acc => `
    <div class="account-pill-card">
      <div class="acc-pill-top">
        <span class="acc-pill-icon"><i class="fas fa-${acc.icon || 'wallet'}"></i></span>
        <span style="font-size: 0.7rem; color: #94a3b8;">${acc.type}</span>
      </div>
      <span class="acc-pill-name">${acc.name}</span>
      <span class="acc-pill-bal">${formatCurrency(acc.balance)}</span>
    </div>
  `).join('');
}

// Render de transacciones
function renderRecentTransactions(typeFilter = 'todos') {
  const homeContainer = document.getElementById('recent-transactions-container');
  const allContainer = document.getElementById('all-transactions-container');

  const sortedTx = [...AppState.transactions]
    .filter(t => !t.is_deleted)
    .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`) - new Date(`${a.date}T${a.time || '00:00'}`));

  // Home: solo los 5 más recientes
  if (homeContainer) {
    const recent = sortedTx.slice(0, 5);
    if (recent.length === 0) {
      homeContainer.innerHTML = `<div class="empty-state" style="padding: 16px; color: #94a3b8; text-align: center;">No hay transacciones registradas</div>`;
    } else {
      homeContainer.innerHTML = recent.map(renderTransactionCardHtml).join('');
    }
  }

  // Vista Movimientos completa con filtro
  if (allContainer) {
    const filtered = typeFilter === 'todos' ? sortedTx : sortedTx.filter(t => t.type === typeFilter);
    if (filtered.length === 0) {
      allContainer.innerHTML = `<div class="empty-state" style="padding: 20px; color: #94a3b8; text-align: center;">No hay movimientos para este filtro</div>`;
    } else {
      allContainer.innerHTML = filtered.map(renderTransactionCardHtml).join('');
    }
  }
}

function renderTransactionCardHtml(t) {
  const isExp = t.type === 'egreso';
  const isInc = t.type === 'ingreso';
  const icon = isExp ? 'arrow-up' : (isInc ? 'arrow-down' : 'exchange-alt');
  const sign = isExp ? '-' : (isInc ? '+' : '⇄ ');

  const account = AppState.accounts.find(a => a.id === t.account_id);
  const accountName = account ? account.name : 'Cuenta';

  return `
    <div class="tx-card-item">
      <div class="tx-card-left">
        <div class="tx-icon-box ${t.type}">
          <i class="fas fa-${icon}"></i>
        </div>
        <div class="tx-meta">
          <span class="tx-title">${t.description || t.category}</span>
          <span class="tx-subtitle">${accountName} • ${t.category}</span>
        </div>
      </div>
      <div class="tx-card-right">
        <span class="tx-amount-text ${t.type}">${sign}${formatCurrency(t.amount)}</span>
        <span class="tx-date-badge">${t.date || ''}</span>
      </div>
    </div>
  `;
}

function filterTransactionsType(type, buttonElement) {
  document.querySelectorAll('.filter-chips-row .chip').forEach(c => c.classList.remove('active'));
  buttonElement.classList.add('active');
  renderRecentTransactions(type);
}

// Render de tarjetas y deudas
function renderCardsAndDebts() {
  const cardsContainer = document.getElementById('mobile-cards-container');
  const debtsContainer = document.getElementById('mobile-debts-container');

  if (cardsContainer) {
    const activeCards = AppState.cards.filter(c => !c.is_deleted);
    if (activeCards.length === 0) {
      cardsContainer.innerHTML = `<div style="color: #94a3b8; font-size: 0.85rem;">No tienes tarjetas de crédito registradas.</div>`;
    } else {
      cardsContainer.innerHTML = activeCards.map(c => {
        const limit = parseFloat(c.credit_limit) || 0;
        const used = parseFloat(c.used_amount) || 0;
        const avail = Math.max(0, limit - used);
        return `
          <div class="card-item-box">
            <span class="c-bank">${c.bank}</span>
            <div class="c-name">${c.name}</div>
            <div class="card-metrics-grid">
              <div><span>Límite</span><strong>${formatCurrency(limit)}</strong></div>
              <div><span>Utilizado</span><strong>${formatCurrency(used)}</strong></div>
              <div><span>Disponible</span><strong style="color: #34d399;">${formatCurrency(avail)}</strong></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  if (debtsContainer) {
    const activeDebts = AppState.debts.filter(d => !d.is_deleted);
    if (activeDebts.length === 0) {
      debtsContainer.innerHTML = `<div style="color: #94a3b8; font-size: 0.85rem;">No tienes deudas pendientes. ¡Excelente!</div>`;
    } else {
      debtsContainer.innerHTML = activeDebts.map(d => `
        <div class="debt-item-box">
          <div>
            <strong style="font-size: 0.95rem; display: block;">${d.entity_person}</strong>
            <span style="font-size: 0.75rem; color: #94a3b8;">${d.description || 'Sin descripción'}</span>
            <div style="margin-top: 4px;">
              <span class="badge-status ${d.status}">${d.status}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 1.05rem; font-weight: 700; color: #f87171; display: block;">${formatCurrency(d.pending_amount)}</span>
            <button class="btn-text-action" onclick="openDebtPaymentModal('${d.id}', '${d.entity_person}', ${d.pending_amount})">Abonar</button>
          </div>
        </div>
      `).join('');
    }
  }
}

// Render de presupuestos
function renderBudgets() {
  const container = document.getElementById('mobile-budgets-container');
  if (!container) return;

  const activeBudgets = AppState.budgets.filter(b => !b.is_deleted);
  if (activeBudgets.length === 0) {
    container.innerHTML = `<div style="color: #94a3b8; font-size: 0.85rem;">No hay presupuestos activos. Crea uno para controlar tus gastos.</div>`;
    return;
  }

  container.innerHTML = activeBudgets.map(b => {
    const limit = parseFloat(b.limit_amount) || 0;
    // Calcular gasto real local
    const spent = AppState.transactions
      .filter(t => !t.is_deleted && t.type === 'egreso' && (!b.category || b.category === t.category))
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
    const barClass = pct >= 100 ? 'danger' : (pct >= 80 ? 'warning' : '');

    return `
      <div class="debt-item-box" style="flex-direction: column; align-items: stretch; gap: 8px;">
        <div style="display: flex; justify-content: space-between;">
          <strong>${b.category || 'Presupuesto General'}</strong>
          <span style="color: #94a3b8; font-size: 0.8rem;">${pct}%</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill ${barClass}" style="width: ${pct}%;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem;">
          <span>Gastado: ${formatCurrency(spent)}</span>
          <span style="color: #94a3b8;">Límite: ${formatCurrency(limit)}</span>
        </div>
      </div>
    `;
  }).join('');
}

// Llenar selectores de cuentas
function populateAccountSelects() {
  const accSelect = document.getElementById('tx-account');
  const toAccSelect = document.getElementById('tx-to-account');
  const payAccSelect = document.getElementById('pay-account-id');

  const options = AppState.accounts
    .filter(a => !a.is_deleted)
    .map(a => `<option value="${a.id}">${a.name} (${formatCurrency(a.balance)})</option>`)
    .join('');

  if (accSelect) accSelect.innerHTML = options;
  if (toAccSelect) toAccSelect.innerHTML = options;
  if (payAccSelect) payAccSelect.innerHTML = options;

  populateCategorySelect();
}

// Llenar selectores de categorías según tipo
const expenseCategories = [
  'Alimentación', 'Mercado', 'Restaurante', 'Transporte', 'Bus', 'Taxi', 'Gasolina',
  'Educación', 'Vivienda', 'Arriendo', 'Servicios', 'Internet', 'Entretenimiento',
  'Streaming', 'Salud', 'Compras', 'Ropa', 'Tecnología', 'Finanzas', 'Otros'
];
const incomeCategories = [
  'Salario', 'Trabajo', 'Negocio', 'Ventas', 'Comisión', 'Inversiones', 'Regalos', 'Otros'
];

function populateCategorySelect() {
  const catSelect = document.getElementById('tx-category');
  if (!catSelect) return;

  const cats = AppState.currentTxType === 'ingreso' ? incomeCategories : expenseCategories;
  catSelect.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

// ==========================================================
// CREACIÓN DE TRANSACCIONES CON RESOLUCIÓN OFFLINE
// ==========================================================

function openTransactionModal(type = 'egreso') {
  setTransactionModalType(type);
  const amountInput = document.getElementById('tx-amount');
  if (amountInput) amountInput.value = '';
  const descInput = document.getElementById('tx-description');
  if (descInput) descInput.value = '';
  openModal('modal-transaction');
}

function setTransactionModalType(type) {
  AppState.currentTxType = type;
  document.querySelectorAll('.tx-type-tabs .type-tab').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-type') === type);
  });

  const isTransfer = type === 'transferencia';
  document.getElementById('group-tx-to-account').style.display = isTransfer ? 'flex' : 'none';
  document.getElementById('group-tx-category').style.display = isTransfer ? 'none' : 'flex';
  document.getElementById('lbl-tx-account').textContent = isTransfer ? 'Cuenta Origen' : 'Cuenta';

  populateCategorySelect();
}

async function handleTransactionSubmit(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const account_id = document.getElementById('tx-account').value;
  const to_account_id = document.getElementById('tx-to-account').value;
  const category = document.getElementById('tx-category').value;
  const description = document.getElementById('tx-description').value;
  const date = document.getElementById('tx-date').value || new Date().toISOString().split('T')[0];
  const payment_method = document.getElementById('tx-payment-method').value;

  if (!amount || amount <= 0 || !account_id) {
    alert('Por favor ingresa un monto válido y una cuenta');
    return;
  }

  const txId = uuidv4();
  const now = new Date().toISOString();

  const newTransaction = {
    id: txId,
    user_id: AppState.user ? AppState.user.id : null,
    account_id,
    to_account_id: AppState.currentTxType === 'transferencia' ? to_account_id : null,
    type: AppState.currentTxType,
    amount,
    category: AppState.currentTxType === 'transferencia' ? 'Transferencia' : category,
    description: description || (AppState.currentTxType === 'transferencia' ? 'Transferencia entre cuentas' : category),
    payment_method,
    date,
    time: new Date().toTimeString().split(' ')[0],
    device_id: deviceId,
    sync_status: AppState.isOnline ? 'synced' : 'pending',
    is_deleted: false,
    created_at: now,
    updated_at: now
  };

  // ACTUALIZACIÓN INMEDIATA LOCAL DE SALDOS (Optimistic UI)
  applyLocalTransactionImpact(newTransaction);

  // Agregar a lista de transacciones local
  AppState.transactions.unshift(newTransaction);
  localStorage.setItem('finanzas_transactions', JSON.stringify(AppState.transactions));

  closeModal('modal-transaction');
  renderAllViews();

  // ENVÍO AL SERVIDOR O ENCOLAMIENTO OFFLINE
  if (AppState.isOnline && AppState.token) {
    try {
      updateSyncIndicator('syncing', 'Sincronizando...');
      const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AppState.token}`
        },
        body: JSON.stringify(newTransaction)
      });
      if (res.ok) {
        updateSyncIndicator('synced', 'Sincronizado');
      } else {
        throw new Error('Error al sincronizar con el servidor');
      }
    } catch (err) {
      console.warn('Fallo de red al enviar transacción. Encolando offline:', err);
      enqueueOfflineChange('transactions', newTransaction);
    }
  } else {
    enqueueOfflineChange('transactions', newTransaction);
  }
}

function applyLocalTransactionImpact(t) {
  const amt = parseFloat(t.amount) || 0;
  const src = AppState.accounts.find(a => a.id === t.account_id);

  if (src) {
    if (t.type === 'egreso') {
      src.balance = (parseFloat(src.balance) || 0) - amt;
    } else if (t.type === 'ingreso') {
      src.balance = (parseFloat(src.balance) || 0) + amt;
    } else if (t.type === 'transferencia' && t.to_account_id) {
      const dst = AppState.accounts.find(a => a.id === t.to_account_id);
      src.balance = (parseFloat(src.balance) || 0) - amt;
      if (dst) dst.balance = (parseFloat(dst.balance) || 0) + amt;
    }
  }
  localStorage.setItem('finanzas_accounts', JSON.stringify(AppState.accounts));
}

function enqueueOfflineChange(collection, item) {
  AppState.syncQueue.push({ collection, data: item });
  localStorage.setItem('finanzas_mobile_queue', JSON.stringify(AppState.syncQueue));
  updateSyncIndicator('offline', 'Guardado localmente');
  document.getElementById('offline-queue-count').textContent = `${AppState.syncQueue.length} cambios pendientes`;
}

// ==========================================================
// GESTIÓN DE ABONOS A DEUDAS
// ==========================================================

function openDebtPaymentModal(debtId, debtName, pendingAmt) {
  document.getElementById('pay-debt-id').value = debtId;
  document.getElementById('pay-debt-info').textContent = `Deuda con: ${debtName} | Pendiente: ${formatCurrency(pendingAmt)}`;
  document.getElementById('pay-amount').value = '';
  openModal('modal-debt-payment');
}

async function handleDebtPaymentSubmit(e) {
  e.preventDefault();
  const debtId = document.getElementById('pay-debt-id').value;
  const amount = parseFloat(document.getElementById('pay-amount').value);
  const account_id = document.getElementById('pay-account-id').value;

  if (!amount || amount <= 0) return alert('Ingresa un monto válido');

  const debt = AppState.debts.find(d => d.id === debtId);
  if (!debt) return;

  // Actualización optimista local
  const currentPending = parseFloat(debt.pending_amount) || 0;
  debt.pending_amount = Math.max(0, currentPending - amount);
  debt.status = debt.pending_amount <= 0 ? 'pagada' : 'en_proceso';
  debt.updated_at = new Date().toISOString();

  if (account_id) {
    const acc = AppState.accounts.find(a => a.id === account_id);
    if (acc) {
      acc.balance = (parseFloat(acc.balance) || 0) - amount;
      acc.updated_at = new Date().toISOString();
    }
  }

  localStorage.setItem('finanzas_debts', JSON.stringify(AppState.debts));
  localStorage.setItem('finanzas_accounts', JSON.stringify(AppState.accounts));

  closeModal('modal-debt-payment');
  renderAllViews();

  if (AppState.isOnline && AppState.token) {
    try {
      await fetch(`${API_BASE}/debts/${debtId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AppState.token}`
        },
        body: JSON.stringify({ amount, account_id, device_id: deviceId })
      });
      performAutoSync();
    } catch (err) {
      enqueueOfflineChange('debts', debt);
    }
  } else {
    enqueueOfflineChange('debts', debt);
  }
}

// Nueva cuenta
async function handleNewAccountSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('new-acc-name').value;
  const type = document.getElementById('new-acc-type').value;
  const balance = parseFloat(document.getElementById('new-acc-balance').value) || 0;

  const newAcc = {
    id: uuidv4(),
    user_id: AppState.user ? AppState.user.id : null,
    name,
    type,
    balance,
    currency: 'COP',
    color: '#2563eb',
    icon: type.toLowerCase() === 'efectivo' ? 'money-bill-wave' : 'university',
    device_id: deviceId,
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  AppState.accounts.push(newAcc);
  localStorage.setItem('finanzas_accounts', JSON.stringify(AppState.accounts));
  closeModal('modal-new-account');
  renderAllViews();

  if (AppState.isOnline && AppState.token) {
    try {
      await fetch(`${API_BASE}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AppState.token}`
        },
        body: JSON.stringify(newAcc)
      });
      performAutoSync();
    } catch (err) {
      enqueueOfflineChange('accounts', newAcc);
    }
  } else {
    enqueueOfflineChange('accounts', newAcc);
  }
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
// MODO ADMINISTRADOR EN CELULAR
// ==========================================================
async function openAdminMobileModal() {
  const container = document.getElementById('admin-mobile-users-container');
  if (!container) return;

  container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 12px;">Cargando usuarios...</div>`;
  openModal('modal-admin-mobile');

  try {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { 'Authorization': `Bearer ${AppState.token}` }
    });
    const data = await res.json();
    if (data.success) {
      const users = data.users || [];
      if (users.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 12px;">No hay usuarios.</div>`;
        return;
      }

      container.innerHTML = users.map(u => `
        <div class="card-item-box" style="background: #1e293b; border-color: #334155;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="font-size: 1rem; color: #60a5fa;">@${u.username}</strong>
            <span class="badge-status ${u.role === 'admin' ? 'vencida' : 'en_proceso'}">${u.role}</span>
          </div>
          <div style="font-size: 0.82rem; color: #cbd5e1;">Nombre: ${u.name || u.username}</div>
          <div style="font-size: 0.82rem; color: #fbbf24; margin: 4px 0;">
            Contraseña: <strong>${u.password_plain || '••••••••'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 6px; margin-top: 6px;">
            <span>${u.accounts_count} cuentas</span>
            <span>${u.transactions_count} movimientos</span>
            <span style="color: #34d399; font-weight: 700;">${formatCurrency(u.total_balance)}</span>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = `<div style="text-align: center; color: #f87171; padding: 12px;">${data.error || 'Acceso denegado'}</div>`;
    }
  } catch (err) {
    container.innerHTML = `<div style="text-align: center; color: #f87171; padding: 12px;">Error: ${err.message}</div>`;
  }
}
