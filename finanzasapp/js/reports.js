/**
 * FINANZASAPP — MÓDULO DE REPORTES Y ANALÍTICA FINANCIERA (100% REAL EN $0)
 * Gastos por categoría, comparación real de ingresos vs egresos y tasa de ahorro
 */

const ReportsModule = {
  init() {
    this.render();
  },

  render() {
    this.renderSummaryCards();
    this.renderCategoryBreakdown();
    this.renderMonthlyBars();
  },

  renderSummaryCards() {
    let income = 0;
    let expense = 0;

    AppState.transactions.forEach(t => {
      if (t.is_deleted) return;
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'ingreso') income += amt;
      if (t.type === 'gasto' || t.type === 'egreso') expense += amt;
    });

    const net = income - expense;
    const savingRate = income > 0 ? Math.max(0, Math.round((net / income) * 100)) : 0;

    const repIncome = document.getElementById('report-total-income');
    const repExpense = document.getElementById('report-total-expense');
    const repNet = document.getElementById('report-net-savings');
    const repRate = document.getElementById('report-savings-rate');

    if (repIncome) repIncome.textContent = formatCurrency(income);
    if (repExpense) repExpense.textContent = formatCurrency(expense);
    if (repNet) repNet.textContent = (net >= 0 ? '+' : '') + formatCurrency(net);
    if (repRate) repRate.textContent = `${savingRate}%`;
  },

  renderCategoryBreakdown() {
    const container = document.getElementById('report-categories-container');
    if (!container) return;

    const catTotals = {};
    let totalExpense = 0;

    AppState.transactions.forEach(t => {
      if (t.is_deleted || (t.type !== 'gasto' && t.type !== 'egreso')) return;
      const amt = parseFloat(t.amount) || 0;
      const cat = t.category || 'Varios';
      catTotals[cat] = (catTotals[cat] || 0) + amt;
      totalExpense += amt;
    });

    if (totalExpense === 0) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-muted);">
          <i class="fas fa-chart-pie" style="font-size: 2.2rem; margin-bottom: 10px; opacity: 0.4; display: block;"></i>
          No hay gastos registrados todavía para analizar.
        </div>
      `;
      return;
    }

    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const palette = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];

    container.innerHTML = sortedCats.map(([cat, amt], i) => {
      const pct = Math.round((amt / totalExpense) * 100);
      const color = palette[i % palette.length];

      return `
        <div style="margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 5px;">
            <span style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: ${color};"></span>
              <strong>${cat}</strong>
            </span>
            <span>${formatCurrency(amt)} <span style="color: var(--text-muted); font-size: 0.78rem;">(${pct}%)</span></span>
          </div>
          <div style="width: 100%; height: 8px; background: var(--bg-input); border-radius: 9999px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: ${color}; border-radius: 9999px;"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderMonthlyBars() {
    const container = document.getElementById('report-monthly-bars-container');
    if (!container) return;

    // Agrupar movimientos reales por mes
    const monthMap = {};
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    AppState.transactions.forEach(t => {
      if (t.is_deleted || !t.date) return;
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;

      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = `${monthNames[d.getMonth()]}`;

      if (!monthMap[key]) {
        monthMap[key] = { name: label, inc: 0, exp: 0 };
      }

      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'ingreso') monthMap[key].inc += amt;
      if (t.type === 'gasto' || t.type === 'egreso') monthMap[key].exp += amt;
    });

    const months = Object.values(monthMap);

    if (months.length === 0) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-muted);">
          <i class="fas fa-chart-bar" style="font-size: 2.2rem; margin-bottom: 10px; opacity: 0.4; display: block;"></i>
          Sin datos de evolución mensual aún. Registra movimientos para ver tu gráfica.
        </div>
      `;
      return;
    }

    const maxVal = Math.max(1, ...months.map(m => Math.max(m.inc, m.exp)));

    container.innerHTML = `
      <div style="display: flex; justify-content: space-around; align-items: flex-end; height: 160px; padding-top: 20px;">
        ${months.slice(-6).map(m => {
          const incHeight = Math.max(4, Math.round((m.inc / maxVal) * 120));
          const expHeight = Math.max(4, Math.round((m.exp / maxVal) * 120));

          return `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
              <div style="display: flex; gap: 6px; align-items: flex-end; height: 120px;">
                <div style="width: 16px; height: ${m.inc > 0 ? incHeight : 4}px; background: #10B981; border-radius: 4px;" title="Ingreso: ${formatCurrency(m.inc)}"></div>
                <div style="width: 16px; height: ${m.exp > 0 ? expHeight : 4}px; background: #EF4444; border-radius: 4px;" title="Gasto: ${formatCurrency(m.exp)}"></div>
              </div>
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${m.name}</span>
            </div>
          `;
        }).join('')}
      </div>
      <div style="display: flex; justify-content: center; gap: 20px; margin-top: 14px; font-size: 0.78rem;">
        <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; background: #10B981; border-radius: 3px;"></span> Ingresos</span>
        <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; background: #EF4444; border-radius: 3px;"></span> Gastos</span>
      </div>
    `;
  }
};

window.ReportsModule = ReportsModule;
