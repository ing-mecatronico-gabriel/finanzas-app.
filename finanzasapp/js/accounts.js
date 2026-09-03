/**
 * FINANZASAPP — MÓDULO DE ADMINISTRACIÓN DE CUENTAS
 * Creación, edición, saldos, transferencias, estilos vibrantes y auto-sincronización en la nube
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
    const defaultStyles = ['principal', 'ahorros', 'efectivo', 'azul-electrico', 'coral-sunset', 'cian-oceano', 'rosa-magenta', 'titanio-dark'];
    const defaultIcons = ['landmark', 'piggy-bank', 'wallet', 'mobile-screen', 'coins', 'gem', 'shield-alt', 'credit-card'];

    if (activeAccounts.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted);">
          <i class="fas fa-wallet" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.4; display: block;"></i>
          No tienes cuentas registradas. Toca (+ Nueva Cuenta) para crear una.
        </div>
      `;
      return;
    }

    container.innerHTML = activeAccounts.map((acc, idx) => {
      const styleClass = acc.styleClass || defaultStyles[idx % defaultStyles.length];
      const icon = acc.icon || defaultIcons[idx % defaultIcons.length];
      const change = acc.change || '0%';

      return `
        <div class="account-pastel-card ${styleClass} tilt-card shine-effect" style="min-height: 210px;">
          <div class="acc-card-top-info">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <h4>${acc.name}</h4>
              <button onclick="AccountsModule.deleteAccount('${acc.id}')" class="btn-interactive" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px;" title="Eliminar cuenta">
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
              <button onclick="AccountsModule.openTransferModal('${acc.id}')" class="btn-secondary btn-interactive" style="padding: 4px 12px; font-size: 0.72rem; border-radius: 9999px;">
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
    if (window.CreditsModule) window.CreditsModule.populateSelects();

    if (window.MotionSystem && window.MotionSystem.setup3DTilt) {
      window.MotionSystem.setup3DTilt();
    }
  },

  async handleCreateAccount(e) {
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
      change: '0%'
    };

    AppState.accounts.push(newAcc);
    saveLocalState();

    // Guardar directamente en la base de datos en la nube
    if (AppState.token && navigator.onLine) {
      fetch(`${API_BASE}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AppState.token}`
        },
        body: JSON.stringify({
          id: newAcc.id,
          name: newAcc.name,
          type: newAcc.type,
          balance: newAcc.balance,
          color: newAcc.styleClass,
          icon: newAcc.icon
        })
      }).catch(err => console.warn('Error guardando cuenta en nube:', err));
    }

    document.getElementById('form-add-account').reset();
    closeModal('modal-add-account');

    if (window.SoundFX) window.SoundFX.playSuccess();
    if (window.MotionSystem) {
      window.MotionSystem.showToast('Cuenta Creada', `${name} con saldo inicial de ${formatCurrency(balance)}`);
    }

    this.render();
    if (window.DashboardModule) window.DashboardModule.render();
  },

  openTransferModal(sourceAccountId) {
    const srcSel = document.getElementById('transfer-source-acc');
    const dstSel = document.getElementById('transfer-dest-acc');

    const activeAccs = AppState.accounts.filter(a => !a.is_deleted);
    let options = '<optgroup label="🏦 Cuentas y Bolsillos">';
    options += activeAccs.map(a => `<option value="${a.id}">${a.name} (${formatCurrency(a.balance)})</option>`).join('');
    options += '</optgroup>';

    const activeCredits = (AppState.credits || []).filter(c => !c.is_deleted);
    if (activeCredits.length > 0) {
      options += '<optgroup label="💳 Tarjetas de Crédito (Abonar a Deuda)">';
      options += activeCredits.map(c => `<option value="cred_${c.id}">[Crédito] ${c.name} (Deuda: ${formatCurrency(c.used_amount)})</option>`).join('');
      options += '</optgroup>';
    }

    if (srcSel) {
      srcSel.innerHTML = options;
      if (sourceAccountId) srcSel.value = sourceAccountId;
    }
    if (dstSel) {
      dstSel.innerHTML = options;
      if (activeAccs.length > 1) {
        const nextAcc = activeAccs.find(a => a.id !== sourceAccountId);
        if (nextAcc) dstSel.value = nextAcc.id;
      }
    }

    openModal('modal-transfer-direct');
  },

  async handleTransfer(e) {
    e.preventDefault();
    const srcId = document.getElementById('transfer-source-acc').value;
    const dstId = document.getElementById('transfer-dest-acc').value;
    const amount = parseFloat(document.getElementById('transfer-amount').value);

    if (!amount || amount <= 0) {
      return alert('Ingresa un monto válido');
    }

    if (srcId === dstId) {
      return alert('La cuenta de origen y destino deben ser diferentes');
    }

    const isDstCredit = dstId.startsWith('cred_');
    const cleanDestCreditId = isDstCredit ? dstId.replace('cred_', '') : null;

    const srcAcc = AppState.accounts.find(a => a.id === srcId);
    if (!srcAcc) return alert('Cuenta de origen no encontrada');

    if (srcAcc.balance < amount) {
      if (!confirm(`El saldo en ${srcAcc.name} (${formatCurrency(srcAcc.balance)}) es menor que el monto a transferir. ¿Continuar?`)) {
        return;
      }
    }

    // Descontar de cuenta origen
    srcAcc.balance = (parseFloat(srcAcc.balance) || 0) - amount;

    let dstName = 'Destino';
    if (isDstCredit) {
      const cred = (AppState.credits || []).find(c => c.id === cleanDestCreditId);
      if (cred) {
        cred.used_amount = Math.max(0, (parseFloat(cred.used_amount) || 0) - amount);
        dstName = cred.name;
        localStorage.setItem('finanzas_credits', JSON.stringify(AppState.credits));
      }
    } else {
      const dstAcc = AppState.accounts.find(a => a.id === dstId);
      if (dstAcc) {
        dstAcc.balance = (parseFloat(dstAcc.balance) || 0) + amount;
        dstName = dstAcc.name;
      }
    }

    // Fecha automática de hoy (sin tener que elegir manualmente)
    const today = new Date().toISOString().split('T')[0];

    // Registrar transacción de transferencia
    const tx = {
      id: uuidv4(),
      amount,
      account_id: srcId,
      to_account_id: dstId,
      type: 'transferencia',
      category: isDstCredit ? 'Pago Crédito / Tarjeta' : 'Transferencia',
      description: `Transferencia: ${srcAcc.name} → ${dstName}`,
      date: today,
      icon: 'exchange-alt'
    };

    AppState.transactions.unshift(tx);
    saveLocalState();

    // Sincronizar en segundo plano con la base de datos
    if (AppState.token && navigator.onLine) {
      fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AppState.token}`
        },
        body: JSON.stringify(tx)
      }).catch(err => console.warn(err));
    }

    document.getElementById('form-transfer-modal').reset();
    closeModal('modal-transfer-direct');

    if (window.SoundFX) window.SoundFX.playCash();
    if (window.MotionSystem) {
      window.MotionSystem.spawnFinancialParticles(e.target);
      window.MotionSystem.showToast('Transferencia Exitosa', `${formatCurrency(amount)} de ${srcAcc.name} a ${dstName}`);
    }

    this.render();
    if (window.DashboardModule) window.DashboardModule.render();
    if (window.TransactionsModule) window.TransactionsModule.render();
    if (window.CreditsModule) window.CreditsModule.render();
  },

  async deleteAccount(accId) {
    if (!confirm('¿Deseas eliminar esta cuenta? Los movimientos previos se mantendrán.')) return;
    const acc = AppState.accounts.find(a => a.id === accId);
    if (acc) {
      acc.is_deleted = true;
      saveLocalState();

      if (AppState.token && navigator.onLine) {
        fetch(`${API_BASE}/accounts/${accId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${AppState.token}` }
        }).catch(err => console.warn(err));
      }

      this.render();
      if (window.DashboardModule) window.DashboardModule.render();
    }
  }
};

window.AccountsModule = AccountsModule;
