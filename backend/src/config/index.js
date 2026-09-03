require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'finanzas_app_default_secret_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  databaseUrl: process.env.DATABASE_URL || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'COP'
};
