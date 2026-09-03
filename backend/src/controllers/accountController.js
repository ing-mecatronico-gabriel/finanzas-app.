const crypto = require('crypto');
const db = require('../db');

function generateUuid() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

exports.getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const accounts = await db.find('accounts', { user_id: userId, is_deleted: false });

    // Resumen de saldos
    let totalBalance = 0;
    let bankAndWalletBalance = 0;
    let cashBalance = 0;

    accounts.forEach(acc => {
      const bal = parseFloat(acc.balance) || 0;
      totalBalance += bal;
      if (acc.type && acc.type.toLowerCase() === 'efectivo') {
        cashBalance += bal;
      } else {
        bankAndWalletBalance += bal;
      }
    });

    res.json({
      success: true,
      accounts,
      summary: {
        totalBalance,
        bankAndWalletBalance,
        cashBalance
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al obtener cuentas', details: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, type, balance = 0, currency = 'COP', color = '#2563eb', icon = 'wallet', device_id } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, error: 'Nombre y tipo de cuenta requeridos' });
    }

    const newAccount = await db.insert('accounts', {
      id: req.body.id || generateUuid(),
      user_id: userId,
      name,
      type,
      balance: parseFloat(balance) || 0,
      currency,
      color,
      icon,
      is_active: true,
      is_deleted: false,
      device_id: device_id || 'unknown'
    });

    res.status(201).json({ success: true, account: newAccount });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear cuenta', details: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const account = await db.findOne('accounts', { id, user_id: userId });

    if (!account) {
      return res.status(404).json({ success: false, error: 'Cuenta no encontrada' });
    }

    const updates = { ...req.body };
    delete updates.id;
    delete updates.user_id;
    if (updates.balance !== undefined) updates.balance = parseFloat(updates.balance);

    const updated = await db.update('accounts', id, updates);
    res.json({ success: true, account: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al actualizar cuenta' });
  }
};

exports.delete = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const account = await db.findOne('accounts', { id, user_id: userId });

    if (!account) {
      return res.status(404).json({ success: false, error: 'Cuenta no encontrada' });
    }

    await db.softDelete('accounts', id);
    res.json({ success: true, message: 'Cuenta eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al eliminar cuenta' });
  }
};
