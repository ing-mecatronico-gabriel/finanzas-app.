const bcrypt = require('bcryptjs');
const db = require('../db');

exports.getUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.username !== '1') {
      return res.status(403).json({ success: false, error: 'Acceso restringido a administradores' });
    }

    const users = await db.find('users', { is_deleted: undefined });
    const accounts = await db.find('accounts', { is_deleted: false });
    const transactions = await db.find('transactions', { is_deleted: false });

    const userList = users.map(u => {
      const userAccounts = accounts.filter(a => a.user_id === u.id);
      const userTx = transactions.filter(t => t.user_id === u.id);
      const totalBalance = userAccounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

      return {
        id: u.id,
        username: u.username,
        name: u.name || u.username,
        role: u.role || 'user',
        password_plain: u.plain_password || '(Cifrada en bcrypt)',
        created_at: u.created_at,
        accounts_count: userAccounts.length,
        transactions_count: userTx.length,
        total_balance: totalBalance
      };
    });

    res.json({ success: true, users: userList });
  } catch (err) {
    console.error('Error obteniendo usuarios admin:', err);
    res.status(500).json({ success: false, error: 'Error al consultar lista de usuarios' });
  }
};

exports.updateUserPassword = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.username !== '1') {
      return res.status(403).json({ success: false, error: 'Acceso restringido a administradores' });
    }

    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({ success: false, error: 'Nueva contraseña requerida' });
    }

    const targetUser = await db.findOne('users', { id });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(new_password.toString(), salt);

    await db.update('users', id, {
      password_hash,
      plain_password: new_password.toString()
    });

    res.json({ success: true, message: `Contraseña del usuario ${targetUser.username} actualizada con éxito` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al actualizar contraseña' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.username !== '1') {
      return res.status(403).json({ success: false, error: 'Acceso restringido a administradores' });
    }

    const { id } = req.params;
    const targetUser = await db.findOne('users', { id });

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    if (targetUser.username === '1') {
      return res.status(400).json({ success: false, error: 'No se puede eliminar la cuenta de Administrador principal' });
    }

    await db.softDelete('users', id);
    res.json({ success: true, message: `Usuario ${targetUser.username} eliminado correctamente` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al eliminar usuario' });
  }
};

let maintenanceState = {
  active: false,
  message: '🚧 Estamos realizando mejoras en el sistema. Volveremos en unos momentos. ¡Gracias por tu paciencia!'
};

exports.getMaintenance = async (req, res) => {
  res.json({ success: true, ...maintenanceState });
};

exports.toggleMaintenance = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.username !== '1') {
      return res.status(403).json({ success: false, error: 'Acceso restringido a administradores' });
    }
    const { active, message } = req.body;
    maintenanceState.active = active !== undefined ? !!active : !maintenanceState.active;
    if (message) maintenanceState.message = message;

    res.json({
      success: true,
      message: maintenanceState.active ? '🚧 Modo mantenimiento ACTIVADO' : '✅ Modo mantenimiento DESACTIVADO',
      ...maintenanceState
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al cambiar modo mantenimiento' });
  }
};

