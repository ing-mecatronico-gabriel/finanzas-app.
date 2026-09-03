const crypto = require('crypto');
const db = require('../db');

function generateUuid() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

exports.getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const budgets = await db.find('budgets', { user_id: userId, is_deleted: false });
    const transactions = await db.find('transactions', { user_id: userId, is_deleted: false, type: 'egreso' });

    const now = new Date();

    const budgetsWithMetrics = budgets.map(b => {
      const limit = parseFloat(b.limit_amount) || 0;
      
      // Filtrar gastos que caigan dentro del rango de fechas del presupuesto
      const expenses = transactions.filter(t => {
        if (t.date < b.start_date || t.date > b.end_date) return false;
        if (b.category && b.category.trim() !== '' && b.category.toLowerCase() !== 'todas') {
          return t.category && t.category.toLowerCase() === b.category.toLowerCase();
        }
        return true;
      });

      const spent = expenses.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      const remaining = Math.max(0, limit - spent);
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      // Calcular promedio diario transcurrido
      const start = new Date(b.start_date);
      const end = new Date(b.end_date);
      const daysTotal = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
      const elapsedDays = Math.min(daysTotal, Math.max(1, Math.round((now - start) / (1000 * 60 * 60 * 24)) + 1));
      const dailyAverage = spent / elapsedDays;
      const projected = dailyAverage * daysTotal;

      return {
        ...b,
        limit_amount: limit,
        spent_amount: spent,
        remaining_amount: remaining,
        percentage_used: percentage,
        daily_average: Math.round(dailyAverage),
        projected_total: Math.round(projected),
        status: percentage >= 100 ? 'excedido' : (percentage >= 80 ? 'alerta' : 'normal')
      };
    });

    res.json({
      success: true,
      budgets: budgetsWithMetrics
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al obtener presupuestos', details: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      period_type = 'mensual',
      category = null,
      limit_amount,
      start_date,
      end_date,
      device_id = 'unknown'
    } = req.body;

    if (!limit_amount || !start_date || !end_date) {
      return res.status(400).json({ success: false, error: 'Monto límite, fecha inicio y fecha fin son requeridos' });
    }

    const budget = await db.insert('budgets', {
      id: req.body.id || generateUuid(),
      user_id: userId,
      period_type,
      category: category && category !== 'todas' ? category : null,
      limit_amount: parseFloat(limit_amount),
      start_date,
      end_date,
      is_deleted: false,
      device_id
    });

    res.status(201).json({ success: true, budget });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear presupuesto', details: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const budget = await db.findOne('budgets', { id, user_id: userId });
    if (!budget) return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });

    await db.softDelete('budgets', id);
    res.json({ success: true, message: 'Presupuesto eliminado' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al eliminar presupuesto' });
  }
};
