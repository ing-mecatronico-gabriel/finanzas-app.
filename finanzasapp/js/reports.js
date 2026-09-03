/**
 * FINANZASAPP — MÓDULO DE REPORTES Y ANALÍTICA FINANCIERA
 * Filtros de período (Diario, Semanal, Quincenal, Mensual, Anual) y exportación a Excel
 */

const ReportsModule = {
  activePeriod: 'todos',
  selectedMonth: 'todos',

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    // Filtros de período
    document.querySelectorAll('.report-filter-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.report-filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activePeriod = btn.getAttribute('data-period') || 'todos';
        if (window.SoundFX) window.SoundFX.playClick();
        this.render();
      });
    });

    // Selector de mes
    const monthSel = document.getElementById('report-month-filter');
    if (monthSel) {
      monthSel.addEventListener('change', (e) => {
        this.selectedMonth = e.target.value;
        if (window.SoundFX) window.SoundFX.playClick();
        this.render();
      });
    }

    // Botón Descargar Excel
    const btnExcel = document.getElementById('btn-download-report-excel');
    if (btnExcel) {
      btnExcel.addEventListener('click', () => this.downloadExcelReport());
    }
  },

  getFilteredTransactions() {
    let list = AppState.transactions.filter(t => !t.is_deleted);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Filtro por período
    if (this.activePeriod === 'diario') {
      list = list.filter(t => t.date && t.date.substring(0, 10) === todayStr);
    } else if (this.activePeriod === 'semanal') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      list = list.filter(t => t.date && new Date(t.date) >= oneWeekAgo);
    } else if (this.activePeriod === 'quincenal') {
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      list = list.filter(t => t.date && new Date(t.date) >= fifteenDaysAgo);
    } else if (this.activePeriod === 'mensual') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      list = list.filter(t => t.date && new Date(t.date) >= thirtyDaysAgo);
    } else if (this.activePeriod === 'anual') {
      const currentYear = now.getFullYear().toString();
      list = list.filter(t => t.date && t.date.startsWith(currentYear));
    }

    // Filtro adicional por mes específico (ej: "04" para Abril)
    if (this.selectedMonth !== 'todos') {
      list = list.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return !isNaN(d.getTime()) && (d.getMonth() + 1).toString().padStart(2, '0') === this.selectedMonth;
      });
    }

    return list;
  },

  render() {
    const filteredTx = this.getFilteredTransactions();
    this.renderSummaryCards(filteredTx);
    this.renderCategoryBreakdown(filteredTx);
    this.renderMonthlyBars();
  },

  renderSummaryCards(filteredTx) {
    let income = 0;
    let expense = 0;

    filteredTx.forEach(t => {
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

  renderCategoryBreakdown(filteredTx) {
    const container = document.getElementById('report-categories-container');
    if (!container) return;

    const catTotals = {};
    let totalExpense = 0;

    filteredTx.forEach(t => {
      if (t.type !== 'gasto' && t.type !== 'egreso') return;
      const amt = parseFloat(t.amount) || 0;
      const cat = t.category || 'Varios';
      catTotals[cat] = (catTotals[cat] || 0) + amt;
      totalExpense += amt;
    });

    if (totalExpense === 0) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-muted);">
          <i class="fas fa-chart-pie" style="font-size: 2.2rem; margin-bottom: 10px; opacity: 0.4; display: block;"></i>
          No hay gastos registrados en este período.
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
  },

  // Generar y descargar reporte financiero en Excel
  downloadExcelReport() {
    if (!window.XLSX) return alert('Librería Excel no cargada aún');

    const filteredTx = this.getFilteredTransactions();
    const wb = XLSX.utils.book_new();

    let totalInc = 0;
    let totalExp = 0;
    filteredTx.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'ingreso') totalInc += amt;
      if (t.type === 'gasto' || t.type === 'egreso') totalExp += amt;
    });
    const net = totalInc - totalExp;

    // Hoja 1: Resumen
    const summaryData = [
      { Concepto: 'Período Seleccionado', Valor: this.activePeriod.toUpperCase() },
      { Concepto: 'Mes Específico', Valor: this.selectedMonth === 'todos' ? 'TODOS' : `Mes ${this.selectedMonth}` },
      { Concepto: 'Ingresos Totales', Valor: totalInc },
      { Concepto: 'Gastos Totales', Valor: totalExp },
      { Concepto: 'Ahorro Neto', Valor: net },
      { Concepto: 'Tasa de Ahorro', Valor: totalInc > 0 ? `${Math.round((net / totalInc) * 100)}%` : '0%' },
      { Concepto: 'Cantidad de Movimientos', Valor: filteredTx.length }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen_General');

    // Hoja 2: Movimientos Detallados
    const movementsData = filteredTx.map(t => {
      const acc = AppState.accounts.find(a => a.id === t.account_id);
      return {
        Fecha: t.date || 'Hoy',
        Tipo: t.type.toUpperCase(),
        Categoria: t.category || 'General',
        Descripcion: t.description || 'Movimiento',
        Monto: parseFloat(t.amount) || 0,
        Cuenta: acc ? acc.name : 'Cuenta'
      };
    });
    const wsMovements = XLSX.utils.json_to_sheet(movementsData.length > 0 ? movementsData : [{ Aviso: 'Sin movimientos en el período' }]);
    XLSX.utils.book_append_sheet(wb, wsMovements, 'Movimientos_Detalle');

    // Hoja 3: Cuentas y Saldos Actuales
    const accountsData = AppState.accounts.filter(a => !a.is_deleted).map(a => ({
      Cuenta: a.name,
      Tipo: a.type,
      Saldo_Actual: parseFloat(a.balance) || 0
    }));
    const wsAccounts = XLSX.utils.json_to_sheet(accountsData);
    XLSX.utils.book_append_sheet(wb, wsAccounts, 'Estado_Cuentas');

    // Hoja 4: Créditos y Deudas
    const creditsData = (AppState.credits || []).filter(c => !c.is_deleted).map(c => ({
      Credito_Tarjeta: c.name,
      Cupo_Total: parseFloat(c.credit_limit) || 0,
      Deuda_Utilizada: parseFloat(c.used_amount) || 0,
      Disponible: Math.max(0, (c.credit_limit || 0) - (c.used_amount || 0)),
      Dia_Corte: c.cutoff_day,
      Dia_Pago: c.payment_day
    }));
    if (creditsData.length > 0) {
      const wsCredits = XLSX.utils.json_to_sheet(creditsData);
      XLSX.utils.book_append_sheet(wb, wsCredits, 'Tarjetas_Creditos');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Reporte_Financiero_${this.activePeriod}_${todayStr}.xlsx`);

    if (window.SoundFX) window.SoundFX.playSuccess();
    if (window.MotionSystem) {
      window.MotionSystem.showToast('Reporte Generado', `Se descargó Reporte_Financiero_${this.activePeriod}_${todayStr}.xlsx`);
    }
  }
};

window.ReportsModule = ReportsModule;
