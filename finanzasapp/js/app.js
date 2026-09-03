/**
 * FINANZASAPP — NÚCLEO Y ESTADO GLOBAL
 * Arquitectura modular con soporte offline nativo y sincronización automática en la nube
 */

const API_BASE = window.location.origin + '/api';

// Utilidad generadora de identificadores UUID v4
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Formateador de moneda en pesos colombianos ($ 18.450.000)
function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return '$ ' + Math.round(num).toLocaleString('es-CO');
}

// Estado global reactivo de FinanzasApp
const AppState = {
  token: localStorage.getItem('finanzas_token') || null,
  user: JSON.parse(localStorage.getItem('finanzas_user') || JSON.stringify({
    name: 'Gabriel M.',
    username: 'gabriel',
    role: 'user'
  })),

  // Cuentas por defecto inspiradas en el prototipo fintech
  accounts: JSON.parse(localStorage.getItem('finanzas_accounts') || JSON.stringify([
    { id: 'acc-1', name: 'Cuenta principal', type: 'banco', balance: 12450000, icon: 'landmark', change: '+8.2%', styleClass: 'principal' },
    { id: 'acc-2', name: 'Ahorros', type: 'ahorros', balance: 4250000, icon: 'piggy-bank', change: '+4.1%', styleClass: 'ahorros' },
    { id: 'acc-3', name: 'Efectivo', type: 'efectivo', balance: 1750000, icon: 'wallet', change: '+0.27%', styleClass: 'efectivo' }
  ])),

  // Movimientos recientes fieles al diseño de referencia
  transactions: JSON.parse(localStorage.getItem('finanzas_transactions') || JSON.stringify([
    { id: 'tx-1', description: 'Supermercado Éxito', category: 'Alimentación', type: 'gasto', amount: 85000, date: new Date().toISOString().split('T')[0], account_id: 'acc-1', icon: 'shopping-cart' },
    { id: 'tx-2', description: 'Pago de Salario Quincenal', category: 'Ingreso', type: 'ingreso', amount: 3200000, date: new Date().toISOString().split('T')[0], account_id: 'acc-1', icon: 'arrow-up-right-dots' },
    { id: 'tx-3', description: 'Pago Tarjeta de Crédito', category: 'Pago', type: 'gasto', amount: 450000, date: new Date(Date.now() - 86400000).toISOString().split('T')[0], account_id: 'acc-1', icon: 'credit-card' },
    { id: 'tx-4', description: 'Restaurante y Café', category: 'Alimentación', type: 'gasto', amount: 42000, date: new Date(Date.now() - 172800000).toISOString().split('T')[0], account_id: 'acc-3', icon: 'utensils' },
    { id: 'tx-5', description: 'Combustible y Gasolina', category: 'Transporte', type: 'gasto', amount: 65000, date: new Date(Date.now() - 259200000).toISOString().split('T')[0], account_id: 'acc-1', icon: 'gas-pump' }
  ])),

  // Presupuestos mensuales
  budgets: JSON.parse(localStorage.getItem('finanzas_budgets') || JSON.stringify([
    { id: 'bg-1', category: 'Alimentación', limit_amount: 600000, icon: 'utensils' },
    { id: 'bg-2', category: 'Transporte', limit_amount: 300000, icon: 'car' },
    { id: 'bg-3', category: 'Entretenimiento', limit_amount: 200000, icon: 'film' },
    { id: 'bg-4', category: 'Servicios Públicos', limit_amount: 350000, icon: 'bolt' }
  ])),

  // Metas de ahorro
  goals: JSON.parse(localStorage.getItem('finanzas_goals') || JSON.stringify([
    { id: 'gl-1', title: 'Universidad', current_amount: 2400000, target_amount: 5000000, icon: 'graduation-cap', color: '#8B5CF6' },
    { id: 'gl-2', title: 'Vehículo', current_amount: 8000000, target_amount: 20000000, icon: 'car-side', color: '#3B82F6' },
    { id: 'gl-3', title: 'Fondo de Emergencia', current_amount: 3500000, target_amount: 6000000, icon: 'shield-halved', color: '#10B981' }
  ])),

  currentView: 'overview',
  activePeriod: '1M',
  isOnline: navigator.onLine
};

// ==========================================================
// CONTROLADOR DE VISTAS Y NAVEGACIÓN
// ==========================================================
function switchView(viewName) {
  AppState.currentView = viewName;

  // Actualizar botones de Sidebar
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });

  // Actualizar botones de navegación móvil inferior
  document.querySelectorAll('.nav-item-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });

  // Actualizar visibilidad de secciones
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const targetSec = document.getElementById(`view-${viewName}`);
  if (targetSec) {
    targetSec.classList.add('active');
  }

  // Título de la sección en Header
  const titles = {
    overview: 'Overview',
    transactions: 'Movimientos',
    accounts: 'Mis Cuentas',
    budget: 'Presupuestos',
    goals: 'Metas de Ahorro',
    reports: 'Reportes Financieros',
    ai: 'Finanzas AI',
    settings: 'Configuración'
  };

  const headerTitle = document.getElementById('header-title-text');
  if (headerTitle) {
    headerTitle.textContent = titles[viewName] || 'Overview';
  }

  // Desencadenar re-render de la vista activa
  if (viewName === 'overview' && window.DashboardModule) window.DashboardModule.render();
  if (viewName === 'transactions' && window.TransactionsModule) window.TransactionsModule.render();
  if (viewName === 'accounts' && window.AccountsModule) window.AccountsModule.render();
  if (viewName === 'budget' && window.BudgetModule) window.BudgetModule.render();
  if (viewName === 'goals' && window.GoalsModule) window.GoalsModule.render();
  if (viewName === 'reports' && window.ReportsModule) window.ReportsModule.render();
  if (viewName === 'ai' && window.FinanzasAIModule) window.FinanzasAIModule.render();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================
// CONTROLADOR DE MODALES
// ==========================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ==========================================================
// PERSISTENCIA LOCAL Y NUBE
// ==========================================================
function saveLocalState() {
  localStorage.setItem('finanzas_accounts', JSON.stringify(AppState.accounts));
  localStorage.setItem('finanzas_transactions', JSON.stringify(AppState.transactions));
  localStorage.setItem('finanzas_budgets', JSON.stringify(AppState.budgets));
  localStorage.setItem('finanzas_goals', JSON.stringify(AppState.goals));
}

// Sincronización inteligente con el Backend si está disponible
async function tryCloudSync() {
  if (!AppState.token || !navigator.onLine) return;
  try {
    const res = await fetch(`${API_BASE}/accounts`, {
      headers: { 'Authorization': `Bearer ${AppState.token}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.accounts && data.accounts.length > 0) {
        AppState.accounts = data.accounts;
        saveLocalState();
        if (window.DashboardModule) window.DashboardModule.render();
      }
    }
  } catch (err) {
    console.log('Modo autónomo/local activo:', err.message);
  }
}

// INICIALIZACIÓN GLOBAL
document.addEventListener('DOMContentLoaded', () => {
  // Configurar colapso de sidebar
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.app-sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // Asignar listeners de navegación
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', () => {
      const view = el.getAttribute('data-view');
      if (view) switchView(view);
    });
  });

  // Saludo dinámico según la hora del día
  const hour = new Date().getHours();
  let greeting = 'Buenos días';
  if (hour >= 12 && hour < 18) greeting = 'Buenas tardes';
  else if (hour >= 18 || hour < 5) greeting = 'Buenas noches';

  const greetingEl = document.getElementById('greeting-text');
  if (greetingEl) {
    const firstName = (AppState.user.name || 'Gabriel').split(' ')[0];
    greetingEl.innerHTML = `${greeting}, <strong>${firstName}</strong>`;
  }

  // Actualizar avatar del usuario
  const avatarEl = document.getElementById('user-avatar-initials');
  if (avatarEl) {
    avatarEl.textContent = (AppState.user.name || 'GA').substring(0, 2).toUpperCase();
  }

  // Inicializar módulos y vistas
  if (window.DashboardModule) window.DashboardModule.init();
  if (window.TransactionsModule) window.TransactionsModule.init();
  if (window.AccountsModule) window.AccountsModule.init();
  if (window.BudgetModule) window.BudgetModule.init();
  if (window.GoalsModule) window.GoalsModule.init();
  if (window.ReportsModule) window.ReportsModule.init();
  if (window.FinanzasAIModule) window.FinanzasAIModule.init();

  tryCloudSync();
});

window.AppState = AppState;
window.formatCurrency = formatCurrency;
window.switchView = switchView;
window.openModal = openModal;
window.closeModal = closeModal;
window.saveLocalState = saveLocalState;
window.uuidv4 = uuidv4;
