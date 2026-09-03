/**
 * FINANZASAPP — MÓDULO DE ADMINISTRACIÓN DE CUENTAS
 * Creación, edición, saldos, transferencias y tarjetas pastel
 */

const AccountsModule = {
  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    const formAccount = document.getElementById('form-add-account');
    if (formAccount) {
      formAccount.addEventListener('submit', (e) => this.handleCreateAccount(e));
    }

    const formTransfer = document.getElementById('form-transfer-modal');
    if (formTransfer) {
      formTransfer.addEventListener('submit', (e) => this.handleTransfer(e));
    }
  },

  render() {
    const container = document.getElementById('accounts-view-grid');
    if (!container) return;

    const activeAccounts = AppState.accounts.filter(a => !a.is_deleted);
    const defaultStyles = ['principal', 'ahorros', 'efectivo'];
    const defaultIcons = ['landmark', 'piggy-bank', 'wallet'];

    container.innerHTML = activeAccounts.map((acc, idx) => {
      const styleClass = acc.styleClass || defaultStyles[idx % defaultStyles.length];
      const icon = acc.icon || defaultIcons[idx % defaultIcons.length];
      const change = acc.change || '+3.5%';

      return `
        <div class="account-pastel-card ${styleClass}" style="min-height: 210px;">
          <div class="acc-card-top-info">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <h4>${acc.name}</h4>
              <button onclick="AccountsModule.deleteAccount('${acc.id}')" style="background: none; border: none; color: var(--text-muted); cursor: pointer;" title="Eliminar cuenta">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
            <div class="acc-balance" style="font-size: 1.6rem; margin: 8px 0;">${formatCurrency(acc.balance)}</div>
            <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: capitalize;">Tipo: ${acc.type}</span>
          </div>

          <div class="acc-card-bottom-pill">
            <div class="acc-icon-square">
              <i class="fas fa-${icon}"></i>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button onclick="AccountsModule.openTransferModal('${acc.id}')" class="btn-secondary" style="padding: 4px 12px; font-size: 0.72rem; border-radius: 9999px;">
                <i class="fas fa-exchange-alt"></i> Transferir
              </button>
              <span class="acc-change-tag">${change}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Actualizar selects en otros módulos
    if (window.TransactionsModule) window.TransactionsModule.populateAccountSelects();
  },

  handleCreateAccount(e) {
    e.preventDefault();
    const name = document.getElementById('acc-new-name').value.trim();
    const type = document.getElementById('acc-new-type').value;
    const balance = parseFloat(document.getElementById('acc-new-balance').value) || 0;
    const styleClass = document.getElementById('acc-new-style').value || 'principal';

    if (!name) return alert('Ingresa un nombre para la cuenta');

    const iconsByType = {
      banco: 'landmark',
      ahorros: 'piggy-bank',
      efectivo: 'wallet',
      billetera: 'mobile-screen'
    };

    const newAcc = {
      id: uuidv4(),
      name,
      type,
      balance,
      icon: iconsByType[type] || 'wallet',
      styleClass,
      change: '+0.0%'
    };

    AppState.accounts.push(newAcc);
    saveLocalState();

    document.getElementById('form-add-account').reset();
    closeModal('modal-add-account');

    this.render();
    if (window.DashboardModule) window.DashboardModule.render();
  },

  openTransferModal(sourceId) {
    const srcSel = document.getElementById('transfer-source-acc');
    const dstSel = document.getElementById('transfer-dest-acc');

    const options = AppState.accounts
      .filter(a => !a.is_deleted)
      .map(a => `<option value="${a.id}">${a.name} (${formatCurrency(a.balance)})</option>`)
      .join('');

    if (srcSel) {
      srcSel.innerHTML = options;
      srcSel.value = sourceId;
    }
    if (dstSel) dstSel.innerHTML = options;

    openModal('modal-transfer-direct');
  },

  handleTransfer(e) {
    e.preventDefault();
    const srcId = document.getElementById('transfer-source-acc').value;
    const dstId = document.getElementById('transfer-dest-acc').value;
    const amount = parseFloat(document.getElementById('transfer-amount').value);

    if (srcId === dstId) return alert('Debes elegir dos cuentas diferentes para la transferencia.');
    if (!amount || amount <= 0) return alert('Ingresa un monto válido.');

    const srcAcc = AppState.accounts.find(a => a.id === srcId);
    const dstAcc = AppState.accounts.find(a => a.id === dstId);

    if (!srcAcc || !dstAcc) return alert('Cuenta no encontrada.');

    srcAcc.balance = (parseFloat(srcAcc.balance) || 0) - amount;
    dstAcc.balance = (parseFloat(dstAcc.balance) || 0) + amount;

    // Crear registro de movimiento
    const tx = {
      id: uuidv4(),
      amount,
      account_id: srcId,
      to_account_id: dstId,
      type: 'transferencia',
      category: 'Transferencia',
      description: `Transferencia: ${srcAcc.name} → ${dstAcc.name}`,
      date: new Date().toISOString().split('T')[0],
      icon: 'exchange-alt'
    };

    AppState.transactions.unshift(tx);
    saveLocalState();

    closeModal('modal-transfer-direct');
    this.render();
    if (window.DashboardModule) window.DashboardModule.render();
    if (window.TransactionsModule) window.TransactionsModule.render();
    alert(`✅ Se transfirieron ${formatCurrency(amount)} con éxito.`);
  },

  deleteAccount(id) {
    if (AppState.accounts.filter(a => !a.is_deleted).length <= 1) {
      return alert('Debes mantener al menos una cuenta activa.');
    }
    if (!confirm('¿Seguro que deseas eliminar esta cuenta?')) return;

    const acc = AppState.accounts.find(a => a.id === id);
    if (acc) acc.is_deleted = true;

    saveLocalState();
    this.render();
    if (window.DashboardModule) window.DashboardModule.render();
  }
};

window.AccountsModule = AccountsModule;
