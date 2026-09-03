# ARQUITECTURA DEL SISTEMA — FINANZASAPP
### Arquitectura de Software, Desacoplamiento y Sincronización en la Nube

---

## 1. VISIÓN GENERAL DE LA ARQUITECTURA

FinanzasApp implementa una arquitectura desacoplada basada en micro-clientes independientes (Móvil PWA y Laptop Web/Desktop) comunicados mediante una **API REST stateless** protegida con tokens JWT, respaldada por una **base de datos relacional PostgreSQL centralizada en la nube**.

```text
┌────────────────────────────────┐         ┌────────────────────────────────┐
│        📱 CLIENTE MÓVIL         │         │        💻 CLIENTE LAPTOP        │
│   - PWA Standalone (Touch UI)  │         │   - Panel Analítico Completo   │
│   - Service Worker Cache       │         │   - Gráficas Chart.js          │
│   - Cola Local Offline         │         │   - Tablas Avanzadas y Filtros │
│   - Optimistic UI Updates      │         │   - Exportación CSV/JSON/PDF   │
└───────────────┬────────────────┘         └────────────────┬───────────────┘
                │                                           │
                │ HTTPS / REST (JSON)                       │ HTTPS / REST (JSON)
                │ Bearer JWT Token                          │ Bearer JWT Token
                ▼                                           ▼
       ┌─────────────────────────────────────────────────────────────┐
       │                ☁️ SERVIDOR BACKEND (Node.js)                │
       │   - Express REST API Router                                 │
       │   - Autenticación JWT & Cifrado Bcrypt                      │
       │   - Motor de Sincronización (/api/sync/pull, push)          │
       │   - Motor Financiero (Neutralidad de Transferencias)        │
       │   - Generador de Diagnósticos Financieros                   │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
                                      │ Connection Pool (SSL)
                                      ▼
       ┌─────────────────────────────────────────────────────────────┐
       │             🗄️ BASE DE DATOS POSTGRESQL CLOUD               │
       │   - Aislamiento estricto por user_id                        │
       │   - UUID v4 para prevención de colisiones                   │
       │   - Resolución Last-Write-Wins por Timestamp UTC            │
       │   - Índices optimizados para sincronización continua        │
       └─────────────────────────────────────────────────────────────┘
```

---

## 2. POR QUÉ LA LAPTOP NO ES EL SERVIDOR

Uno de los requerimientos arquitectónicos más estrictos de FinanzasApp es la independencia de los dispositivos:
1. **Disponibilidad 24/7 sin consumo de energía local**: Al alojar la base de datos y la API en la nube (como Supabase y Render), el usuario puede apagar su laptop durante días o semanas sin que el celular pierda acceso a sus finanzas.
2. **Sin IP dinámica ni redirección de puertos**: Los servidores domésticos en laptops enfrentan problemas comunes como cambios de IP pública por parte del proveedor de internet (ISP), suspensión por ahorro de energía o fallos de red al salir de casa. La arquitectura cloud elimina estas limitaciones.
3. **Consistencia de Datos en Tiempo Real**: Ambos dispositivos son consumidores pares de la misma fuente de verdad (*Single Source of Truth*).

---

## 3. FLUJO DE TRABAJO OFFLINE-FIRST EN EL CLIENTE MÓVIL

1. El usuario interactúa con la pantalla táctil para registrar un gasto o ingreso.
2. La aplicación genera un UUID v4 localmente e inserta la transacción en su almacenamiento local.
3. El saldo disponible y las listas se actualizan en pantalla en **0 milisegundos** (*Optimistic UI*), ofreciendo una experiencia táctil ultra fluida.
4. Si hay conexión a Internet, la transacción se envía inmediatamente mediante `POST /api/transactions`.
5. Si no hay conexión o falla la red:
   - Se añade a la cola `finanzas_mobile_queue`.
   - El indicador superior cambia a `🔴 Sin conexión`.
   - El Service Worker garantiza que la aplicación web siga cargando sin internet.
6. Al reconectarse:
   - El evento `window.ononline` dispara automáticamente la subida en lote (`POST /api/sync/push`).
   - Se vacía la cola local y se actualiza el indicador a `🟢 Sincronizado`.

---

## 4. MOTOR FINANCIERO Y NEUTRALIDAD DE TRANSFERENCIAS

A diferencia de aplicaciones contables rudimentarias, FinanzasApp implementa una regla estricta de neutralidad para transferencias:
- Cuando el usuario mueve $100.000 de su cuenta de ahorros a efectivo o a Nequi:
  - Se descuentan $100.000 de la cuenta origen.
  - Se suman $100.000 a la cuenta destino.
  - El gasto total del mes **NO aumenta**.
  - El ingreso total del mes **NO aumenta**.
  - El balance neto global permanece intacto.
- Esto evita que los retiros en cajero o recargas de billeteras virtuales falseen las estadísticas de gasto del usuario.
