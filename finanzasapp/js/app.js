/**
 * FINANZASAPP — NÚCLEO Y ESTADO GLOBAL
 * Autenticación (Usuario/Contraseña), Modo Admin, Mantenimiento, Sincronización Nube y Base en $0
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

// Formateador de moneda en pesos colombianos ($ 0, $ 50.000)
function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return '$ ' + Math.round(num).toLocaleString('es-CO');
}

// Estado global de la aplicación (INICIO LITERALMENTE EN $0)
const AppState = {
  token: localStorage.getItem('finanzas_token') || null,
  user: JSON.parse(localStorage.getItem('finanzas_user') || 'null'),

  // Cuentas limpias por defecto en $0
  accounts: JSON.parse(localStorage.getItem('finanzas_accounts') || JSON.stringify([
    { id: 'acc-1', name: 'Efectivo', type: 'efectivo', balance: 0, icon: 'wallet', change: '0%', styleClass: 'efectivo' },
    { id: 'acc-2', name: 'Bancaria', type: 'banco', balance: 0, icon: 'landmark', change: '0%', styleClass: 'principal' },
    { id: 'acc-3', name: 'Billetera Digital', type: 'billetera', balance: 0, icon: 'mobile-screen', change: '0%', styleClass: 'ahorros' }
  ])),

  // Movimientos inician en 0
  transactions: JSON.parse(localStorage.getItem('finanzas_transactions') || '[]'),
  budgets: JSON.parse(localStorage.getItem('finanzas_budgets') || '[]'),
  goals: JSON.parse(localStorage.getItem('finanzas_goals') || '[]'),
  credits: JSON.parse(localStorage.getItem('finanzas_credits') || '[]'),

  currentView: 'overview',
  activePeriod: '1M',
  isOnline: navigator.onLine,
  authMode: 'login',
  isMaintenanceActive: false
};

// ==========================================================
// CONTROLADOR DE VISTAS Y NAVEGACIÓN
// ==========================================================
function switchView(viewName) {
  AppState.currentView = viewName;

  // Botones de Sidebar
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });

  // Botones de navegación móvil
  document.querySelectorAll('.nav-item-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });

  // Secciones
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const targetSec = document.getElementById(`view-${viewName}`);
  if (targetSec) {
    targetSec.classList.add('active');
  }

  const titles = {
    overview: 'Overview',
    transactions: 'Movimientos',
    accounts: 'Mis Cuentas',
    credits: 'Crédito y Tarjetas',
    budget: 'Presupuestos',
    goals: 'Metas de Ahorro',
    reports: 'Reportes Financieros',
    settings: 'Configuración'
  };

  const headerTitle = document.getElementById('header-title-text');
  if (headerTitle) {
    headerTitle.textContent = titles[viewName] || 'Overview';
  }

  // Re-render
  if (viewName === 'overview' && window.DashboardModule) window.DashboardModule.render();
  if (viewName === 'transactions' && window.TransactionsModule) window.TransactionsModule.render();
  if (viewName === 'accounts' && window.AccountsModule) window.AccountsModule.render();
  if (viewName === 'credits' && window.CreditsModule) window.CreditsModule.render();
  if (viewName === 'budget' && window.BudgetModule) window.BudgetModule.render();
  if (viewName === 'goals' && window.GoalsModule) window.GoalsModule.render();
  if (viewName === 'reports' && window.ReportsModule) window.ReportsModule.render();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================
// CONTROLADOR DE MODALES
// ==========================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  if (window.closeModalAnimated) {
    window.closeModalAnimated(modalId);
  } else {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }
}

// ==========================================================
// AUTENTICACIÓN (SOLO USUARIO Y CONTRASEÑA) Y ADMIN (1 / 1)
// ==========================================================
function setAuthMode(mode) {
  AppState.authMode = mode;
  const tabLogin = document.getElementById('auth-tab-login');
  const tabReg = document.getElementById('auth-tab-register');
  const groupName = document.getElementById('auth-group-name');
  const btnSubmit = document.getElementById('btn-auth-submit');

  if (tabLogin) tabLogin.classList.toggle('active', mode === 'login');
  if (tabReg) tabReg.classList.toggle('active', mode === 'register');
  if (groupName) groupName.style.display = mode === 'register' ? 'block' : 'none';
  if (btnSubmit) btnSubmit.textContent = mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta';
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('auth-input-username').value.trim();
  const password = document.getElementById('auth-input-password').value;
  const name = document.getElementById('auth-input-name').value.trim();

  if (!username || !password) {
    alert('Ingresa tu usuario y contraseña.');
    return;
  }

  const endpoint = AppState.authMode === 'login' ? '/auth/login' : '/auth/register';
  const body = AppState.authMode === 'login' ? { username, password } : { username, password, name };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Error al autenticar');
      return;
    }

    // Guardar token y datos del usuario
    AppState.token = data.token;
    AppState.user = data.user;
    localStorage.setItem('finanzas_token', data.token);
    localStorage.setItem('finanzas_user', JSON.stringify(data.user));

    closeModal('modal-auth');
    updateUserInterface();

    // Sincronizar datos reales de la base de datos
    await fetchCloudData();

    if (window.MotionSystem) {
      window.MotionSystem.showToast('Bienvenido', `Sesión iniciada como ${AppState.user.name || AppState.user.username}`);
    }
  } catch (err) {
    alert('Error de conexión con el servidor: ' + err.message);
  }
}

function handleLogout() {
  if (!confirm('¿Deseas cerrar tu sesión?')) return;

  AppState.token = null;
  AppState.user = null;
  localStorage.removeItem('finanzas_token');
  localStorage.removeItem('finanzas_user');
  localStorage.removeItem('finanzas_accounts');
  localStorage.removeItem('finanzas_transactions');
  localStorage.removeItem('finanzas_credits');
  localStorage.removeItem('finanzas_budgets');
  localStorage.removeItem('finanzas_goals');

  // Restaurar estado inicial limpio en $0
  AppState.accounts = [
    { id: 'acc-1', name: 'Efectivo', type: 'efectivo', balance: 0, icon: 'wallet', change: '0%', styleClass: 'efectivo' },
    { id: 'acc-2', name: 'Bancaria', type: 'banco', balance: 0, icon: 'landmark', change: '0%', styleClass: 'principal' },
    { id: 'acc-3', name: 'Billetera Digital', type: 'billetera', balance: 0, icon: 'mobile-screen', change: '0%', styleClass: 'ahorros' }
  ];
  AppState.transactions = [];
  AppState.credits = [];
  AppState.budgets = [];
  AppState.goals = [];

  updateUserInterface();
  openModal('modal-auth');
}

// ==========================================================
// MODO MANTENIMIENTO Y MODO ADMINISTRADOR (USUARIO 1)
// ==========================================================
async function checkMaintenanceStatus() {
  try {
    const res = await fetch(`${API_BASE}/system/maintenance`);
    const data = await res.json();
    AppState.isMaintenanceActive = !!data.active;

    const isAdmin = AppState.user && (AppState.user.role === 'admin' || AppState.user.username === '1');
    const overlay = document.getElementById('maintenance-overlay');

    if (data.active && !isAdmin) {
      if (overlay) {
        overlay.style.display = 'flex';
        const msg = document.getElementById('maintenance-message');
        if (msg) msg.textContent = data.message || 'Sistema en mantenimiento programado.';
      }
    } else {
      if (overlay) overlay.style.display = 'none';
    }

    updateMaintenanceAdminUI(data.active);
  } catch (err) {
    console.warn('No se pudo verificar mantenimiento:', err.message);
  }
}

function updateMaintenanceAdminUI(active) {
  const label = document.getElementById('admin-maintenance-status-label');
  const btn = document.getElementById('btn-toggle-maintenance-action');
  if (label) {
    label.innerHTML = active
      ? `Actualmente: <strong style="color: #ef4444;">ACTIVADO</strong>`
      : `Actualmente: <strong style="color: #10b981;">Desactivado</strong>`;
  }
  if (btn) {
    btn.textContent = active ? 'Desactivar Modo Mantenimiento' : 'Activar Modo Mantenimiento';
    btn.style.background = active ? '#10b981' : '#f59e0b';
  }
}

async function toggleMaintenanceMode() {
  if (!confirm('¿Deseas cambiar el estado del Modo Mantenimiento para toda la plataforma?')) return;
  try {
    const res = await fetch(`${API_BASE}/admin/maintenance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AppState.token}`
      },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      updateMaintenanceAdminUI(data.active);
      checkMaintenanceStatus();
    } else {
      alert('Error: ' + (data.error || 'No autorizado'));
    }
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  }
}

async function openAdminPanel() {
  const container = document.getElementById('admin-users-list-container');
  if (!container) return;

  container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 16px;">Cargando usuarios registrados...</div>`;
  openModal('modal-admin-panel');

  try {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { 'Authorization': `Bearer ${AppState.token}` }
    });
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<div style="color: #ef4444; padding: 12px;">Error: ${data.error || 'No autorizado'}</div>`;
      return;
    }

    if (!data.users || data.users.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted); padding: 12px;">No hay otros usuarios registrados.</div>`;
      return;
    }

    container.innerHTML = data.users.map(u => `
      <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
            <span>${u.name || u.username}</span>
            <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; background: ${u.role === 'admin' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.15)'}; color: ${u.role === 'admin' ? '#fbbf24' : '#60a5fa'}; font-weight: 700;">
              ${u.role}
            </span>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
            Usuario: <strong>@${u.username}</strong> · Registrado: ${u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Hoy'}
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="adminChangePassword('${u.id}', '${u.username}')" class="btn-secondary btn-interactive" style="padding: 6px 10px; font-size: 0.75rem;">
            <i class="fas fa-key"></i> Clave
          </button>
          ${u.username !== '1' ? `
            <button onclick="adminDeleteUser('${u.id}', '${u.username}')" class="btn-secondary btn-interactive" style="padding: 6px 10px; font-size: 0.75rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
              <i class="fas fa-trash"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444; padding: 12px;">Error al cargar: ${err.message}</div>`;
  }
}

async function adminChangePassword(userId, username) {
  const newPass = prompt(`Ingresa la nueva contraseña para el usuario @${username}:`);
  if (!newPass || newPass.trim() === '') return;

  try {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AppState.token}`
      },
      body: JSON.stringify({ password: newPass })
    });
    const data = await res.json();
    if (res.ok) {
      alert(`✅ Contraseña cambiada exitosamente para @${username}`);
    } else {
      alert('Error: ' + (data.error || 'No se pudo cambiar'));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function adminDeleteUser(userId, username) {
  if (!confirm(`¿Eliminar al usuario @${username} y todos sus datos?`)) return;
  try {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${AppState.token}` }
    });
    if (res.ok) {
      alert(`Usuario @${username} eliminado.`);
      openAdminPanel();
    } else {
      alert('No se pudo eliminar el usuario.');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ==========================================================
// IMPORTAR EXCEL O CSV
// ==========================================================
let pendingExcelRows = [];

function handleExcelFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const json = XLSX.utils.sheet_to_json(worksheet);

      if (!json || json.length === 0) {
        alert('El archivo no contiene filas o datos legibles.');
        return;
      }

      pendingExcelRows = json.map(row => {
        // Mapeo inteligente de columnas
        const monto = parseFloat(row.Monto || row.monto || row.Valor || row.valor || row.Amount || row.amount || row.Total || 0);
        const desc = row.Descripcion || row.descripcion || row.Concepto || row.concepto || row.Detalle || 'Movimiento importado';
        const cat = row.Categoria || row.categoria || (monto >= 0 ? 'Ingreso' : 'Varios');
        const tipo = (row.Tipo || row.tipo || (monto >= 0 ? 'ingreso' : 'gasto')).toLowerCase();
        const fecha = row.Fecha || row.fecha || new Date().toISOString().split('T')[0];

        return {
          id: uuidv4(),
          amount: Math.abs(monto) || 10000,
          type: tipo.includes('ingreso') ? 'ingreso' : 'gasto',
          category: cat,
          description: desc,
          date: String(fecha).substring(0, 10),
          icon: tipo.includes('ingreso') ? 'arrow-up-right-dots' : 'shopping-bag'
        };
      });

      // Llenar select de cuenta destino
      const sel = document.getElementById('excel-target-account');
      if (sel) {
        sel.innerHTML = AppState.accounts.map(a => `<option value="${a.id}">${a.name} (${formatCurrency(a.balance)})</option>`).join('');
      }

      document.getElementById('excel-preview-count').textContent = pendingExcelRows.length;
      document.getElementById('excel-step-preview').style.display = 'block';
    } catch (err) {
      alert('Error leyendo el archivo Excel: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

async function submitExcelImport() {
  if (pendingExcelRows.length === 0) return;
  const accountId = document.getElementById('excel-target-account').value;
  const targetAcc = AppState.accounts.find(a => a.id === accountId);

  pendingExcelRows.forEach(tx => {
    tx.account_id = accountId;
    AppState.transactions.unshift(tx);

    if (targetAcc) {
      if (tx.type === 'ingreso') targetAcc.balance = (parseFloat(targetAcc.balance) || 0) + tx.amount;
      else targetAcc.balance = (parseFloat(targetAcc.balance) || 0) - tx.amount;
    }
  });

  saveLocalState();

  // Enviar a la nube en lote si está online
  if (AppState.token && navigator.onLine) {
    try {
      await fetch(`${API_BASE}/transactions/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AppState.token}`
        },
        body: JSON.stringify({ transactions: pendingExcelRows })
      });
    } catch (e) {
      console.warn('Importación en lote guardada localmente');
    }
  }

  closeModal('modal-import-excel');
  if (window.MotionSystem) {
    window.MotionSystem.showToast('Importación Exitosa', `Se importaron ${pendingExcelRows.length} movimientos a ${targetAcc ? targetAcc.name : 'tu cuenta'}.`);
  }

  pendingExcelRows = [];
  if (window.DashboardModule) window.DashboardModule.render();
  if (window.TransactionsModule) window.TransactionsModule.render();
  if (window.AccountsModule) window.AccountsModule.render();
}

// ==========================================================
// DESCARGA Y SINCRONIZACIÓN NUBE
// ==========================================================
async function fetchCloudData() {
  if (!AppState.token || !navigator.onLine) return;
  try {
    // 1. Cuentas
    const accRes = await fetch(`${API_BASE}/accounts`, {
      headers: { 'Authorization': `Bearer ${AppState.token}` }
    });
    if (accRes.ok) {
      const accData = await accRes.json();
      if (accData.accounts) {
        AppState.accounts = accData.accounts.filter(a => !a.is_deleted);
      }
    }

    // 2. Transacciones
    const txRes = await fetch(`${API_BASE}/transactions`, {
      headers: { 'Authorization': `Bearer ${AppState.token}` }
    });
    if (txRes.ok) {
      const txData = await txRes.json();
      if (txData.transactions) {
        AppState.transactions = txData.transactions.filter(t => !t.is_deleted);
      }
    }

    // 3. Presupuestos
    const bgRes = await fetch(`${API_BASE}/budgets`, {
      headers: { 'Authorization': `Bearer ${AppState.token}` }
    });
    if (bgRes.ok) {
      const bgData = await bgRes.json();
      if (bgData.budgets) {
        AppState.budgets = bgData.budgets;
      }
    }

    // 4. Tarjetas y Líneas de Crédito
    const credRes = await fetch(`${API_BASE}/cards`, {
      headers: { 'Authorization': `Bearer ${AppState.token}` }
    });
    if (credRes.ok) {
      const credData = await credRes.json();
      if (credData.cards) {
        AppState.credits = credData.cards.filter(c => !c.is_deleted);
      }
    }

    saveLocalState();
    if (window.DashboardModule) window.DashboardModule.render();
    if (window.TransactionsModule) window.TransactionsModule.render();
    if (window.AccountsModule) window.AccountsModule.render();
    if (window.CreditsModule) window.CreditsModule.render();
    if (window.BudgetModule) window.BudgetModule.render();
  } catch (err) {
    console.warn('Error descargando datos:', err.message);
  }
}

function updateUserInterface() {
  const userPillName = document.getElementById('user-pill-name');
  const userAvatar = document.getElementById('user-avatar-initials');
  const greetingEl = document.getElementById('greeting-text');
  const adminBtns = document.querySelectorAll('.admin-only-btn');

  const isAdmin = AppState.user && (AppState.user.role === 'admin' || AppState.user.username === '1');

  // Mostrar / Ocultar accesos de administrador
  adminBtns.forEach(btn => {
    btn.style.display = isAdmin ? 'flex' : 'none';
  });

  if (AppState.user) {
    const name = AppState.user.name || AppState.user.username || 'Usuario';
    const initials = name.substring(0, 2).toUpperCase();

    if (userPillName) userPillName.textContent = name;
    if (userAvatar) userAvatar.textContent = initials;

    const hour = new Date().getHours();
    let greeting = 'Buenos días';
    if (hour >= 12 && hour < 18) greeting = 'Buenas tardes';
    else if (hour >= 18 || hour < 5) greeting = 'Buenas noches';

    if (greetingEl) {
      greetingEl.innerHTML = `${greeting}, <strong>${name.split(' ')[0]}</strong>`;
    }

    const settingsUser = document.getElementById('settings-user-fullname');
    if (settingsUser) settingsUser.textContent = name;
    const settingsRole = document.getElementById('settings-user-role');
    if (settingsRole) settingsRole.textContent = isAdmin ? 'Administrador del Sistema' : 'Usuario';
  } else {
    if (userPillName) userPillName.textContent = 'Iniciar Sesión';
    if (userAvatar) userAvatar.textContent = '?';
    if (greetingEl) greetingEl.innerHTML = `Bienvenido a <strong>FinanzasApp</strong>`;
  }
}

function saveLocalState() {
  localStorage.setItem('finanzas_accounts', JSON.stringify(AppState.accounts));
  localStorage.setItem('finanzas_transactions', JSON.stringify(AppState.transactions));
  localStorage.setItem('finanzas_budgets', JSON.stringify(AppState.budgets));
  localStorage.setItem('finanzas_goals', JSON.stringify(AppState.goals));
  localStorage.setItem('finanzas_credits', JSON.stringify(AppState.credits || []));
}

// ==========================================================
// INICIALIZACIÓN
// ==========================================================
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Revisar estado de mantenimiento
  await checkMaintenanceStatus();

  // 2. Revisar si hay token
  if (!AppState.token) {
    openModal('modal-auth');
  } else {
    updateUserInterface();
    await fetchCloudData();
  }

  // 3. Listener del formulario de autenticación
  const formAuth = document.getElementById('form-auth-modal');
  if (formAuth) {
    formAuth.addEventListener('submit', handleAuthSubmit);
  }

  // 4. Configurar colapso de sidebar
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.app-sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // 5. Asignar navegación
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', () => {
      const view = el.getAttribute('data-view');
      if (view) switchView(view);
    });
  });

  // 6. Inicializar módulos
  if (window.DashboardModule) window.DashboardModule.init();
  if (window.TransactionsModule) window.TransactionsModule.init();
  if (window.AccountsModule) window.AccountsModule.init();
  if (window.CreditsModule) window.CreditsModule.init();
  if (window.BudgetModule) window.BudgetModule.init();
  if (window.GoalsModule) window.GoalsModule.init();
  if (window.ReportsModule) window.ReportsModule.init();
});

window.AppState = AppState;
window.formatCurrency = formatCurrency;
window.switchView = switchView;
window.openModal = openModal;
window.closeModal = closeModal;
window.setAuthMode = setAuthMode;
window.handleLogout = handleLogout;
window.openAdminPanel = openAdminPanel;
window.toggleMaintenanceMode = toggleMaintenanceMode;
window.adminChangePassword = adminChangePassword;
window.adminDeleteUser = adminDeleteUser;
window.handleExcelFileSelected = handleExcelFileSelected;
window.submitExcelImport = submitExcelImport;
window.saveLocalState = saveLocalState;
window.uuidv4 = uuidv4;
