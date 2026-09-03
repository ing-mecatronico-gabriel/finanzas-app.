const crypto = require('crypto');
const db = require('../db');

function generateUuid() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

exports.getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const rules = await db.find('recurring_rules', { user_id: userId, is_deleted: false });
    res.json({ success: true, rules });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al obtener reglas recurrentes' });
  }
};

exports.create = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      account_id,
      type,
      amount,
      category,
      description,
      frequency = 'mensual',
      execution_day = 1,
      device_id = 'unknown'
    } = req.body;

    if (!account_id || !type || !amount || !description) {
      return res.status(400).json({ success: false, error: 'Cuenta, tipo, monto y descripción son requeridos' });
    }

    const rule = await db.insert('recurring_rules', {
      id: req.body.id || generateUuid(),
      user_id: userId,
      account_id,
      type,
      amount: parseFloat(amount),
      category: category || 'General',
      description,
      frequency,
      execution_day: parseInt(execution_day) || 1,
      is_active: true,
      is_deleted: false,
      device_id
    });

    res.status(201).json({ success: true, rule });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear regla recurrente' });
  }
};

exports.delete = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const rule = await db.findOne('recurring_rules', { id, user_id: userId });
    if (!rule) return res.status(404).json({ success: false, error: 'Regla no encontrada' });

    await db.softDelete('recurring_rules', id);
    res.json({ success: true, message: 'Regla recurrente eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al eliminar regla recurrente' });
  }
};
