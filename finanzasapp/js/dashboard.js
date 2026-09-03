/**
 * FINANZASAPP — MÓDULO DASHBOARD / OVERVIEW
 * Balance total interactivo, gráfica vectorial SVG por período y tarjetas pastel de cuentas
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
  },

  renderBalanceCard() {
    // Calcular saldo total a partir de las cuentas
    const total = AppState.accounts
      .filter(a => !a.is_deleted)
      .reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

    const amountEl = document.getElementById('portfolio-total-balance');
    if (amountEl) {
      amountEl.textContent = formatCurrency(total > 0 ? total : 18450000);
    }

    this.renderSvgChart();
  },

  bindPeriodButtons() {
    const pills = document.querySelectorAll('.period-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activePeriod = pill.getAttribute('data-period') || '1M';
        this.renderSvgChart();
      });
    });
  },

  renderSvgChart() {
    const container = document.getElementById('portfolio-chart-container');
    if (!container) return;

    const points = this.chartDataByPeriod[this.activePeriod] || this.chartDataByPeriod['1M'];
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = (max - min) || 1;

    const width = 420;
    const height = 90;
    const padding = 10;

    const coords = points.map((val, idx) => {
      const x = padding + (idx / (points.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return { x, y };
    });

    // Generar línea SVG suave
    const pathD = coords.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, '');

    // Generar área sombreada bajo la curva
    const areaD = `${pathD} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`;

    container.innerHTML = `
      <svg class="portfolio-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2563EB" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#2563EB" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <path d="${areaD}" fill="url(#chartGradient)" />
        <path d="${pathD}" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="${coords[coords.length - 1].x}" cy="${coords[coords.length - 1].y}" r="4.5" fill="#2563EB" stroke="#FFFFFF" stroke-width="2" />
      </svg>
    `;
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

      return `
        <div class="account-pastel-card ${styleClass}" onclick="switchView('accounts')">
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

    list.innerHTML = sorted.map(t => {
      const isIngreso = t.type === 'ingreso';
      const isTransfer = t.type === 'transferencia';
      const sign = isIngreso ? '+' : (isTransfer ? '⇄ ' : '-');
      const badgeClass = isIngreso ? 'ingreso' : (isTransfer ? 'transferencia' : 'gasto');
      const badgeText = isIngreso ? 'Ingreso' : (isTransfer ? 'Transferencia' : 'Gasto');
      const icon = t.icon || (isIngreso ? 'arrow-up-right-dots' : (isTransfer ? 'exchange-alt' : 'shopping-bag'));

      return `
        <li class="movement-item">
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
  }
};

window.DashboardModule = DashboardModule;
