/**
 * FINANZASAPP — MÓDULO DASHBOARD / OVERVIEW
 * Balance total real (inicia en $0), gráfica SVG animada y cuentas reales sin datos ficticios
 */

const DashboardModule = {
  activePeriod: '1M',

  init() {
    this.bindPeriodButtons();
    this.render();
  },

  render() {
    this.renderBalanceCard();
    this.renderPastelAccounts();
    this.renderRecentTransactions();
    this.renderBudgetWidget();
    this.renderCreditsWidget();
  },

  renderBalanceCard() {
    // Calcular saldo total a partir de las cuentas reales del usuario
    const total = AppState.accounts
      .filter(a => !a.is_deleted)
      .reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

    // Animar interpolación numérica desde 0 hasta el saldo real
    if (window.MotionSystem && window.MotionSystem.animateBalance) {
      window.MotionSystem.animateBalance(total);
    } else {
      const amountEl = document.getElementById('portfolio-total-balance');
      if (amountEl) amountEl.textContent = formatCurrency(total);
    }

    this.renderSvgChart();
  },

  bindPeriodButtons() {
    const pills = document.querySelectorAll('.period-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activePeriod = pill.getAttribute('data-period') || '1M';
        this.renderSvgChart();
      });
    });
  },

  renderSvgChart() {
    // Generar puntos basados en los movimientos reales
    let points = [0, 0, 0, 0, 0, 0];

    const activeTx = AppState.transactions.filter(t => !t.is_deleted);
    if (activeTx.length > 0) {
      let runningTotal = 0;
      const history = [...activeTx].reverse().map(t => {
        if (t.type === 'ingreso') runningTotal += parseFloat(t.amount);
        if (t.type === 'gasto' || t.type === 'egreso') runningTotal -= parseFloat(t.amount);
        return runningTotal;
      });
      if (history.length < 6) {
        while (history.length < 6) history.unshift(0);
      }
      points = history.slice(-6);
    }

    if (window.MotionSystem && window.MotionSystem.renderAnimatedSvgChart) {
      window.MotionSystem.renderAnimatedSvgChart('portfolio-chart-container', points, this.activePeriod);
    }
  },

  renderPastelAccounts() {
    const grid = document.getElementById('accounts-pastel-grid');
    if (!grid) return;

    const activeAccounts = AppState.accounts.filter(a => !a.is_deleted);
    const defaultStyles = ['principal', 'ahorros', 'efectivo'];
    const defaultIcons = ['wallet', 'landmark', 'mobile-screen'];

    if (activeAccounts.length === 0) {
      grid.innerHTML = `<div style="color: var(--text-muted); padding: 12px;">No tienes cuentas activas.</div>`;
      return;
    }

    grid.innerHTML = activeAccounts.map((acc, idx) => {
      const styleClass = acc.styleClass || defaultStyles[idx % defaultStyles.length];
      const icon = acc.icon || defaultIcons[idx % defaultIcons.length];
      const change = acc.change || '0%';
      const staggerClass = `stagger-${Math.min(idx + 1, 6)}`;

      return `
        <div class="account-pastel-card ${styleClass} tilt-card shine-effect ${staggerClass}" onclick="DashboardModule.filterByAccount('${acc.id}')" title="Ver movimientos de esta cuenta">
          <div class="acc-card-top-info">
            <h4>${acc.name}</h4>
            <div class="acc-balance">${formatCurrency(acc.balance || 0)}</div>
          </div>
          <div class="acc-card-bottom-pill">
            <div class="acc-icon-square">
              <i class="fas fa-${icon}"></i>
            </div>
            <span class="acc-change-tag">${change}</span>
          </div>
        </div>
      `;
    }).join('');

    if (window.MotionSystem && window.MotionSystem.setup3DTilt) {
      window.MotionSystem.setup3DTilt();
    }
  },

  filterByAccount(accountId) {
    if (window.TransactionsModule) {
      switchView('transactions');
      const input = document.getElementById('tx-search-input');
      const acc = AppState.accounts.find(a => a.id === accountId);
      if (input && acc) {
        input.value = acc.name;
        window.TransactionsModule.searchQuery = acc.name.toLowerCase();
        window.TransactionsModule.render();
      }
    }
  },

  renderRecentTransactions() {
    const list = document.getElementById('overview-movements-list');
    if (!list) return;

    const sorted = [...AppState.transactions]
      .filter(t => !t.is_deleted)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 4);

    if (sorted.length === 0) {
      list.innerHTML = `
        <li style="color: var(--text-muted); padding: 24px; text-align: center;">
          <i class="fas fa-inbox" style="font-size: 1.8rem; margin-bottom: 8px; opacity: 0.5; display: block;"></i>
          No hay movimientos registrados. ¡Toca (+) para registrar tu primer gasto o ingreso!
        </li>
      `;
      return;
    }

    list.innerHTML = sorted.map((t, idx) => {
      const isIngreso = t.type === 'ingreso';
      const isTransfer = t.type === 'transferencia';
      const sign = isIngreso ? '+' : (isTransfer ? '⇄ ' : '-');
      const badgeClass = isIngreso ? 'ingreso' : (isTransfer ? 'transferencia' : 'gasto');
      const badgeText = isIngreso ? 'Ingreso' : (isTransfer ? 'Transferencia' : 'Gasto');
      const icon = t.icon || (isIngreso ? 'arrow-up-right-dots' : (isTransfer ? 'exchange-alt' : 'shopping-bag'));
      const staggerClass = `stagger-${Math.min(idx + 1, 6)}`;

      return `
        <li class="movement-item ${staggerClass}">
          <div class="movement-left">
            <div class="movement-icon-box ${badgeClass}">
              <i class="fas fa-${icon}"></i>
            </div>
            <div class="movement-meta">
              <h5>${t.description || t.category}</h5>
              <p>${t.category} · ${t.date || 'Hoy'}</p>
            </div>
          </div>
          <div class="movement-right">
            <span class="movement-amount ${badgeClass}">${sign}${formatCurrency(t.amount)}</span>
            <span class="movement-type-badge ${badgeClass}">${badgeText}</span>
          </div>
        </li>
      `;
    }).join('');
  },

  renderBudgetWidget() {
    const container = document.getElementById('overview-budget-widget');
    if (!container) return;

    let totalExpense = 0;
    let totalIncome = 0;
    AppState.transactions.forEach(t => {
      if (t.is_deleted) return;
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'ingreso') totalIncome += amt;
      if (t.type === 'gasto' || t.type === 'egreso') totalExpense += amt;
    });

    const netSavings = totalIncome - totalExpense;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">Control y Presupuestos</h4>
            <span style="font-size: 0.75rem; color: var(--brand-blue); font-weight: 700; cursor: pointer;" onclick="switchView('budget')">Ver más &rarr;</span>
          </div>
          
          <div style="margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 6px;">
              <span>Gastos Totales</span>
              <strong>${formatCurrency(totalExpense)}</strong>
            </div>
            <div style="width: 100%; height: 8px; background: var(--bg-input); border-radius: 9999px; overflow: hidden;">
              <div class="progress-animated-bar" style="width: ${totalIncome > 0 ? Math.min(100, Math.round((totalExpense/totalIncome)*100)) : (totalExpense > 0 ? 100 : 0)}%; height: 100%; background: #EF4444; border-radius: 9999px;"></div>
            </div>
          </div>

          <div style="margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 6px;">
              <span>Ingresos Totales</span>
              <strong>${formatCurrency(totalIncome)}</strong>
            </div>
            <div style="width: 100%; height: 8px; background: var(--bg-input); border-radius: 9999px; overflow: hidden;">
              <div class="progress-animated-bar" style="width: ${totalIncome > 0 ? 100 : 0}%; height: 100%; background: #10B981; border-radius: 9999px;"></div>
            </div>
          </div>
        </div>

        <div style="padding-top: 14px; border-top: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.78rem; color: var(--text-secondary);">Balance Neto del Periodo</span>
          <span style="font-size: 0.95rem; font-weight: 800; color: ${netSavings >= 0 ? '#10B981' : '#EF4444'};">
            ${netSavings >= 0 ? '+' : ''}${formatCurrency(netSavings)}
          </span>
        </div>
      </div>
    `;
  },

  renderCreditsWidget() {
    const container = document.getElementById('overview-credits-widget');
    if (!container) return;

    const activeCredits = (AppState.credits || []).filter(c => !c.is_deleted);

    let totalLimit = 0;
    let totalUsed = 0;
    activeCredits.forEach(c => {
      totalLimit += parseFloat(c.credit_limit) || 0;
      totalUsed += parseFloat(c.used_amount) || 0;
    });
    const totalAvailable = Math.max(0, totalLimit - totalUsed);

    if (activeCredits.length === 0) {
      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);"><i class="fas fa-credit-card" style="color: #8B5CF6; margin-right: 8px;"></i>Créditos y Tarjetas</h4>
          <span style="font-size: 0.78rem; color: var(--brand-blue); font-weight: 700; cursor: pointer;" onclick="switchView('credits')">Ir a Crédito &rarr;</span>
        </div>
        <div style="padding: 20px; text-align: center; color: var(--text-muted); background: var(--bg-card-subtle); border-radius: 12px; border: 1px dashed var(--border-color);">
          <p style="font-size: 0.85rem; margin-bottom: 10px;">No tienes tarjetas de crédito o líneas registradas.</p>
          <button class="btn-secondary btn-interactive" onclick="openModal('modal-add-credit')" style="font-size: 0.8rem; padding: 6px 14px; border-radius: 9999px;">
            <i class="fas fa-plus"></i> Agregar Tarjeta / Crédito
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-credit-card" style="color: #8B5CF6; font-size: 1.1rem;"></i>
          <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">Crédito y Tarjetas</h4>
        </div>
        <span style="font-size: 0.78rem; color: var(--brand-blue); font-weight: 700; cursor: pointer;" onclick="switchView('credits')">Ver detalle &rarr;</span>
      </div>

      <!-- Resumen Compacto Deuda vs Disponible -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
        <div style="background: var(--bg-card-subtle); padding: 10px 12px; border-radius: 10px; border-left: 3px solid #EF4444;">
          <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">DEUDA UTILIZADA</span>
          <div style="font-size: 1.05rem; font-weight: 800; color: #EF4444; margin-top: 2px;">${formatCurrency(totalUsed)}</div>
        </div>
        <div style="background: var(--bg-card-subtle); padding: 10px 12px; border-radius: 10px; border-left: 3px solid #10B981;">
          <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">CUPO DISPONIBLE</span>
          <div style="font-size: 1.05rem; font-weight: 800; color: #10B981; margin-top: 2px;">${formatCurrency(totalAvailable)}</div>
        </div>
      </div>

      <!-- Mini-tarjetas activas -->
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${activeCredits.slice(0, 2).map(c => {
          const limit = parseFloat(c.credit_limit) || 1;
          const used = parseFloat(c.used_amount) || 0;
          const pct = Math.min(100, Math.round((used / limit) * 100));
          return `
            <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-light); border-radius: 10px; padding: 10px 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; margin-bottom: 4px;">
                <span>${c.name}</span>
                <span style="color: ${pct > 80 ? '#EF4444' : '#10B981'};">${pct}% usado</span>
              </div>
              <div style="width: 100%; height: 6px; background: var(--bg-input); border-radius: 9999px; overflow: hidden; margin-bottom: 6px;">
                <div style="width: ${pct}%; height: 100%; background: ${c.color || '#8B5CF6'}; border-radius: 9999px;"></div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted);">
                <span>Corte: Día ${c.cutoff_day || 15}</span>
                <span>Pagar antes: Día ${c.payment_day || 30}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="margin-top: 14px; display: flex; gap: 8px;">
        <button class="btn-primary-action btn-interactive" onclick="openModal('modal-pay-credit')" style="flex: 1; padding: 6px 10px; font-size: 0.78rem; justify-content: center; background: #10B981;">
          <i class="fas fa-hand-holding-usd"></i> Abonar
        </button>
        <button class="btn-secondary btn-interactive" onclick="openModal('modal-spend-credit')" style="flex: 1; padding: 6px 10px; font-size: 0.78rem; justify-content: center;">
          <i class="fas fa-shopping-bag"></i> Consumo
        </button>
      </div>
    `;
  }
};

window.DashboardModule = DashboardModule;
