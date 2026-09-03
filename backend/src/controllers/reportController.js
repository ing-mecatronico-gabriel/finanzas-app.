const db = require('../db');

exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await db.find('transactions', { user_id: userId, is_deleted: false });
    const accounts = await db.find('accounts', { user_id: userId, is_deleted: false });
    const debts = await db.find('debts', { user_id: userId, is_deleted: false });
    const budgets = await db.find('budgets', { user_id: userId, is_deleted: false });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    const prevMonthDate = new Date(currentYear, currentMonth - 2, 1);
    const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Gastos e ingresos del mes actual vs mes anterior
    let currentMonthExpenses = 0;
    let currentMonthIncome = 0;
    let prevMonthExpenses = 0;
    let prevMonthIncome = 0;

    const categorySpend = {};
    const dailySpend = {};

    transactions.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      const tMonth = (t.date || '').substring(0, 7);

      if (t.type === 'egreso') {
        if (tMonth === currentMonthStr) {
          currentMonthExpenses += amt;
          const cat = t.category || 'Otros';
          categorySpend[cat] = (categorySpend[cat] || 0) + amt;

          const day = t.date;
          dailySpend[day] = (dailySpend[day] || 0) + amt;
        } else if (tMonth === prevMonthStr) {
          prevMonthExpenses += amt;
        }
      } else if (t.type === 'ingreso') {
        if (tMonth === currentMonthStr) {
          currentMonthIncome += amt;
        } else if (tMonth === prevMonthStr) {
          prevMonthIncome += amt;
        }
      }
    });

    // 1. Variación respecto al mes anterior
    let expenseVariationText = '';
    if (prevMonthExpenses > 0) {
      const diffPercent = Math.round(((currentMonthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100);
      if (diffPercent > 0) {
        expenseVariationText = `Este mes has gastado un ${diffPercent}% más que el mes pasado.`;
      } else if (diffPercent < 0) {
        expenseVariationText = `Este mes has gastado un ${Math.abs(diffPercent)}% menos que el mes pasado. ¡Excelente ahorro!`;
      } else {
        expenseVariationText = `Tu nivel de gasto se mantiene igual que el mes pasado.`;
      }
    } else {
      expenseVariationText = `No hay registros del mes anterior para comparar.`;
    }

    // 2. Categoría con mayor peso
    let topCategory = 'Ninguna';
    let topCategoryAmt = 0;
    let topCategoryPercent = 0;
    for (const [cat, amt] of Object.entries(categorySpend)) {
      if (amt > topCategoryAmt) {
        topCategory = cat;
        topCategoryAmt = amt;
      }
    }
    if (currentMonthExpenses > 0 && topCategoryAmt > 0) {
      topCategoryPercent = Math.round((topCategoryAmt / currentMonthExpenses) * 100);
    }
    const topCategoryText = topCategoryAmt > 0
      ? `${topCategory} representa el ${topCategoryPercent}% de tus gastos de este mes.`
      : 'No hay gastos registrados en el mes actual.';

    // 3. Gasto promedio diario
    const dayOfMonth = Math.max(1, now.getDate());
    const dailyAverage = Math.round(currentMonthExpenses / dayOfMonth);
    const dailyAverageText = `Tu gasto promedio diario en este mes es de $${dailyAverage.toLocaleString('es-CO')}.`;

    // 4. Presupuesto utilizado
    let totalBudget = 0;
    budgets.forEach(b => {
      if (b.period_type === 'mensual') totalBudget += parseFloat(b.limit_amount) || 0;
    });
    let budgetUsageText = '';
    let budgetPercent = 0;
    if (totalBudget > 0) {
      budgetPercent = Math.round((currentMonthExpenses / totalBudget) * 100);
      budgetUsageText = `Has utilizado el ${budgetPercent}% de tu presupuesto mensual total.`;
    } else {
      budgetUsageText = `Aún no has configurado un presupuesto mensual para este período.`;
    }

    // 5. Total deuda pendiente
    const totalPendingDebt = debts.reduce((sum, d) => sum + (parseFloat(d.pending_amount) || 0), 0);
    const debtText = totalPendingDebt > 0
      ? `Tu deuda pendiente acumulada es de $${totalPendingDebt.toLocaleString('es-CO')}.`
      : `No tienes deudas pendientes actualmente.`;

    // 6. Dinero disponible total
    const totalAvailable = accounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);
    const netWorth = totalAvailable - totalPendingDebt;

    // Resumen de distribución para Chart.js
    const categoryLabels = Object.keys(categorySpend);
    const categoryValues = Object.values(categorySpend);

    // Evolución de los últimos 6 meses
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = d.toLocaleString('es-ES', { month: 'short' });

      let inc = 0;
      let exp = 0;

      transactions.forEach(t => {
        if ((t.date || '').substring(0, 7) === mStr) {
          const amt = parseFloat(t.amount) || 0;
          if (t.type === 'ingreso') inc += amt;
          if (t.type === 'egreso') exp += amt;
        }
      });

      last6Months.push({
        month: mLabel,
        key: mStr,
        income: inc,
        expense: exp
      });
    }

    res.json({
      success: true,
      insights: [
        expenseVariationText,
        topCategoryText,
        dailyAverageText,
        budgetUsageText,
        debtText
      ],
      metrics: {
        currentMonthExpenses,
        currentMonthIncome,
        netMonthBalance: currentMonthIncome - currentMonthExpenses,
        dailyAverage,
        totalAvailable,
        totalPendingDebt,
        netWorth
      },
      charts: {
        byCategory: {
          labels: categoryLabels,
          values: categoryValues
        },
        monthlyHistory: last6Months
      }
    });
  } catch (err) {
    console.error('Error calculando analíticas:', err);
    res.status(500).json({ success: false, error: 'Error calculando analíticas financieras' });
  }
};

exports.exportCsv = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await db.find('transactions', { user_id: userId, is_deleted: false });

    // Ordenar descendente
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Generar encabezados CSV
    let csv = 'ID,Fecha,Hora,Tipo,Monto,Categoria,Subcategoria,Descripcion,MetodoPago,Naturaleza,Necesidad,Notas\n';

    transactions.forEach(t => {
      const escape = (val) => `"${(val || '').toString().replace(/"/g, '""')}"`;
      const row = [
        escape(t.id),
        escape(t.date),
        escape(t.time),
        escape(t.type),
        t.amount,
        escape(t.category),
        escape(t.subcategory),
        escape(t.description),
        escape(t.payment_method),
        escape(t.expense_nature),
        escape(t.necessity),
        escape(t.notes)
      ].join(',');
      csv += row + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="movimientos_finanzas_app.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al exportar CSV' });
  }
};
