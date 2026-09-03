const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const authController = require('../controllers/authController');
const accountController = require('../controllers/accountController');
const transactionController = require('../controllers/transactionController');
const cardController = require('../controllers/cardController');
const debtController = require('../controllers/debtController');
const budgetController = require('../controllers/budgetController');
const recurringController = require('../controllers/recurringController');
const syncController = require('../controllers/syncController');
const reportController = require('../controllers/reportController');
const adminController = require('../controllers/adminController');

// 1. Rutas Públicas de Autenticación y Estado
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/system/maintenance', adminController.getMaintenance);

// Todas las rutas siguientes requieren Token JWT
router.use(authMiddleware);

// Perfil de Usuario
router.get('/auth/me', authController.me);

// 2. Cuentas Financieras y Efectivo
router.get('/accounts', accountController.getAll);
router.post('/accounts', accountController.create);
router.put('/accounts/:id', accountController.update);
router.delete('/accounts/:id', accountController.delete);

// 3. Transacciones (Ingresos, Egresos, Transferencias)
router.get('/transactions', transactionController.getAll);
router.post('/transactions', transactionController.create);
router.post('/transactions/batch', transactionController.createBatch);
router.delete('/transactions/:id', transactionController.delete);

// 4. Tarjetas de Crédito
router.get('/cards', cardController.getAll);
router.post('/cards', cardController.create);
router.put('/cards/:id', cardController.update);
router.delete('/cards/:id', cardController.delete);

// 5. Deudas y Abonos
router.get('/debts', debtController.getAll);
router.post('/debts', debtController.create);
router.post('/debts/:id/payments', debtController.addPayment);
router.put('/debts/:id', debtController.update);
router.delete('/debts/:id', debtController.delete);

// 6. Presupuestos Semanales y Mensuales
router.get('/budgets', budgetController.getAll);
router.post('/budgets', budgetController.create);
router.delete('/budgets/:id', budgetController.delete);

// 7. Reglas Recurrentes (Gastos e Ingresos Fijos)
router.get('/recurring', recurringController.getAll);
router.post('/recurring', recurringController.create);
router.delete('/recurring/:id', recurringController.delete);

// 8. Motor de Sincronización Celular <-> Nube <-> Laptop
router.get('/sync/pull', syncController.pull);
router.post('/sync/push', syncController.push);

// 9. Analítica Financiera y Exportación
router.get('/reports/analytics', reportController.getAnalytics);
router.get('/export/csv', reportController.exportCsv);

// 10. MODO ADMINISTRADOR (USUARIO 1, CONTRASEÑA 1) Y MANTENIMIENTO
router.get('/system/maintenance', adminController.getMaintenance);
router.post('/admin/maintenance', adminController.toggleMaintenance);
router.get('/admin/users', adminController.getUsers);
router.put('/admin/users/:id/password', adminController.updateUserPassword);
router.delete('/admin/users/:id', adminController.deleteUser);

module.exports = router;
