const crypto = require('crypto');
const db = require('../db');

function generateUuid() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

/**
 * PULL: Descarga cambios generados en la nube desde la última sincronización
 */
exports.pull = async (req, res) => {
  try {
    const userId = req.user.id;
    const since = req.query.since || '1970-01-01T00:00:00.000Z';
    const serverTimestamp = new Date().toISOString();

    const collections = [
      'accounts',
      'transactions',
      'credit_cards',
      'debts',
      'debt_payments',
      'budgets',
      'recurring_rules'
    ];

    const data = {};

    for (const col of collections) {
      const allItems = await db.find(col, { user_id: userId, is_deleted: undefined });
      data[col] = allItems.filter(item => item.updated_at && item.updated_at > since);
    }

    res.json({
      success: true,
      server_timestamp: serverTimestamp,
      changes: data
    });
  } catch (err) {
    console.error('Error en sync pull:', err);
    res.status(500).json({ success: false, error: 'Error al obtener cambios para sincronización', details: err.message });
  }
};

/**
 * PUSH: Sube cambios realizados offline desde el dispositivo cliente (móvil o laptop)
 */
exports.push = async (req, res) => {
  try {
    const userId = req.user.id;
    const { device_id = 'unknown', items = [] } = req.body;
    const serverTimestamp = new Date().toISOString();

    let processedCount = 0;

    for (const item of items) {
      const { collection, data } = item;
      if (!collection || !data || !data.id) continue;

      data.user_id = userId;
      data.device_id = device_id;
      data.updated_at = data.updated_at || serverTimestamp;

      // Buscar si ya existe en la base de datos
      const existing = await db.findOne(collection, { id: data.id, is_deleted: undefined });

      if (existing) {
        // Resolución de conflicto Last-Write-Wins (LWW) por marca de tiempo
        const existingTime = new Date(existing.updated_at || 0).getTime();
        const incomingTime = new Date(data.updated_at || 0).getTime();

        if (incomingTime >= existingTime) {
          await db.update(collection, data.id, data);
          processedCount++;
        }
      } else {
        // Nuevo registro creado offline en el cliente
        await db.insert(collection, data);
        processedCount++;

        // Si es una transacción nueva no aplicada previamente, actualizar saldos de cuenta
        if (collection === 'transactions' && !data.is_deleted) {
          const amount = parseFloat(data.amount) || 0;
          const srcAcc = await db.findOne('accounts', { id: data.account_id });

          if (srcAcc) {
            if (data.type === 'egreso') {
              const newBal = (parseFloat(srcAcc.balance) || 0) - amount;
              await db.update('accounts', srcAcc.id, { balance: newBal });
            } else if (data.type === 'ingreso') {
              const newBal = (parseFloat(srcAcc.balance) || 0) + amount;
              await db.update('accounts', srcAcc.id, { balance: newBal });
            } else if (data.type === 'transferencia' && data.to_account_id) {
              const dstAcc = await db.findOne('accounts', { id: data.to_account_id });
              const newSrcBal = (parseFloat(srcAcc.balance) || 0) - amount;
              await db.update('accounts', srcAcc.id, { balance: newSrcBal });
              if (dstAcc) {
                const newDstBal = (parseFloat(dstAcc.balance) || 0) + amount;
                await db.update('accounts', dstAcc.id, { balance: newDstBal });
              }
            }
          }
        }
      }
    }

    // Registrar log de sincronización
    await db.insert('sync_logs', {
      id: generateUuid(),
      user_id: userId,
      device_id,
      sync_direction: 'push',
      entities_count: processedCount,
      synced_at: serverTimestamp
    });

    res.json({
      success: true,
      processed_count: processedCount,
      server_timestamp: serverTimestamp
    });
  } catch (err) {
    console.error('Error en sync push:', err);
    res.status(500).json({ success: false, error: 'Error al procesar sincronización', details: err.message });
  }
};
