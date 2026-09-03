/**
 * FINANZASAPP — MÓDULO DE MOVIMIENTOS Y TRANSACCIONES
 * Filtros en tiempo real, buscador y modal "+ Añadir Movimiento"
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

    const options = AppState.accounts
      .filter(a => !a.is_deleted)
      .map(a => `<option value="${a.id}">${a.name} (${formatCurrency(a.balance)})</option>`)
      .join('');

    if (srcSel) srcSel.innerHTML = options;
    if (dstSel) dstSel.innerHTML = options;
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

    container.innerHTML = list.map(t => {
      const isIngreso = t.type === 'ingreso';
      const isTransfer = t.type === 'transferencia';
      const sign = isIngreso ? '+' : (isTransfer ? '⇄ ' : '-');
      const badgeClass = isIngreso ? 'ingreso' : (isTransfer ? 'transferencia' : 'gasto');
      const badgeText = isIngreso ? 'Ingreso' : (isTransfer ? 'Transferencia' : 'Gasto');
      const icon = t.icon || (isIngreso ? 'arrow-up-right-dots' : (isTransfer ? 'exchange-alt' : 'shopping-bag'));
      const acc = AppState.accounts.find(a => a.id === t.account_id);
      const accName = acc ? acc.name : 'Cuenta';

      return `
        <div class="movement-item" style="border-bottom: 1px solid var(--border-light); padding: 14px 10px;">
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
            <button onclick="TransactionsModule.deleteTransaction('${t.id}')" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px;" title="Eliminar">
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
      alert('Ingresa un monto válido y selecciona una cuenta.');
      return;
    }

    const type = this.modalTxType;
    if (type === 'transferencia' && account_id === to_account_id) {
      alert('La cuenta de origen y destino no pueden ser la misma.');
      return;
    }

    const newTx = {
      id: uuidv4(),
      amount,
      account_id,
      to_account_id: type === 'transferencia' ? to_account_id : null,
      type,
      category: type === 'transferencia' ? 'Transferencia' : category,
      description: description || (type === 'transferencia' ? 'Transferencia interna' : category),
      date,
      icon: type === 'ingreso' ? 'arrow-up-right-dots' : (type === 'transferencia' ? 'exchange-alt' : 'shopping-bag')
    };

    // Actualizar saldos en las cuentas correspondientes
    const srcAcc = AppState.accounts.find(a => a.id === account_id);
    if (srcAcc) {
      if (type === 'gasto') srcAcc.balance = (parseFloat(srcAcc.balance) || 0) - amount;
      if (type === 'ingreso') srcAcc.balance = (parseFloat(srcAcc.balance) || 0) + amount;
      if (type === 'transferencia') {
        srcAcc.balance = (parseFloat(srcAcc.balance) || 0) - amount;
        const dstAcc = AppState.accounts.find(a => a.id === to_account_id);
        if (dstAcc) dstAcc.balance = (parseFloat(dstAcc.balance) || 0) + amount;
      }
    }

    // Guardar transacción
    AppState.transactions.unshift(newTx);
    saveLocalState();

    // Intentar sincronizar con Backend si hay conexión
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

    // Limpiar formulario y cerrar modal
    document.getElementById('form-add-movement').reset();
    closeModal('modal-add-movement');

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
    const srcAcc = AppState.accounts.find(a => a.id === tx.account_id);
    if (srcAcc) {
      if (tx.type === 'gasto' || tx.type === 'egreso') srcAcc.balance = (parseFloat(srcAcc.balance) || 0) + parseFloat(tx.amount);
      if (tx.type === 'ingreso') srcAcc.balance = (parseFloat(srcAcc.balance) || 0) - parseFloat(tx.amount);
      if (tx.type === 'transferencia') {
        srcAcc.balance = (parseFloat(srcAcc.balance) || 0) + parseFloat(tx.amount);
        const dstAcc = AppState.accounts.find(a => a.id === tx.to_account_id);
        if (dstAcc) dstAcc.balance = (parseFloat(dstAcc.balance) || 0) - parseFloat(tx.amount);
      }
    }

    AppState.transactions.splice(idx, 1);
    saveLocalState();

    this.render();
    if (window.DashboardModule) window.DashboardModule.render();
    if (window.AccountsModule) window.AccountsModule.render();
  }
};

window.TransactionsModule = TransactionsModule;
