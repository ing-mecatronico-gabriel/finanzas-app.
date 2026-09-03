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

// Servir Estáticos del Cliente Móvil (PWA)
app.use('/mobile', express.static(path.join(__dirname, '..', 'mobile')));

// Servir Estáticos de la Aplicación Laptop / Desktop
app.use('/desktop', express.static(path.join(__dirname, '..', 'desktop')));

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

// Portal de Bienvenida y Selector de Plataforma
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FinanzasApp — Sistema de Gestión Financiera</title>
      <style>
        :root {
          --primary: #2563eb;
          --bg: #0f172a;
          --card: #1e293b;
          --text: #f8fafc;
          --text-muted: #94a3b8;
          --accent-green: #10b981;
          --accent-purple: #8b5cf6;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        body { background: var(--bg); color: var(--text); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .container { max-width: 800px; width: 100%; text-align: center; }
        .badge { display: inline-block; background: rgba(37, 99, 235, 0.2); color: #60a5fa; padding: 6px 14px; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-bottom: 16px; border: 1px solid rgba(37, 99, 235, 0.3); }
        h1 { font-size: 2.5rem; margin-bottom: 12px; letter-spacing: -0.5px; }
        p.subtitle { color: var(--text-muted); font-size: 1.1rem; margin-bottom: 40px; line-height: 1.6; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 40px; }
        .card { background: var(--card); border: 1px solid #334155; border-radius: 16px; padding: 32px 24px; text-decoration: none; color: inherit; transition: all 0.25s ease; display: flex; flex-direction: column; align-items: center; text-align: center; }
        .card:hover { transform: translateY(-4px); border-color: var(--primary); box-shadow: 0 12px 24px -10px rgba(37, 99, 235, 0.3); }
        .icon { font-size: 3rem; margin-bottom: 16px; }
        .card h2 { font-size: 1.4rem; margin-bottom: 8px; }
        .card p { color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 20px; }
        .btn { display: inline-block; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.95rem; background: var(--primary); color: white; border: none; }
        .status-box { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 14px; display: inline-flex; align-items: center; gap: 10px; font-size: 0.9rem; color: #34d399; }
        .dot { width: 10px; height: 10px; border-radius: 50%; background: #10b981; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="badge">🚀 FinanzasApp Multiplataforma</div>
        <h1>Gestión Financiera Personal</h1>
        <p class="subtitle">Base de datos centralizada en la nube, sincronización bidireccional continua y experiencias nativas independientes.</p>
        
        <div class="grid">
          <a href="/mobile" class="card">
            <div class="icon">📱</div>
            <h2>Aplicación Celular</h2>
            <p>PWA móvil táctil para registrar gastos e ingresos en segundos, soporte offline y barra inferior táctil.</p>
            <span class="btn" style="background: #10b981;">Abrir Móvil</span>
          </a>

          <a href="/desktop" class="card">
            <div class="icon">💻</div>
            <h2>Aplicación Laptop</h2>
            <p>Dashboard analítico para computador con gráficos Chart.js, tablas avanzadas, control de deudas y presupuestos.</p>
            <span class="btn" style="background: #2563eb;">Abrir Laptop</span>
          </a>
        </div>

        <div class="status-box">
          <div class="dot"></div>
          <span>Backend y Base de Datos Activos • Sincronización Lista</span>
        </div>
      </div>
    </body>
    </html>
  `);
});

const PORT = config.port;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 FinanzasApp Servidor iniciado exitosamente`);
    console.log(`🌐 Portal General:        http://localhost:${PORT}`);
    console.log(`📱 Aplicación Móvil:     http://localhost:${PORT}/mobile`);
    console.log(`💻 Aplicación Laptop:    http://localhost:${PORT}/desktop`);
    console.log(`📡 API REST:             http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

module.exports = app;
