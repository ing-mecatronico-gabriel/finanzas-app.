# DOCUMENTACIÓN DE LA BASE DE DATOS — FINANZASAPP
### Esquema Relacional PostgreSQL (Nube / Supabase / Neon / Local)

Este documento describe la estructura relacional, tipos de datos, restricciones e índices del esquema de base de datos de FinanzasApp.

---

## 1. TABLAS PRINCIPALES

### 1. `users` (Usuarios del Sistema)
- `id`: UUID (Primary Key).
- `name`: VARCHAR(150) — Nombre completo del usuario.
- `email`: VARCHAR(255) — Correo electrónico único.
- `password_hash`: VARCHAR(255) — Contraseña cifrada con algoritmo bcrypt y salt round.
- `currency`: VARCHAR(10) — Moneda preferida (por defecto `'COP'`).
- `created_at`, `updated_at`: Marcas de tiempo UTC.

### 2. `accounts` (Cuentas Financieras y Efectivo)
- `id`: UUID (Primary Key).
- `user_id`: UUID (Foreign Key a `users.id` ON DELETE CASCADE).
- `name`: VARCHAR(100) — Nombre de la cuenta (ej. "Bancolombia Ahorros", "Efectivo Bolsillo", "Nequi").
- `type`: VARCHAR(50) — Tipo: `'Bancaria'`, `'Ahorros'`, `'Corriente'`, `'Efectivo'`, `'Billetera digital'`, `'Nequi'`, `'Daviplata'`.
- `balance`: NUMERIC(15, 2) — Saldo disponible actual.
- `color`, `icon`: Identificadores visuales.
- `is_deleted`: BOOLEAN — Borrado lógico para sincronización.
- `updated_at`: TIMESTAMP — Clave para sincronización *Last-Write-Wins*.

### 3. `transactions` (Movimientos Financieros)
- `id`: UUID (Primary Key).
- `user_id`: UUID (Foreign Key a `users.id`).
- `account_id`: UUID (Foreign Key a `accounts.id` - Cuenta Origen).
- `to_account_id`: UUID (Foreign Key opcional a `accounts.id` - Cuenta Destino para Transferencias).
- `type`: VARCHAR(20) — `'ingreso'`, `'egreso'`, o `'transferencia'`.
- `amount`: NUMERIC(15, 2) — Monto de la transacción (positivo).
- `category`: VARCHAR(100) — Categoría principal.
- `subcategory`: VARCHAR(100) — Desglose secundario.
- `description`: TEXT — Concepto detallado.
- `payment_method`: VARCHAR(50) — Efectivo, Transferencia, Tarjeta Débito, etc.
- `expense_nature`: VARCHAR(20) — `'fijo'` o `'variable'`.
- `necessity`: VARCHAR(20) — `'necesario'` u `'opcional'`.
- `date`, `time`: Fecha y hora del movimiento.
- `device_id`: VARCHAR(100) — Dispositivo que originó el registro.
- `sync_status`: VARCHAR(20) — `'synced'` o `'pending'`.
- `is_deleted`: BOOLEAN — Borrado lógico.

### 4. `credit_cards` (Tarjetas de Crédito)
- `id`: UUID (Primary Key).
- `user_id`: UUID (Foreign Key a `users.id`).
- `bank`: VARCHAR(100) — Entidad bancaria.
- `name`: VARCHAR(100) — Nombre de la tarjeta (ej. "Visa Clásica").
- `credit_limit`: NUMERIC(15, 2) — Cupo total aprobado.
- `used_amount`: NUMERIC(15, 2) — Cupo consumido actualmente.
- `cutoff_day`: INT — Día de corte del extracto (1 a 31).
- `payment_day`: INT — Día límite de pago mensual (1 a 31).
- `interest_rate`: NUMERIC(5, 2) — Tasa efectiva mensual o anual.

### 5. `debts` (Deudas y Préstamos) y `debt_payments` (Abonos)
- `id`: UUID (Primary Key).
- `user_id`: UUID (Foreign Key).
- `entity_person`: VARCHAR(150) — Persona o entidad a quien se debe.
- `initial_amount`: NUMERIC(15, 2) — Monto inicial del préstamo.
- `pending_amount`: NUMERIC(15, 2) — Saldo pendiente actual por pagar.
- `monthly_installment`: NUMERIC(15, 2) — Valor estimado de la cuota.
- `due_date`: DATE — Fecha límite de liquidación.
- `status`: `'pendiente'`, `'en_proceso'`, `'pagada'`, `'vencida'`.

### 6. `budgets` (Presupuestos de Control de Gasto)
- `id`: UUID (Primary Key).
- `user_id`: UUID (Foreign Key).
- `period_type`: `'semanal'` o `'mensual'`.
- `category`: VARCHAR(100) (NULL para presupuesto global).
- `limit_amount`: NUMERIC(15, 2) — Techo máximo de gasto.
- `start_date`, `end_date`: Rango de vigencia.

### 7. `recurring_rules` (Reglas Recurrentes y Suscripciones)
- `id`: UUID (Primary Key).
- `user_id`: UUID (Foreign Key).
- `account_id`: UUID (Foreign Key).
- `type`: `'ingreso'` o `'egreso'`.
- `amount`: NUMERIC(15, 2).
- `frequency`: `'semanal'`, `'quincenal'`, `'mensual'`, `'anual'`.
- `execution_day`: INT.

---

## 2. ÍNDICES DE ALTO RENDIMIENTO

Para garantizar consultas ultrarrápidas y sincronización fluida:
```sql
CREATE INDEX idx_accounts_user_sync ON accounts(user_id, updated_at);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_user_sync ON transactions(user_id, updated_at);
CREATE INDEX idx_transactions_type ON transactions(user_id, type);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_credit_cards_user ON credit_cards(user_id, updated_at);
CREATE INDEX idx_debts_user ON debts(user_id, updated_at);
CREATE INDEX idx_budgets_user ON budgets(user_id, period_type);
```

---

## 3. AISLAMIENTO Y SEGURIDAD MULTI-USUARIO (ROW-LEVEL ISOLATION)

- Todas las tablas contienen el campo `user_id`.
- Todas las consultas SQL en los controladores de la API filtran obligatoriamente por `WHERE user_id = :authenticated_user_id`.
- Ningún usuario puede consultar, modificar ni eliminar registros que pertenezcan a otra cuenta, garantizando confidencialidad absoluta en entornos multi-inquilino.
