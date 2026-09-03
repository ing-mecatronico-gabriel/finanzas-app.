module.exports = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(150),
    password_hash VARCHAR(255) NOT NULL,
    plain_password VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    currency VARCHAR(10) DEFAULT 'COP',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar columnas si la tabla ya existía previamente
ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

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

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ingreso', 'egreso', 'transferencia')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    category VARCHAR(100),
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_rule_id UUID,
    is_deleted BOOLEAN DEFAULT FALSE,
    device_id VARCHAR(100),
    subcategory VARCHAR(100),
    expense_nature VARCHAR(50),
    necessity VARCHAR(50),
    frequency VARCHAR(50),
    time VARCHAR(20),
    notes TEXT,
    sync_status VARCHAR(20) DEFAULT 'synced',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar columnas si la tabla transactions ya existía previamente
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS expense_nature VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS necessity VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS frequency VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS time VARCHAR(20);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'synced';

-- Tabla de configuración global (ej. Modo Mantenimiento)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credit_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    last_four_digits VARCHAR(4),
    credit_limit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    available_limit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    closing_day INT CHECK (closing_day BETWEEN 1 AND 31),
    due_day INT CHECK (due_day BETWEEN 1 AND 31),
    color VARCHAR(20) DEFAULT '#4f46e5',
    is_deleted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL,
    creditor_debtor VARCHAR(150) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    remaining_balance NUMERIC(15, 2) NOT NULL,
    interest_rate NUMERIC(5, 2) DEFAULT 0.00,
    total_installments INT DEFAULT 1,
    paid_installments INT DEFAULT 0,
    installment_amount NUMERIC(15, 2) DEFAULT 0.00,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'en_proceso',
    is_deleted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS debt_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    installment_number INT,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    period VARCHAR(20) NOT NULL CHECK (period IN ('semanal', 'mensual', 'anual')),
    budget_limit NUMERIC(15, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    alert_threshold_percent INT DEFAULT 80,
    is_deleted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recurring_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ingreso', 'egreso')),
    amount NUMERIC(15, 2) NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('diario', 'semanal', 'quincenal', 'mensual', 'anual')),
    category VARCHAR(100),
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    execution_day INT,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL,
    client_timestamp TIMESTAMP WITH TIME ZONE,
    server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;
