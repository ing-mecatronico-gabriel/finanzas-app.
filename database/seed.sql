-- ==========================================================
-- SISTEMA DE GESTIÓN FINANCIERA PERSONAL MULTIPLATAFORMA
-- DATOS INICIALES (SEED.SQL)
-- Categorías por defecto del sistema y datos de referencia
-- ==========================================================

-- Categorías de Egresos por Defecto
INSERT INTO categories (name, type, icon, color, is_default) VALUES
-- Alimentación
('Alimentación', 'egreso', 'utensils', '#ef4444', true),
('Mercado', 'egreso', 'shopping-cart', '#ef4444', true),
('Restaurante', 'egreso', 'utensils', '#ef4444', true),
('Comida rápida', 'egreso', 'hamburger', '#ef4444', true),
('Snacks', 'egreso', 'cookie', '#ef4444', true),

-- Transporte
('Transporte', 'egreso', 'bus', '#f97316', true),
('Bus', 'egreso', 'bus', '#f97316', true),
('Taxi', 'egreso', 'taxi', '#f97316', true),
('Moto', 'egreso', 'motorcycle', '#f97316', true),
('Gasolina', 'egreso', 'gas-pump', '#f97316', true),
('Aplicaciones', 'egreso', 'mobile-alt', '#f97316', true),
('Mantenimiento', 'egreso', 'wrench', '#f97316', true),

-- Educación
('Educación', 'egreso', 'graduation-cap', '#3b82f6', true),
('Universidad', 'egreso', 'university', '#3b82f6', true),
('Cursos', 'egreso', 'laptop-code', '#3b82f6', true),
('Libros', 'egreso', 'book', '#3b82f6', true),
('Material', 'egreso', 'pencil-ruler', '#3b82f6', true),

-- Vivienda
('Vivienda', 'egreso', 'home', '#10b981', true),
('Arriendo', 'egreso', 'key', '#10b981', true),
('Servicios', 'egreso', 'file-invoice-dollar', '#10b981', true),
('Internet', 'egreso', 'wifi', '#10b981', true),
('Gas', 'egreso', 'fire', '#10b981', true),
('Energía', 'egreso', 'bolt', '#10b981', true),
('Agua', 'egreso', 'tint', '#10b981', true),

-- Entretenimiento
('Entretenimiento', 'egreso', 'film', '#8b5cf6', true),
('Cine', 'egreso', 'ticket-alt', '#8b5cf6', true),
('Juegos', 'egreso', 'gamepad', '#8b5cf6', true),
('Streaming', 'egreso', 'tv', '#8b5cf6', true),
('Salidas', 'egreso', 'cocktail', '#8b5cf6', true),

-- Salud
('Salud', 'egreso', 'heartbeat', '#ec4899', true),
('Consultas', 'egreso', 'user-md', '#ec4899', true),
('Medicamentos', 'egreso', 'pills', '#ec4899', true),
('Exámenes', 'egreso', 'notes-medical', '#ec4899', true),

-- Compras
('Compras', 'egreso', 'shopping-bag', '#14b8a6', true),
('Ropa', 'egreso', 'tshirt', '#14b8a6', true),
('Tecnología', 'egreso', 'laptop', '#14b8a6', true),
('Accesorios', 'egreso', 'gem', '#14b8a6', true),

-- Finanzas
('Finanzas', 'egreso', 'landmark', '#64748b', true),
('Deudas', 'egreso', 'hand-holding-usd', '#64748b', true),
('Tarjetas', 'egreso', 'credit-card', '#64748b', true),
('Intereses', 'egreso', 'percentage', '#64748b', true),
('Comisiones', 'egreso', 'receipt', '#64748b', true)
ON CONFLICT DO NOTHING;

-- Categorías de Ingresos por Defecto
INSERT INTO categories (name, type, icon, color, is_default) VALUES
('Salario', 'ingreso', 'money-bill-wave', '#22c55e', true),
('Trabajo', 'ingreso', 'briefcase', '#22c55e', true),
('Negocio', 'ingreso', 'store', '#22c55e', true),
('Ventas', 'ingreso', 'chart-line', '#22c55e', true),
('Comisión', 'ingreso', 'award', '#22c55e', true),
('Bonificación', 'ingreso', 'gift', '#22c55e', true),
('Inversiones', 'ingreso', 'piggy-bank', '#22c55e', true),
('Transferencias', 'ingreso', 'exchange-alt', '#22c55e', true),
('Regalos', 'ingreso', 'gift', '#22c55e', true),
('Otros', 'ingreso', 'plus-circle', '#22c55e', true)
ON CONFLICT DO NOTHING;
