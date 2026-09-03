const crypto = require('crypto');
const db = require('../db');

function generateUuid() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

exports.getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const cards = await db.find('credit_cards', { user_id: userId, is_deleted: false });

    let totalLimit = 0;
    let totalUsed = 0;

    const formattedCards = cards.map(c => {
      const limit = parseFloat(c.credit_limit) || 0;
      const used = parseFloat(c.used_amount) || 0;
      const available = Math.max(0, limit - used);
      totalLimit += limit;
      totalUsed += used;

      return {
        ...c,
        credit_limit: limit,
        used_amount: used,
        available_amount: available
      };
    });

    res.json({
      success: true,
      cards: formattedCards,
      summary: {
        totalLimit,
        totalUsed,
        totalAvailable: Math.max(0, totalLimit - totalUsed)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al obtener tarjetas', details: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      bank,
      name,
      credit_limit,
      used_amount = 0,
      cutoff_day,
      payment_day,
      interest_rate = 0,
      color = '#7c3aed',
      device_id = 'unknown'
    } = req.body;

    if (!bank || !name || credit_limit === undefined || !cutoff_day || !payment_day) {
      return res.status(400).json({ success: false, error: 'Banco, nombre, límite, día de corte y día de pago son requeridos' });
    }

    const card = await db.insert('credit_cards', {
      id: req.body.id || generateUuid(),
      user_id: userId,
      bank,
      name,
      credit_limit: parseFloat(credit_limit),
      used_amount: parseFloat(used_amount) || 0,
      cutoff_day: parseInt(cutoff_day),
      payment_day: parseInt(payment_day),
      interest_rate: parseFloat(interest_rate) || 0,
      color,
      is_active: true,
      is_deleted: false,
      device_id
    });

    res.status(201).json({ success: true, card });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al registrar tarjeta', details: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const card = await db.findOne('credit_cards', { id, user_id: userId });
    if (!card) return res.status(404).json({ success: false, error: 'Tarjeta no encontrada' });

    const updates = { ...req.body };
    delete updates.id;
    delete updates.user_id;
    if (updates.credit_limit !== undefined) updates.credit_limit = parseFloat(updates.credit_limit);
    if (updates.used_amount !== undefined) updates.used_amount = parseFloat(updates.used_amount);

    const updated = await db.update('credit_cards', id, updates);
    res.json({ success: true, card: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al actualizar tarjeta' });
  }
};

exports.delete = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const card = await db.findOne('credit_cards', { id, user_id: userId });
    if (!card) return res.status(404).json({ success: false, error: 'Tarjeta no encontrada' });

    await db.softDelete('credit_cards', id);
    res.json({ success: true, message: 'Tarjeta eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al eliminar tarjeta' });
  }
};
