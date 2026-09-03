const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./src/config');
const apiRoutes = require('./src/routes/api');

const app = express();

// Middlewares
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Servir la Aplicación Unificada y Responsive (Computador y Celular)
app.use(express.static(path.join(__dirname, '..', 'finanzasapp')));
app.use('/finanzasapp', express.static(path.join(__dirname, '..', 'finanzasapp')));

// Redirecciones para que cualquier URL antigua use la nueva interfaz unificada
app.get('/mobile', (req, res) => res.redirect('/'));
app.get('/desktop', (req, res) => res.redirect('/'));

// Rutas de API REST
app.use('/api', apiRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'FinanzasApp API',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv
  });
});

// Ruta raíz por defecto
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'finanzasapp', 'index.html'));
});

const PORT = config.port;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 FinanzasApp Servidor iniciado exitosamente`);
    console.log(`🌐 Aplicación Unificada:  http://localhost:${PORT}`);
    console.log(`📡 API REST:             http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

module.exports = app;
