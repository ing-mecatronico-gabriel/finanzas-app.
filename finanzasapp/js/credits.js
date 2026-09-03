/**
 * FINANZASAPP — MÓDULO DE CRÉDITO, TARJETAS Y PRÉSTAMOS
 * Cupos totales, dinero utilizado/deuda, disponible, días de corte, límites de pago y abonos
 */

const CreditsModule = {
  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    // Formulario de Crear Crédito
    const formAdd = document.getElementById('form-add-credit');
    if (formAdd) {
      formAdd.addEventListener('submit', (e) => this.handleCreateCredit(e));
    }

    // Formulario de Abonar / Pagar Crédito
    const formPay = document.getElementById('form-pay-credit');
    if (formPay) {
      formPay.addEventListener('submit', (e) => this.handleSubmitPayment(e));
    }

    // Formulario de Consumo con Crédito
    const formSpend = document.getElementById('form-spend-credit');
    if (formSpend) {
      formSpend.addEventListener('submit', (e) => this.handleSubmitSpend(e));
    }
  },

  render() {
    this.renderKpiSummary();
    this.renderCreditsList();
    this.populateSelects();
  },

  renderKpiSummary() {
    const activeCredits = (AppState.credits || []).filter(c => !c.is_deleted);

    let totalLimit = 0;
    let totalUsed = 0;

    activeCredits.forEach(c => {
      totalLimit += parseFloat(c.credit_limit) || 0;
      totalUsed += parseFloat(c.used_amount) || 0;
    });

    const totalAvailable = Math.max(0, totalLimit - totalUsed);

    const elLimit = document.getElementById('credit-kpi-total-limit');
    const elUsed = document.getElementById('credit-kpi-total-used');
    const elAvailable = document.getElementById('credit-kpi-total-available');

    if (elLimit) elLimit.textContent = formatCurrency(totalLimit);
    if (elUsed) elUsed.textContent = formatCurrency(totalUsed);
    if (elAvailable) elAvailable.textContent = formatCurrency(totalAvailable);
  },

  renderCreditsList() {
    const container = document.getElementById('credits-cards-container');
    if (!container) return;

    const activeCredits = (AppState.credits || []).filter(c => !c.is_deleted);

    if (activeCredits.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted);">
          <i class="fas fa-credit-card" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.4; display: block;"></i>
          No tienes tarjetas de crédito ni líneas activas.<br>
          <span style="font-size: 0.85rem;">Toca <strong>(+ Nuevo Crédito)</strong> para registrar una tarjeta o préstamo.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = activeCredits.map(c => {
      const limit = parseFloat(c.credit_limit) || 0;
      const used = parseFloat(c.used_amount) || 0;
      const available = Math.max(0, limit - used);
      const pctUsed = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

      let statusColor = '#10B981';
      if (pctUsed >= 80) statusColor = '#EF4444';
      else if (pctUsed >= 50) statusColor = '#F59E0B';

      const color = c.color || '#8B5CF6';

      return `
        <div class="activity-card tilt-card shine-effect" style="border-top: 4px solid ${color}; padding: 22px;">
          <!-- Cabecera de la Tarjeta de Crédito -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="acc-icon-square" style="background: ${color}15; color: ${color}; font-size: 1.25rem;">
                <i class="fas fa-${c.icon || 'credit-card'}"></i>
              </div>
              <div>
                <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin-bottom: 2px;">${c.name}</h4>
                <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: capitalize;">${c.type || 'Tarjeta de Crédito'}</span>
              </div>
            </div>
            <button onclick="CreditsModule.deleteCredit('${c.id}')" class="btn-interactive" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px;" title="Eliminar crédito">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>

          <!-- Métricas de Dinero: Deuda vs Disponible -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; background: var(--bg-card-subtle); padding: 12px; border-radius: var(--radius-md);">
            <div>
              <span style="font-size: 0.72rem; color: var(--expense-color); font-weight: 700; text-transform: uppercase;">Deuda / Utilizado</span>
              <div style="font-size: 1.2rem; font-weight: 800; color: var(--text-main); margin-top: 2px;">${formatCurrency(used)}</div>
            </div>
            <div>
              <span style="font-size: 0.72rem; color: var(--income-color); font-weight: 700; text-transform: uppercase;">Cupo Disponible</span>
              <div style="font-size: 1.2rem; font-weight: 800; color: var(--text-main); margin-top: 2px;">${formatCurrency(available)}</div>
            </div>
          </div>

          <!-- Barra de Uso de Crédito -->
          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 600; margin-bottom: 6px;">
              <span>Uso del cupo: <strong>${pctUsed}%</strong></span>
              <span>Límite total: ${formatCurrency(limit)}</span>
            </div>
            <div style="width: 100%; height: 8px; background: var(--bg-input); border-radius: 9999px; overflow: hidden;">
              <div class="progress-animated-bar" style="width: ${pctUsed}%; height: 100%; background: ${statusColor}; border-radius: 9999px;"></div>
            </div>
          </div>

          <!-- Información de Fechas Clave (Corte y Límite de Pago) -->
          <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-secondary); border-top: 1px solid var(--border-light); padding-top: 12px; margin-bottom: 16px;">
            <div>
              <i class="fas fa-calendar-alt" style="color: var(--brand-blue);"></i>
              <span>Corte: <strong>Día ${c.cutoff_day || 15}</strong></span>
            </div>
            <div>
              <i class="fas fa-clock" style="color: #F59E0B;"></i>
              <span>Pago antes de: <strong>Día ${c.payment_day || 30}</strong></span>
            </div>
          </div>

          <!-- Botones de Acción: Abonar / Usar -->
          <div style="display: flex; gap: 8px;">
            <button onclick="CreditsModule.openPaymentModal('${c.id}')" class="btn-primary-action btn-interactive" style="flex: 1; padding: 8px 12px; font-size: 0.8rem; justify-content: center; background: #10B981;">
              <i class="fas fa-hand-holding-usd"></i> Abonar / Pagar
            </button>
            <button onclick="CreditsModule.openSpendModal('${c.id}')" class="btn-secondary btn-interactive" style="flex: 1; padding: 8px 12px; font-size: 0.8rem; justify-content: center;">
              <i class="fas fa-shopping-bag"></i> Consumo
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (window.MotionSystem && window.MotionSystem.setup3DTilt) {
      window.MotionSystem.setup3DTilt();
    }
  },

  populateSelects() {
    // Llenar selects para modal de pago
    const payCreditSel = document.getElementById('pay-target-credit');
    const payAccSel = document.getElementById('pay-source-account');

    if (payCreditSel) {
      const activeCredits = (AppState.credits || []).filter(c => !c.is_deleted);
      payCreditSel.innerHTML = activeCredits.map(c => `<option value="${c.id}">${c.name} (Deuda: ${formatCurrency(c.used_amount)})</option>`).join('');
    }

    if (payAccSel) {
      const activeAccs = AppState.accounts.filter(a => !a.is_deleted);
      payAccSel.innerHTML = activeAccs.map(a => `<option value="${a.id}">${a.name} (Saldo: ${formatCurrency(a.balance)})</option>`).join('');
    }

    // Llenar select de modal de consumo
    const spendCreditSel = document.getElementById('spend-target-credit');
    if (spendCreditSel) {
      const activeCredits = (AppState.credits || []).filter(c => !c.is_deleted);
      spendCreditSel.innerHTML = activeCredits.map(c => {
        const available = Math.max(0, (c.credit_limit || 0) - (c.used_amount || 0));
        return `<option value="${c.id}">${c.name} (Disponible: ${formatCurrency(available)})</option>`;
      }).join('');
    }

    // Actualizar también el select de movimientos general
    if (window.TransactionsModule && window.TransactionsModule.populateAccountSelects) {
      window.TransactionsModule.populateAccountSelects();
    }
  },

  handleCreateCredit(e) {
    e.preventDefault();
    const name = document.getElementById('credit-new-name').value.trim();
    const type = document.getElementById('credit-new-type').value;
    const limit = parseFloat(document.getElementById('credit-new-limit').value);
    const initialUsed = parseFloat(document.getElementById('credit-new-initial-used').value) || 0;
    const cutoff = parseInt(document.getElementById('credit-new-cutoff').value) || 15;
    const payment = parseInt(document.getElementById('credit-new-payment').value) || 30;
    const interest = parseFloat(document.getElementById('credit-new-interest').value) || 0;
    const color = document.getElementById('credit-new-color').value || '#8B5CF6';

    if (!name || isNaN(limit) || limit <= 0) {
      alert('Por favor ingresa un nombre y un cupo de crédito válido.');
      return;
    }

    const newCredit = {
      id: uuidv4(),
      name,
      type,
      credit_limit: limit,
      used_amount: initialUsed,
      cutoff_day: cutoff,
      payment_day: payment,
      interest_rate: interest,
      color,
      icon: type === 'prestamo' ? 'file-invoice-dollar' : 'credit-card'
    };

    if (!AppState.credits) AppState.credits = [];
    AppState.credits.push(newCredit);
    localStorage.setItem('finanzas_credits', JSON.stringify(AppState.credits));

    // Sincronizar en segundo plano con la API
    if (AppState.token && navigator.onLine) {
      fetch(`${API_BASE}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AppState.token}`
        },
        body: JSON.stringify({
          name: newCredit.name,
          bank: newCredit.name,
          credit_limit: newCredit.credit_limit,
          used_amount: newCredit.used_amount,
          cutoff_day: newCredit.cutoff_day,
          payment_day: newCredit.payment_day,
          interest_rate: newCredit.interest_rate,
          color: newCredit.color
        })
      }).catch(err => console.warn('Error guardando tarjeta en nube:', err));
    }

    document.getElementById('form-add-credit').reset();
    closeModal('modal-add-credit');

    if (window.SoundFX) window.SoundFX.playSuccess();
    this.render();
    if (window.MotionSystem) {
      window.MotionSystem.showToast('Crédito Registrado', `${name} con cupo de ${formatCurrency(limit)}`);
    }
  },

  openPaymentModal(creditId) {
    const sel = document.getElementById('pay-target-credit');
    if (sel && creditId) sel.value = creditId;
    openModal('modal-pay-credit');
  },

  handleSubmitPayment(e) {
    e.preventDefault();
    const creditId = document.getElementById('pay-target-credit').value;
    const accountId = document.getElementById('pay-source-account').value;
    const amount = parseFloat(document.getElementById('pay-amount').value);

    if (!amount || amount <= 0) {
      alert('Ingresa un monto de abono válido.');
      return;
    }

    const credit = (AppState.credits || []).find(c => c.id === creditId);
    const account = AppState.accounts.find(a => a.id === accountId);

    if (!credit || !account) {
      alert('Crédito o cuenta no encontrada.');
      return;
    }

    if ((parseFloat(account.balance) || 0) < amount) {
      if (!confirm(`El saldo en ${account.name} (${formatCurrency(account.balance)}) es menor que el abono. ¿Continuar igualmente?`)) {
        return;
      }
    }

    // Disminuir saldo de la cuenta origen
    account.balance = (parseFloat(account.balance) || 0) - amount;

    // Disminuir dinero utilizado del crédito (Abono a la deuda)
    credit.used_amount = Math.max(0, (parseFloat(credit.used_amount) || 0) - amount);

    // Registrar transacción de abono
    const tx = {
      id: uuidv4(),
      amount,
      account_id: accountId,
      to_account_id: creditId,
      type: 'transferencia',
      category: 'Pago Crédito / Tarjeta',
      description: `Abono a ${credit.name} desde ${account.name}`,
      date: new Date().toISOString().split('T')[0],
      icon: 'hand-holding-usd'
    };

    AppState.transactions.unshift(tx);
    saveLocalState();
    localStorage.setItem('finanzas_credits', JSON.stringify(AppState.credits));

    document.getElementById('form-pay-credit').reset();
    closeModal('modal-pay-credit');

    this.render();
    if (window.DashboardModule) window.DashboardModule.render();
    if (window.TransactionsModule) window.TransactionsModule.render();
    if (window.AccountsModule) window.AccountsModule.render();

    if (window.SoundFX) window.SoundFX.playCash();
    if (window.MotionSystem) {
      window.MotionSystem.spawnFinancialParticles(e.target);
      window.MotionSystem.showToast('¡Abono Realizado!', `Has pagado ${formatCurrency(amount)} a ${credit.name}. Deuda restante: ${formatCurrency(credit.used_amount)}`);
    }
  },

  openSpendModal(creditId) {
    const sel = document.getElementById('spend-target-credit');
    if (sel && creditId) sel.value = creditId;
    openModal('modal-spend-credit');
  },

  handleSubmitSpend(e) {
    e.preventDefault();
    const creditId = document.getElementById('spend-target-credit').value;
    const amount = parseFloat(document.getElementById('spend-amount').value);
    const description = document.getElementById('spend-desc').value.trim() || 'Consumo con crédito';
    const category = document.getElementById('spend-category').value;
    const installments = parseInt(document.getElementById('spend-installments').value) || 1;

    if (!amount || amount <= 0) {
      alert('Ingresa un monto válido.');
      return;
    }

    const credit = (AppState.credits || []).find(c => c.id === creditId);
    if (!credit) {
      alert('Crédito no encontrado.');
      return;
    }

    const available = (parseFloat(credit.credit_limit) || 0) - (parseFloat(credit.used_amount) || 0);
    if (amount > available) {
      if (!confirm(`El monto ($ ${amount}) supera el cupo disponible ($ ${available}). ¿Registrar consumo igualmente?`)) {
        return;
      }
    }

    // Aumentar dinero utilizado (Deuda)
    credit.used_amount = (parseFloat(credit.used_amount) || 0) + amount;

    // Registrar movimiento de gasto
    const tx = {
      id: uuidv4(),
      amount,
      account_id: creditId,
      type: 'gasto',
      category,
      description: `${description} (${installments} cuotas con ${credit.name})`,
      date: new Date().toISOString().split('T')[0],
      icon: 'credit-card'
    };

    AppState.transactions.unshift(tx);
    saveLocalState();
    localStorage.setItem('finanzas_credits', JSON.stringify(AppState.credits));

    document.getElementById('form-spend-credit').reset();
    closeModal('modal-spend-credit');

    this.render();
    if (window.DashboardModule) window.DashboardModule.render();
    if (window.TransactionsModule) window.TransactionsModule.render();

    if (window.SoundFX) window.SoundFX.playCardSwipe();
    if (window.MotionSystem) {
      window.MotionSystem.showToast('Gasto con Crédito', `${description}: ${formatCurrency(amount)} cargado a ${credit.name}`);
    }
  },

  deleteCredit(creditId) {
    if (!confirm('¿Deseas eliminar este crédito?')) return;
    const idx = (AppState.credits || []).findIndex(c => c.id === creditId);
    if (idx !== -1) {
      AppState.credits[idx].is_deleted = true;
      localStorage.setItem('finanzas_credits', JSON.stringify(AppState.credits));

      if (AppState.token && navigator.onLine) {
        fetch(`${API_BASE}/cards/${creditId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${AppState.token}` }
        }).catch(e => console.warn(e));
      }

      this.render();
    }
  }
};

window.CreditsModule = CreditsModule;
