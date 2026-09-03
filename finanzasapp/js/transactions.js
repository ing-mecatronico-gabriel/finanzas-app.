/**
 * FINANZASAPP — MÓDULO DE MOVIMIENTOS Y TRANSACCIONES
 * Filtros en tiempo real, buscador, partículas de éxito y notificaciones toast
 */

const TransactionsModule = {
  currentTypeFilter: 'todos',
  searchQuery: '',
  modalTxType: 'gasto',

  expenseCategories: [
    'Alimentación', 'Supermercado', 'Restaurantes', 'Transporte', 'Gasolina',
    'Vivienda', 'Servicios', 'Entretenimiento', 'Salud', 'Compras', 'Educación', 'Otros'
  ],

  incomeCategories: [
    'Salario', 'Honorarios', 'Negocio', 'Ventas', 'Inversiones', 'Regalos', 'Otros'
  ],

  init() {
    this.bindEvents();
    this.populateAccountSelects();
    this.populateCategorySelect();
    this.render();
  },

  bindEvents() {
    // Buscador
    const searchInput = document.getElementById('tx-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.render();
      });
    }

    // Filtros de Tipo
    const filterBtns = document.querySelectorAll('.tx-filter-pill');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTypeFilter = btn.getAttribute('data-filter') || 'todos';
        this.render();
      });
    });

    // Segmentos del Modal
    const modalSegments = document.querySelectorAll('.segment-btn');
    modalSegments.forEach(seg => {
      seg.addEventListener('click', () => {
        modalSegments.forEach(s => s.classList.remove('active'));
        seg.classList.add('active');
        this.setModalTxType(seg.getAttribute('data-type') || 'gasto');
      });
    });

    // Envío del Formulario
    const form = document.getElementById('form-add-movement');
    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Botones de Abrir Modal
    document.querySelectorAll('[data-action="open-add-modal"]').forEach(b => {
      b.addEventListener('click', () => openModal('modal-add-movement'));
    });
  },

  setModalTxType(type) {
    this.modalTxType = type;
    const isTransfer = type === 'transferencia';

    const toAccGroup = document.getElementById('modal-group-to-account');
    const catGroup = document.getElementById('modal-group-category');
    const lblSrc = document.getElementById('modal-lbl-source-account');

    if (toAccGroup) toAccGroup.style.display = isTransfer ? 'block' : 'none';
    if (catGroup) catGroup.style.display = isTransfer ? 'none' : 'block';
    if (lblSrc) lblSrc.textContent = isTransfer ? 'Cuenta de Origen' : 'Cuenta';

    this.populateCategorySelect();
  },

  populateCategorySelect() {
    const catSel = document.getElementById('modal-tx-category');
    if (!catSel) return;

    const list = this.modalTxType === 'ingreso' ? this.incomeCategories : this.expenseCategories;
    catSel.innerHTML = list.map(c => `<option value="${c}">${c}</option>`).join('');
  },

  populateAccountSelects() {
    const srcSel = document.getElementById('modal-tx-account');
    const dstSel = document.getElementById('modal-tx-to-account');

    let accOptions = '<optgroup label="🏦 Cuentas y Bolsillos">';
    accOptions += AppState.accounts
      .filter(a => !a.is_deleted)
      .map(a => `<option value="${a.id}">${a.name} (${formatCurrency(a.balance)})</option>`)
      .join('');
    accOptions += '</optgroup>';

    const activeCredits = (AppState.credits || []).filter(c => !c.is_deleted);
    if (activeCredits.length > 0) {
      accOptions += '<optgroup label="💳 Tarjetas y Líneas de Crédito">';
      accOptions += activeCredits.map(c => {
        const available = Math.max(0, (c.credit_limit || 0) - (c.used_amount || 0));
        return `<option value="cred_${c.id}">[Crédito] ${c.name} (Disp: ${formatCurrency(available)} | Deuda: ${formatCurrency(c.used_amount)})</option>`;
      }).join('');
      accOptions += '</optgroup>';
    }

    if (srcSel) srcSel.innerHTML = accOptions;
    if (dstSel) dstSel.innerHTML = accOptions;
  },

  render() {
    const container = document.getElementById('full-movements-container');
    if (!container) return;

    let list = [...AppState.transactions].filter(t => !t.is_deleted);

    // Filtrar por tipo
    if (this.currentTypeFilter !== 'todos') {
      list = list.filter(t => {
        if (this.currentTypeFilter === 'gasto') return t.type === 'gasto' || t.type === 'egreso';
        return t.type === this.currentTypeFilter;
      });
    }

    // Filtrar por búsqueda
    if (this.searchQuery) {
      list = list.filter(t => {
        const desc = (t.description || '').toLowerCase();
        const cat = (t.category || '').toLowerCase();
        return desc.includes(this.searchQuery) || cat.includes(this.searchQuery);
      });
    }

    // Ordenar por fecha más reciente
    list.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (list.length === 0) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-muted);">
          <i class="fas fa-receipt" style="font-size: 2.2rem; margin-bottom: 12px; opacity: 0.5;"></i>
          <p>No se encontraron movimientos con los filtros seleccionados.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map((t, idx) => {
      const isIngreso = t.type === 'ingreso';
      const isTransfer = t.type === 'transferencia';
      const sign = isIngreso ? '+' : (isTransfer ? '⇄ ' : '-');
      const badgeClass = isIngreso ? 'ingreso' : (isTransfer ? 'transferencia' : 'gasto');
      const badgeText = isIngreso ? 'Ingreso' : (isTransfer ? 'Transferencia' : 'Gasto');
      const icon = t.icon || (isIngreso ? 'arrow-up-right-dots' : (isTransfer ? 'exchange-alt' : 'shopping-bag'));
      
      let accName = 'Cuenta';
      if (t.account_id && t.account_id.startsWith('cred_')) {
        const cId = t.account_id.replace('cred_', '');
        const cred = (AppState.credits || []).find(c => c.id === cId);
        accName = cred ? `[Crédito] ${cred.name}` : 'Crédito';
      } else {
        const acc = AppState.accounts.find(a => a.id === t.account_id);
        if (acc) accName = acc.name;
      }
      const staggerClass = `stagger-${Math.min((idx % 6) + 1, 6)}`;

      return `
        <div class="movement-item ${staggerClass}" style="border-bottom: 1px solid var(--border-light); padding: 14px 10px;">
          <div class="movement-left">
            <div class="movement-icon-box ${badgeClass}">
              <i class="fas fa-${icon}"></i>
            </div>
            <div class="movement-meta">
              <h5 style="font-size: 0.95rem;">${t.description || t.category}</h5>
              <p>${accName} · ${t.category} · ${t.date || 'Hoy'}</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <div class="movement-right">
              <span class="movement-amount ${badgeClass}">${sign}${formatCurrency(t.amount)}</span>
              <span class="movement-type-badge ${badgeClass}">${badgeText}</span>
            </div>
            <button onclick="TransactionsModule.deleteTransaction('${t.id}')" class="btn-interactive" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 6px;" title="Eliminar">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('modal-tx-amount').value);
    const account_id = document.getElementById('modal-tx-account').value;
    const to_account_id = document.getElementById('modal-tx-to-account').value;
    const category = document.getElementById('modal-tx-category').value;
    const description = document.getElementById('modal-tx-desc').value.trim();
    const date = document.getElementById('modal-tx-date').value || new Date().toISOString().split('T')[0];

    if (!amount || amount <= 0 || !account_id) {
      if (window.MotionSystem) window.MotionSystem.showToast('Error', 'Ingresa un monto válido y selecciona una cuenta.', 'exclamation-circle');
      else alert('Ingresa un monto válido y selecciona una cuenta.');
      return;
    }

    const type = this.modalTxType;
    if (type === 'transferencia' && account_id === to_account_id) {
      if (window.MotionSystem) window.MotionSystem.showToast('Error', 'La cuenta origen y destino deben ser diferentes.', 'exclamation-circle');
      else alert('La cuenta origen y destino deben ser diferentes.');
      return;
    }

    const isCreditSource = account_id.startsWith('cred_');
    const cleanCreditId = isCreditSource ? account_id.replace('cred_', '') : null;
    const isCreditDest = to_account_id && to_account_id.startsWith('cred_');
    const cleanDestCreditId = isCreditDest ? to_account_id.replace('cred_', '') : null;

    const newTx = {
      id: uuidv4(),
      amount,
      account_id,
      to_account_id: type === 'transferencia' ? to_account_id : null,
      type,
      category: type === 'transferencia' ? 'Transferencia' : category,
      description: description || (type === 'transferencia' ? 'Transferencia interna' : category),
      date,
      icon: isCreditSource ? 'credit-card' : (type === 'ingreso' ? 'arrow-up-right-dots' : (type === 'transferencia' ? 'exchange-alt' : 'shopping-bag'))
    };

    // Actualizar saldos o cupos de crédito correspondientes
    if (isCreditSource) {
      const credit = (AppState.credits || []).find(c => c.id === cleanCreditId);
      if (credit) {
        if (type === 'gasto' || type === 'egreso') {
          credit.used_amount = (parseFloat(credit.used_amount) || 0) + amount;
        } else if (type === 'ingreso') {
          credit.used_amount = Math.max(0, (parseFloat(credit.used_amount) || 0) - amount);
        }
        localStorage.setItem('finanzas_credits', JSON.stringify(AppState.credits));
      }
    } else {
      const srcAcc = AppState.accounts.find(a => a.id === account_id);
      if (srcAcc) {
        if (type === 'gasto') srcAcc.balance = (parseFloat(srcAcc.balance) || 0) - amount;
        if (type === 'ingreso') srcAcc.balance = (parseFloat(srcAcc.balance) || 0) + amount;
        if (type === 'transferencia') {
          srcAcc.balance = (parseFloat(srcAcc.balance) || 0) - amount;
        }
      }
    }

    // Si es transferencia y el destino es crédito (Abono al crédito)
    if (type === 'transferencia') {
      if (isCreditDest) {
        const destCredit = (AppState.credits || []).find(c => c.id === cleanDestCreditId);
        if (destCredit) {
          destCredit.used_amount = Math.max(0, (parseFloat(destCredit.used_amount) || 0) - amount);
          localStorage.setItem('finanzas_credits', JSON.stringify(AppState.credits));
        }
      } else {
        const dstAcc = AppState.accounts.find(a => a.id === to_account_id);
        if (dstAcc) dstAcc.balance = (parseFloat(dstAcc.balance) || 0) + amount;
      }
    }

    // Guardar transacción
    AppState.transactions.unshift(newTx);
    saveLocalState();

    // Sincronización en segundo plano con el backend
    if (AppState.token && navigator.onLine) {
      try {
        await fetch(`${API_BASE}/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AppState.token}`
          },
          body: JSON.stringify(newTx)
        });
      } catch (err) {
        console.warn('Sincronización en segundo plano:', err.message);
      }
    }

    // Disparar sonido, partículas financieras y toast
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (window.SoundFX) {
      if (type === 'ingreso') window.SoundFX.playCash();
      else if (type === 'transferencia') window.SoundFX.playSuccess();
      else window.SoundFX.playClick();
    }
    if (window.MotionSystem) {
      window.MotionSystem.spawnFinancialParticles(submitBtn);
      window.MotionSystem.showToast(
        type === 'ingreso' ? '¡Ingreso Añadido!' : (type === 'transferencia' ? '¡Transferencia Exitosa!' : '¡Gasto Registrado!'),
        `${newTx.description}: ${formatCurrency(amount)}`,
        type === 'ingreso' ? 'arrow-up' : (type === 'transferencia' ? 'exchange-alt' : 'shopping-cart')
      );
    }

    // Limpiar formulario y cerrar modal animadamente
    document.getElementById('form-add-movement').reset();
    if (window.closeModalAnimated) window.closeModalAnimated('modal-add-movement');
    else closeModal('modal-add-movement');

    // Refrescar vistas
    this.render();
    if (window.DashboardModule) window.DashboardModule.render();
    if (window.AccountsModule) window.AccountsModule.render();
  },

  deleteTransaction(id) {
    if (!confirm('¿Deseas eliminar este movimiento? Su impacto en el saldo se revertirá.')) return;

    const idx = AppState.transactions.findIndex(t => t.id === id);
    if (idx === -1) return;

    const tx = AppState.transactions[idx];
    const isCredit = tx.account_id && tx.account_id.startsWith('cred_');

    if (isCredit) {
      const cId = tx.account_id.replace('cred_', '');
      const cred = (AppState.credits || []).find(c => c.id === cId);
      if (cred) {
        if (tx.type === 'gasto' || tx.type === 'egreso') {
          cred.used_amount = Math.max(0, (parseFloat(cred.used_amount) || 0) - parseFloat(tx.amount));
        } else if (tx.type === 'ingreso') {
          cred.used_amount = (parseFloat(cred.used_amount) || 0) + parseFloat(tx.amount);
        }
        localStorage.setItem('finanzas_credits', JSON.stringify(AppState.credits));
      }
    } else {
      const srcAcc = AppState.accounts.find(a => a.id === tx.account_id);
      if (srcAcc) {
        if (tx.type === 'gasto' || tx.type === 'egreso') srcAcc.balance = (parseFloat(srcAcc.balance) || 0) + parseFloat(tx.amount);
        if (tx.type === 'ingreso') srcAcc.balance = (parseFloat(srcAcc.balance) || 0) - parseFloat(tx.amount);
        if (tx.type === 'transferencia') {
          srcAcc.balance = (parseFloat(srcAcc.balance) || 0) + parseFloat(tx.amount);
        }
      }
    }

    if (tx.type === 'transferencia' && tx.to_account_id) {
      if (tx.to_account_id.startsWith('cred_')) {
        const cId = tx.to_account_id.replace('cred_', '');
        const cred = (AppState.credits || []).find(c => c.id === cId);
        if (cred) {
          cred.used_amount = (parseFloat(cred.used_amount) || 0) + parseFloat(tx.amount);
          localStorage.setItem('finanzas_credits', JSON.stringify(AppState.credits));
        }
      } else {
        const dstAcc = AppState.accounts.find(a => a.id === tx.to_account_id);
        if (dstAcc) dstAcc.balance = (parseFloat(dstAcc.balance) || 0) - parseFloat(tx.amount);
      }
    }

    AppState.transactions.splice(idx, 1);
    saveLocalState();

    if (window.MotionSystem) {
      window.MotionSystem.showToast('Movimiento Eliminado', 'El saldo fue actualizado automáticamente.', 'trash-alt');
    }

    this.render();
    if (window.DashboardModule) window.DashboardModule.render();
    if (window.AccountsModule) window.AccountsModule.render();
    if (window.CreditsModule) window.CreditsModule.render();
  }
};

window.TransactionsModule = TransactionsModule;
