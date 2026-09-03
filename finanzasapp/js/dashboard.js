/**
 * FINANZASAPP — MÓDULO DASHBOARD / OVERVIEW
 * Balance total con animación numérica progresiva, gráfica interactiva SVG y tarjetas pastel
 */

const DashboardModule = {
  activePeriod: '1M',

  chartDataByPeriod: {
    '1D': [18200000, 18250000, 18320000, 18300000, 18380000, 18450000],
    '1S': [17800000, 17950000, 18100000, 18050000, 18220000, 18350000, 18450000],
    '1M': [16400000, 16900000, 16750000, 17300000, 17150000, 17850000, 18200000, 18450000],
    '6M': [14200000, 15100000, 15800000, 16500000, 17400000, 18450000],
    '1A': [11500000, 12800000, 14200000, 15600000, 16800000, 18450000],
    'TODO': [8500000, 10200000, 12800000, 15300000, 17200000, 18450000]
  },

  init() {
    this.bindPeriodButtons();
    this.render();
  },

  render() {
    this.renderBalanceCard();
    this.renderPastelAccounts();
    this.renderRecentTransactions();
    this.renderBudgetWidget();
  },

  renderBalanceCard() {
    // Calcular saldo total a partir de las cuentas
    const total = AppState.accounts
      .filter(a => !a.is_deleted)
      .reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

    const finalAmount = total > 0 ? total : 18450000;

    // Animar interpolación numérica con easeOutCubic
    if (window.MotionSystem && window.MotionSystem.animateBalance) {
      window.MotionSystem.animateBalance(finalAmount);
    } else {
      const amountEl = document.getElementById('portfolio-total-balance');
      if (amountEl) amountEl.textContent = formatCurrency(finalAmount);
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
    const points = this.chartDataByPeriod[this.activePeriod] || this.chartDataByPeriod['1M'];
    if (window.MotionSystem && window.MotionSystem.renderAnimatedSvgChart) {
      window.MotionSystem.renderAnimatedSvgChart('portfolio-chart-container', points, this.activePeriod);
    }
  },

  renderPastelAccounts() {
    const grid = document.getElementById('accounts-pastel-grid');
    if (!grid) return;

    const activeAccounts = AppState.accounts.filter(a => !a.is_deleted);
    const defaultStyles = ['principal', 'ahorros', 'efectivo'];
    const defaultIcons = ['landmark', 'piggy-bank', 'wallet'];

    grid.innerHTML = activeAccounts.map((acc, idx) => {
      const styleClass = acc.styleClass || defaultStyles[idx % defaultStyles.length];
      const icon = acc.icon || defaultIcons[idx % defaultIcons.length];
      const change = acc.change || (idx === 0 ? '+8.2%' : (idx === 1 ? '+4.1%' : '+0.27%'));
      const staggerClass = `stagger-${Math.min(idx + 1, 6)}`;

      return `
        <div class="account-pastel-card ${styleClass} tilt-card shine-effect ${staggerClass}" onclick="DashboardModule.filterByAccount('${acc.id}')" title="Ver movimientos de esta cuenta">
          <div class="acc-card-top-info">
            <h4>${acc.name}</h4>
            <div class="acc-balance">${formatCurrency(acc.balance)}</div>
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

    // Re-activar listeners de tilt para las nuevas tarjetas renderizadas
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
      list.innerHTML = `<li style="color: var(--text-muted); padding: 12px; text-align: center;">No hay movimientos recientes.</li>`;
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

    const catTotals = {};
    let totalExpense = 0;
    AppState.transactions.forEach(t => {
      if (t.is_deleted || (t.type !== 'gasto' && t.type !== 'egreso')) return;
      const amt = parseFloat(t.amount) || 0;
      catTotals[t.category] = (catTotals[t.category] || 0) + amt;
      totalExpense += amt;
    });

    const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 2);

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">Control de Presupuestos</h4>
            <span style="font-size: 0.75rem; color: var(--brand-blue); font-weight: 700; cursor: pointer;" onclick="switchView('budget')">Ver más &rarr;</span>
          </div>
          
          <div style="margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 6px;">
              <span>Alimentación</span>
              <strong>$ 420.000 / $ 600.000 (70%)</strong>
            </div>
            <div style="width: 100%; height: 8px; background: var(--bg-input); border-radius: 9999px; overflow: hidden;">
              <div class="progress-animated-bar" style="width: 70%; height: 100%; background: #3B82F6; border-radius: 9999px;"></div>
            </div>
          </div>

          <div style="margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 6px;">
              <span>Transporte</span>
              <strong>$ 180.000 / $ 300.000 (60%)</strong>
            </div>
            <div style="width: 100%; height: 8px; background: var(--bg-input); border-radius: 9999px; overflow: hidden;">
              <div class="progress-animated-bar" style="width: 60%; height: 100%; background: #10B981; border-radius: 9999px;"></div>
            </div>
          </div>
        </div>

        <div style="padding-top: 14px; border-top: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.78rem; color: var(--text-secondary);">Ahorro disponible este mes</span>
          <span style="font-size: 0.95rem; font-weight: 800; color: #10B981;">+ $ 2.558.000</span>
        </div>
      </div>
    `;
  }
};

window.DashboardModule = DashboardModule;
