-- ==========================================================
-- SISTEMA DE GESTIÓN FINANCIERA PERSONAL MULTIPLATAFORMA
-- ESQUEMA DDL PARA POSTGRESQL (NUBE / SUPABASE / NEON)
-- ==========================================================

-- Extensión para generación de UUIDs si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE USUARIOS (AUTENTICACIÓN POR USUARIO Y CONTRASEÑA)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(150),
    password_hash VARCHAR(255) NOT NULL,
    plain_password VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user', -- 'admin', 'user'
    currency VARCHAR(10) DEFAULT 'COP',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA DE CUENTAS FINANCIERAS
-- Tipos: 'Bancaria', 'Ahorros', 'Corriente', 'Billetera digital', 'Efectivo', 'Nequi', 'Daviplata', 'Inversión', 'Otras'
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'COP',
    color VARCHAR(20) DEFAULT '#2563eb',
    icon VARCHAR(50) DEFAULT 'wallet',
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    device_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE CATEGORÍAS (PERSONALIZABLES POR USUARIO)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ingreso', 'egreso')),
    icon VARCHAR(50) DEFAULT 'tag',
    color VARCHAR(20) DEFAULT '#6b7280',
    parent_category VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DE TRANSACCIONES (INGRESOS, EGRESOS Y TRANSFERENCIAS)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL, -- Solo para transferencias
    type VARCHAR(20) NOT NULL CHECK (type IN ('ingreso', 'egreso', 'transferencia')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    description TEXT,
    payment_method VARCHAR(50) DEFAULT 'Transferencia',
    expense_nature VARCHAR(20) DEFAULT 'variable' CHECK (expense_nature IN ('fijo', 'variable', 'na')),
    necessity VARCHAR(20) DEFAULT 'necesario' CHECK (necessity IN ('necesario', 'opcional', 'na')),
    is_recurring BOOLEAN DEFAULT FALSE,
    frequency VARCHAR(30) DEFAULT 'ninguna', -- 'semanal', 'quincenal', 'mensual', 'anual'
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME NOT NULL DEFAULT CURRENT_TIME,
    notes TEXT,
    device_id VARCHAR(100),
    sync_status VARCHAR(20) DEFAULT 'synced',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE TARJETAS DE CRÉDITO
CREATE TABLE IF NOT EXISTS credit_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    credit_limit NUMERIC(15, 2) NOT NULL CHECK (credit_limit >= 0),
    used_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (used_amount >= 0),
    cutoff_day INT NOT NULL CHECK (cutoff_day BETWEEN 1 AND 31),
    payment_day INT NOT NULL CHECK (payment_day BETWEEN 1 AND 31),
    interest_rate NUMERIC(5, 2) DEFAULT 0.00,
    color VARCHAR(20) DEFAULT '#7c3aed',
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    device_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA DE DEUDAS Y PRÉSTAMOS
CREATE TABLE IF NOT EXISTS debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_person VARCHAR(150) NOT NULL,
    description TEXT,
    initial_amount NUMERIC(15, 2) NOT NULL CHECK (initial_amount >= 0),
    pending_amount NUMERIC(15, 2) NOT NULL CHECK (pending_amount >= 0),
    monthly_installment NUMERIC(15, 2) DEFAULT 0.00,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    frequency VARCHAR(30) DEFAULT 'mensual',
    interest_rate NUMERIC(5, 2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_proceso', 'pagada', 'vencida')),
    is_deleted BOOLEAN DEFAULT FALSE,
    device_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA DE ABONOS / PAGOS DE DEUDAS
CREATE TABLE IF NOT EXISTS debt_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    device_id VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA DE PRESUPUESTOS (SEMANALES Y MENSUALES POR CATEGORÍA O GLOBALES)
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('semanal', 'mensual')),
    category VARCHAR(100), -- NULL representa presupuesto global
    limit_amount NUMERIC(15, 2) NOT NULL CHECK (limit_amount > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    device_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABLA DE REGLAS RECURRENTES (INGRESOS Y GASTOS FIJOS/SUSCRIPCIONES)
CREATE TABLE IF NOT EXISTS recurring_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ingreso', 'egreso')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    frequency VARCHAR(30) NOT NULL CHECK (frequency IN ('semanal', 'quincenal', 'mensual', 'anual')),
    execution_day INT NOT NULL DEFAULT 1, -- Día del mes o día de la semana
    is_active BOOLEAN DEFAULT TRUE,
    last_applied_date DATE,
    is_deleted BOOLEAN DEFAULT FALSE,
    device_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABLA DE REGISTRO DE SINCRONIZACIÓN (SYNC LOGS)
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(100) NOT NULL,
    sync_direction VARCHAR(20) NOT NULL CHECK (sync_direction IN ('push', 'pull')),
    entities_count INT DEFAULT 0,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- ÍNDICES PARA OPTIMIZACIÓN Y CONSULTAS DE SINCRONIZACIÓN
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_accounts_user_sync ON accounts(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_sync ON transactions(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user ON credit_cards(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id, period_type);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_rules(user_id, is_active);
