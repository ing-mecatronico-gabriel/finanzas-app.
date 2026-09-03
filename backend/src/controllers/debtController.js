const crypto = require('crypto');
const db = require('../db');

function generateUuid() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

exports.getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const debts = await db.find('debts', { user_id: userId, is_deleted: false });
    const payments = await db.find('debt_payments', { user_id: userId, is_deleted: false });

    let totalInitial = 0;
    let totalPending = 0;

    const today = new Date().toISOString().split('T')[0];

    const formattedDebts = debts.map(d => {
      const initial = parseFloat(d.initial_amount) || 0;
      let pending = parseFloat(d.pending_amount) || 0;
      totalInitial += initial;
      totalPending += pending;

      // Actualizar estado dinámicamente si venció
      let status = d.status;
      if (pending <= 0) {
        status = 'pagada';
      } else if (d.due_date && d.due_date < today) {
        status = 'vencida';
      } else if (pending < initial) {
        status = 'en_proceso';
      }

      const debtPayments = payments.filter(p => p.debt_id === d.id);

      return {
        ...d,
        initial_amount: initial,
        pending_amount: pending,
        status,
        payments: debtPayments
      };
    });

    res.json({
      success: true,
      debts: formattedDebts,
      summary: {
        totalInitial,
        totalPending,
        totalPaid: Math.max(0, totalInitial - totalPending),
        count: formattedDebts.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al obtener deudas', details: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      entity_person,
      description = '',
      initial_amount,
      pending_amount,
      monthly_installment = 0,
      start_date = new Date().toISOString().split('T')[0],
      due_date = null,
      frequency = 'mensual',
      interest_rate = 0,
      device_id = 'unknown'
    } = req.body;

    if (!entity_person || initial_amount === undefined) {
      return res.status(400).json({ success: false, error: 'Entidad/persona y valor inicial son requeridos' });
    }

    const initAmt = parseFloat(initial_amount);
    const pendAmt = pending_amount !== undefined ? parseFloat(pending_amount) : initAmt;

    const debt = await db.insert('debts', {
      id: req.body.id || generateUuid(),
      user_id: userId,
      entity_person,
      description,
      initial_amount: initAmt,
      pending_amount: pendAmt,
      monthly_installment: parseFloat(monthly_installment) || 0,
      start_date,
      due_date,
      frequency,
      interest_rate: parseFloat(interest_rate) || 0,
      status: pendAmt <= 0 ? 'pagada' : 'pendiente',
      is_deleted: false,
      device_id
    });

    res.status(201).json({ success: true, debt });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear deuda', details: err.message });
  }
};

exports.addPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // debt_id
    const {
      amount,
      account_id,
      payment_date = new Date().toISOString().split('T')[0],
      notes = '',
      device_id = 'unknown'
    } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'El monto de abono debe ser mayor a 0' });
    }

    const debt = await db.findOne('debts', { id, user_id: userId });
    if (!debt) return res.status(404).json({ success: false, error: 'Deuda no encontrada' });

    const payAmount = parseFloat(amount);
    const currentPending = parseFloat(debt.pending_amount) || 0;
    const newPending = Math.max(0, currentPending - payAmount);
    const newStatus = newPending <= 0 ? 'pagada' : 'en_proceso';

    // Descontar saldo de la cuenta de pago si se proporcionó
    if (account_id) {
      const account = await db.findOne('accounts', { id: account_id, user_id: userId });
      if (account) {
        const newAccBal = (parseFloat(account.balance) || 0) - payAmount;
        await db.update('accounts', account.id, { balance: newAccBal });
      }
    }

    // Registrar abono
    const payment = await db.insert('debt_payments', {
      id: req.body.id || generateUuid(),
      user_id: userId,
      debt_id: id,
      account_id: account_id || null,
      amount: payAmount,
      payment_date,
      notes,
      device_id,
      is_deleted: false
    });

    // Actualizar deuda
    const updatedDebt = await db.update('debts', id, {
      pending_amount: newPending,
      status: newStatus
    });

    res.status(201).json({
      success: true,
      message: 'Abono registrado con éxito',
      payment,
      debt: updatedDebt
    });
  } catch (err) {
    console.error('Error registrando abono:', err);
    res.status(500).json({ success: false, error: 'Error al registrar abono', details: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const debt = await db.findOne('debts', { id, user_id: userId });
    if (!debt) return res.status(404).json({ success: false, error: 'Deuda no encontrada' });

    const updates = { ...req.body };
    delete updates.id;
    delete updates.user_id;
    if (updates.initial_amount !== undefined) updates.initial_amount = parseFloat(updates.initial_amount);
    if (updates.pending_amount !== undefined) updates.pending_amount = parseFloat(updates.pending_amount);

    const updated = await db.update('debts', id, updates);
    res.json({ success: true, debt: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al actualizar deuda' });
  }
};

exports.delete = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const debt = await db.findOne('debts', { id, user_id: userId });
    if (!debt) return res.status(404).json({ success: false, error: 'Deuda no encontrada' });

    await db.softDelete('debts', id);
    res.json({ success: true, message: 'Deuda eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al eliminar deuda' });
  }
};
