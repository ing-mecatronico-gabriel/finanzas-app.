const crypto = require('crypto');
const db = require('../db');

function generateUuid() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

exports.getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, type, category, accountId, search } = req.query;

    let list = await db.find('transactions', { user_id: userId, is_deleted: false });

    // Filtros
    if (startDate) {
      list = list.filter(t => t.date >= startDate);
    }
    if (endDate) {
      list = list.filter(t => t.date <= endDate);
    }
    if (type && type !== 'todos') {
      list = list.filter(t => t.type === type);
    }
    if (category && category !== 'todas') {
      list = list.filter(t => t.category.toLowerCase() === category.toLowerCase());
    }
    if (accountId && accountId !== 'todas') {
      list = list.filter(t => t.account_id === accountId || t.to_account_id === accountId);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    // Ordenar descendente por fecha y hora
    list.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00:00'}`);
      const dateB = new Date(`${b.date}T${b.time || '00:00:00'}`);
      return dateB - dateA;
    });

    // Calcular estadísticas globales de ingresos y egresos (excluyendo transferencias)
    let totalIncome = 0;
    let totalExpense = 0;

    list.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'ingreso') {
        totalIncome += amt;
      } else if (t.type === 'egreso') {
        totalExpense += amt;
      }
      // NOTA: 'transferencia' se ignora explícitamente en el cómputo de ingresos/egresos
    });

    const netBalance = totalIncome - totalExpense;

    res.json({
      success: true,
      transactions: list,
      stats: {
        totalIncome,
        totalExpense,
        netBalance,
        count: list.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al obtener transacciones', details: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      id = generateUuid(),
      account_id,
      to_account_id,
      type,
      amount,
      category = 'General',
      subcategory = '',
      description = '',
      payment_method = 'Efectivo',
      expense_nature = 'variable',
      necessity = 'necesario',
      is_recurring = false,
      frequency = 'ninguna',
      date = new Date().toISOString().split('T')[0],
      time = new Date().toTimeString().split(' ')[0],
      notes = '',
      device_id = 'unknown'
    } = req.body;

    if (!account_id || !type || amount === undefined) {
      return res.status(400).json({ success: false, error: 'Cuenta, tipo y monto son requeridos' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, error: 'El monto debe ser un número positivo' });
    }

    // Verificar cuenta origen
    const sourceAccount = await db.findOne('accounts', { id: account_id, user_id: userId });
    if (!sourceAccount) {
      return res.status(404).json({ success: false, error: 'Cuenta de origen no encontrada' });
    }

    let destAccount = null;
    if (type === 'transferencia') {
      if (!to_account_id || to_account_id === account_id) {
        return res.status(400).json({ success: false, error: 'Para una transferencia se requiere una cuenta destino diferente' });
      }
      destAccount = await db.findOne('accounts', { id: to_account_id, user_id: userId });
      if (!destAccount) {
        return res.status(404).json({ success: false, error: 'Cuenta de destino no encontrada' });
      }
    }

    // Actualizar saldos de cuentas correspondientes
    if (type === 'egreso') {
      const newBal = (parseFloat(sourceAccount.balance) || 0) - parsedAmount;
      await db.update('accounts', sourceAccount.id, { balance: newBal });
    } else if (type === 'ingreso') {
      const newBal = (parseFloat(sourceAccount.balance) || 0) + parsedAmount;
      await db.update('accounts', sourceAccount.id, { balance: newBal });
    } else if (type === 'transferencia') {
      // Deduce de origen y añade a destino (Transferencia neutra)
      const newSrcBal = (parseFloat(sourceAccount.balance) || 0) - parsedAmount;
      const newDstBal = (parseFloat(destAccount.balance) || 0) + parsedAmount;
      await db.update('accounts', sourceAccount.id, { balance: newSrcBal });
      await db.update('accounts', destAccount.id, { balance: newDstBal });
    }

    const transaction = await db.insert('transactions', {
      id,
      user_id: userId,
      account_id,
      to_account_id: type === 'transferencia' ? to_account_id : null,
      type,
      amount: parsedAmount,
      category,
      subcategory,
      description,
      payment_method,
      expense_nature,
      necessity,
      is_recurring: !!is_recurring,
      frequency,
      date,
      time,
      notes,
      device_id,
      sync_status: 'synced',
      is_deleted: false
    });

    res.status(201).json({ success: true, transaction });
  } catch (err) {
    console.error('Error creando transacción:', err);
    res.status(500).json({ success: false, error: 'Error al registrar transacción', details: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const t = await db.findOne('transactions', { id, user_id: userId });
    if (!t) {
      return res.status(404).json({ success: false, error: 'Transacción no encontrada' });
    }

    // Revertir impacto en los saldos de cuentas
    const amount = parseFloat(t.amount) || 0;
    const sourceAccount = await db.findOne('accounts', { id: t.account_id });

    if (sourceAccount) {
      if (t.type === 'egreso') {
        const newBal = (parseFloat(sourceAccount.balance) || 0) + amount;
        await db.update('accounts', sourceAccount.id, { balance: newBal });
      } else if (t.type === 'ingreso') {
        const newBal = (parseFloat(sourceAccount.balance) || 0) - amount;
        await db.update('accounts', sourceAccount.id, { balance: newBal });
      } else if (t.type === 'transferencia') {
        const destAccount = await db.findOne('accounts', { id: t.to_account_id });
        const newSrcBal = (parseFloat(sourceAccount.balance) || 0) + amount;
        await db.update('accounts', sourceAccount.id, { balance: newSrcBal });
        if (destAccount) {
          const newDstBal = (parseFloat(destAccount.balance) || 0) - amount;
          await db.update('accounts', destAccount.id, { balance: newDstBal });
        }
      }
    }

    await db.softDelete('transactions', id);
    res.json({ success: true, message: 'Transacción eliminada y saldo restaurado correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al eliminar transacción' });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const userId = req.user.id;
    const { transactions, defaultAccountId } = req.body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ success: false, error: 'Lista de transacciones inválida o vacía' });
    }

    const userAccounts = await db.find('accounts', { user_id: userId, is_deleted: false });
    if (userAccounts.length === 0) {
      return res.status(400).json({ success: false, error: 'Debes tener al menos una cuenta para importar' });
    }

    const defaultAcc = userAccounts.find(a => a.id === defaultAccountId) || userAccounts[0];
    const inserted = [];
    const accountBalanceAdjustments = {};

    for (const item of transactions) {
      const amount = Math.abs(parseFloat(item.amount) || 0);
      if (amount <= 0) continue;

      const type = item.type === 'ingreso' ? 'ingreso' : 'egreso';
      const targetAccountId = item.account_id && userAccounts.some(a => a.id === item.account_id)
        ? item.account_id
        : defaultAcc.id;

      const txId = generateUuid();
      const newTx = await db.insert('transactions', {
        id: txId,
        user_id: userId,
        account_id: targetAccountId,
        type,
        amount,
        category: item.category || (type === 'ingreso' ? 'Otros Ingresos' : 'Varios'),
        description: item.description || 'Importado de Excel',
        date: item.date || new Date().toISOString().split('T')[0],
        time: item.time || '12:00:00',
        payment_method: item.payment_method || 'Excel/CSV',
        device_id: item.device_id || 'excel-import',
        sync_status: 'synced',
        is_deleted: false
      });

      inserted.push(newTx);

      if (!accountBalanceAdjustments[targetAccountId]) {
        accountBalanceAdjustments[targetAccountId] = 0;
      }
      if (type === 'ingreso') {
        accountBalanceAdjustments[targetAccountId] += amount;
      } else {
        accountBalanceAdjustments[targetAccountId] -= amount;
      }
    }

    for (const accId of Object.keys(accountBalanceAdjustments)) {
      const acc = userAccounts.find(a => a.id === accId);
      if (acc) {
        const currentBal = parseFloat(acc.balance) || 0;
        const newBal = currentBal + accountBalanceAdjustments[accId];
        await db.update('accounts', accId, { balance: newBal });
      }
    }

    res.status(201).json({
      success: true,
      message: `Se importaron ${inserted.length} transacciones exitosamente`,
      count: inserted.length,
      transactions: inserted
    });
  } catch (err) {
    console.error('Error en importación batch:', err);
    res.status(500).json({ success: false, error: 'Error al procesar la importación en lote', details: err.message });
  }
};

