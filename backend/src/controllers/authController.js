const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

function generateUuid() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

// Inicializar usuario Administrador por defecto (usuario: 1, contraseña: 1)
async function ensureAdminExists() {
  const adminUser = await db.findOne('users', { username: '1' });
  if (!adminUser) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash('1', salt);
    await db.insert('users', {
      id: '00000000-0000-0000-0000-000000000001',
      username: '1',
      name: 'Administrador',
      password_hash,
      plain_password: '1', // Para visualización en panel de administración
      role: 'admin',
      currency: 'COP'
    });
  }
}

// Asegurar admin al cargar
ensureAdminExists().catch(err => console.warn('Error inicializando admin:', err.message));

exports.register = async (req, res) => {
  try {
    const { username, password, name, currency = 'COP' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Usuario y contraseña requeridos' });
    }

    const cleanUsername = username.toString().trim().toLowerCase();

    const existing = await db.findOne('users', { username: cleanUsername });
    if (existing) {
      return res.status(400).json({ success: false, error: 'El nombre de usuario ya está registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const userId = generateUuid();
    const role = cleanUsername === '1' ? 'admin' : 'user';

    const newUser = await db.insert('users', {
      id: userId,
      username: cleanUsername,
      name: name ? name.trim() : cleanUsername,
      password_hash,
      plain_password: password, // Almacenado para visualización en modo administrador
      role,
      currency
    });

    // TODO USUARIO NUEVO INICIA ESTRICTAMENTE DESDE CERO ($0)
    // Se crean sus 3 cuentas base con saldo exactamente en $0 para que pueda empezar a registrar
    const defaultAccounts = [
      { id: generateUuid(), user_id: userId, name: 'Efectivo', type: 'Efectivo', balance: 0, currency, color: '#10b981', icon: 'money-bill-wave' },
      { id: generateUuid(), user_id: userId, name: 'Cuenta Bancaria', type: 'Bancaria', balance: 0, currency, color: '#2563eb', icon: 'landmark' },
      { id: generateUuid(), user_id: userId, name: 'Billetera Digital', type: 'Nequi', balance: 0, currency, color: '#8b5cf6', icon: 'mobile-alt' }
    ];

    for (const acc of defaultAccounts) {
      await db.insert('accounts', acc);
    }

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role, currency: newUser.currency },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      success: true,
      token,
      user: { id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role, currency: newUser.currency }
    });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ success: false, error: 'Error interno en registro', details: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Usuario y contraseña requeridos' });
    }

    const cleanUsername = username.toString().trim().toLowerCase();

    // MODO ADMINISTRADOR RÁPIDO: Si ingresa usuario 1 y contraseña 1
    if (cleanUsername === '1' && password.toString() === '1') {
      await ensureAdminExists();
      const admin = await db.findOne('users', { username: '1' });
      const token = jwt.sign(
        { id: admin.id, username: '1', name: 'Administrador', role: 'admin', currency: 'COP' },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );
      return res.json({
        success: true,
        token,
        user: { id: admin.id, username: '1', name: 'Administrador', role: 'admin', currency: 'COP' },
        isAdmin: true
      });
    }

    const user = await db.findOne('users', { username: cleanUsername });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch && user.plain_password !== password) {
      return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role || 'user', currency: user.currency },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role || 'user', currency: user.currency },
      isAdmin: user.role === 'admin'
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ success: false, error: 'Error interno en inicio de sesión' });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await db.findOne('users', { id: req.user.id });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      user: { id: user.id, username: user.username, name: user.name, role: user.role || 'user', currency: user.currency }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error consultando perfil' });
  }
};
