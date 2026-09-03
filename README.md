# 🚀 FinanzasApp — Sistema de Gestión Financiera Personal Multiplataforma

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20Supabase-blue.svg)](https://supabase.com)
[![PWA](https://img.shields.io/badge/PWA-Mobile%20%26%20Desktop-orange.svg)](https://developer.mozilla.org)
[![Tests](https://img.shields.io/badge/Tests-8%20Obligatorias%20Pasadas-brightgreen.svg)]()

FinanzasApp es un sistema profesional e integral de **gestión financiera personal** diseñado para operar fluidamente en **CELULARES (PWA táctil con soporte offline)** y **COMPUTADORES/LAPTOPS (Dashboard analítico para pantallas grandes)**, respaldado por una **base de datos centralizada en la nube** con sincronización bidireccional continua.

---

## 🌟 Características Principales

- 📱 **Aplicación Celular (PWA)**:
  - Interfaz ergonómica táctil optimizada para uso con una sola mano.
  - Barra de navegación inferior (Bottom Nav) y botón flotante (+) para registrar gastos en 5 segundos.
  - Funcionamiento Offline-First: Registra movimientos sin internet que se sincronizan solos al recuperar señal.
  - Instalable en Android e iOS directamente desde el navegador web.
  - Indicador visual de sincronización (🟢 Sincronizado, 🟡 Sincronizando..., 🔴 Sin conexión).

- 💻 **Aplicación Laptop / Escritorio**:
  - Panel financiero con 8 KPIs en tiempo real: Dinero Disponible, Bancos/Billeteras, Efectivo Físico, Crédito Disponible, Deuda Pendiente, Ingresos del Mes, Egresos del Mes y Balance Neto.
  - Cuadrícula de gráficos interactivos impulsados por **Chart.js** utilizando datos 100% reales.
  - Tabla de movimientos completa con filtros multicriterio (búsqueda instantánea, rango de fechas, cuenta y tipo).
  - Calendario de vencimientos de tarjetas, cuotas de préstamos y suscripciones.
  - Diagnósticos financieros automatizados ("Gastaste un X% más...", "Transporte representa el Y%...", "Promedio diario...").
  - Centro de exportación a CSV, JSON y reportes imprimibles en PDF.

- ☁️ **Arquitectura Cloud Desacoplada**:
  - **La Laptop NO es el servidor**.
  - Celular y computador se comunican directamente con el servidor y la base de datos en la nube.
  - La laptop puede permanecer apagada días enteros sin afectar el funcionamiento del celular.
  - Protocolo de resolución de conflictos *Last-Write-Wins* (LWW) y UUIDs v4 para evitar duplicaciones.

- 💰 **Lógica Financiera Rigurosa**:
  - Control autónomo de **Efectivo Físico** para cuadrar el dinero en el bolsillo.
  - **Transferencias Neutras**: Mover dinero entre cuentas (o retirar a efectivo) no altera los ingresos ni egresos del mes.
  - Tarjetas de crédito con cálculo dinámico de cupo disponible y días de corte/pago.
  - Deudas con seguimiento de abonos que descuentan el saldo pendiente y la cuenta de pago simultáneamente.
  - Presupuestos semanales y mensuales con barras de consumo y alertas de sobrecosto.

---

## 📁 Estructura del Proyecto

```text
FinanzasApp/
├── mobile/                      # Aplicación Celular (PWA)
│   ├── index.html               # Interfaz táctil ergonómica
│   ├── styles.css               # Estilos mobile-first
│   ├── app.js                   # Lógica PWA, cola offline y sincronización
│   ├── manifest.json            # Manifiesto PWA para instalación nativa
│   ├── sw.js                    # Service Worker para caché sin internet
│   └── assets/                  # Iconos y recursos gráficos
│
├── desktop/                     # Aplicación Laptop / Desktop
│   ├── index.html               # Dashboard completo para pantallas grandes
│   ├── styles.css               # Diseño de alta resolución con barra lateral
│   ├── app.js                   # Controlador con gráficos Chart.js y tablas
│   ├── manifest.json            # PWA de escritorio
│   └── assets/                  # Recursos gráficos
│
├── backend/                     # Servidor Node.js y API REST
│   ├── server.js                # Punto de entrada Express y health-check
│   ├── package.json             # Dependencias (express, cors, bcryptjs, jwt, pg)
│   ├── src/
│   │   ├── config/              # Configuración de variables de entorno
│   │   ├── middleware/          # Autenticación JWT y validación
│   │   ├── controllers/         # Controladores de negocio (Auth, Cuentas, Sync, etc.)
│   │   ├── routes/              # Definición de rutas REST /api
│   │   └── db/                  # Adaptador dual (PostgreSQL Cloud + Local persistente)
│   └── tests/
│       └── suite.test.js        # Suite automatizada con las 8 pruebas obligatorias
│
├── database/                    # Base de Datos
│   ├── schema.sql               # Esquema DDL para PostgreSQL / Supabase
│   └── seed.sql                 # Categorías iniciales y datos de prueba
│
├── docs/                        # Documentación Completa
│   ├── MANUAL_USUARIO.md        # Manual paso a paso para celular y laptop
│   ├── SINCRONIZACION.md        # Explicación y diagramas del flujo en la nube
│   ├── INSTALACION.md           # Guía de instalación y despliegue (Render / Supabase)
│   ├── ARQUITECTURA.md          # Arquitectura de software y seguridad
│   └── BASE_DATOS.md            # Documentación del esquema relacional
│
├── .env.example                 # Variables de entorno de ejemplo
├── package.json                 # Scripts de raíz
└── README.md                    # Este archivo
```

---

## ⚡ Inicio Rápido (3 Pasos)

### 1. Instalar dependencias
```bash
cd backend
npm install
```

### 2. Ejecutar las Pruebas Obligatorias
```bash
npm test
```
*Todas las 8 pruebas pasarán al 100%, certificando la consistencia de saldos, sincronización offline, transferencias y gráficos.*

### 3. Iniciar el Servidor
```bash
npm start
```

Abre en tu navegador:
- 🌐 **Portal Principal**: [http://localhost:3000](http://localhost:3000)
- 📱 **Aplicación Celular**: [http://localhost:3000/mobile](http://localhost:3000/mobile)
- 💻 **Aplicación Laptop**: [http://localhost:3000/desktop](http://localhost:3000/desktop)

---

## ☁️ Conexión a Base de Datos en la Nube (Supabase / PostgreSQL)

1. Crea una base de datos gratuita en [Supabase.com](https://supabase.com).
2. En el Editor SQL de Supabase ejecuta el script `database/schema.sql` y `database/seed.sql`.
3. Crea un archivo `.env` dentro de la carpeta `backend/` con tu cadena de conexión:
   ```env
   DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
   JWT_SECRET=tu_clave_secreta_super_segura
   PORT=3000
   ```
4. Inicia el servidor (`npm start`). El backend se conectará automáticamente a tu PostgreSQL en la nube.

---

## 📖 Documentación Detallada
- 📘 [Manual de Usuario](docs/MANUAL_USUARIO.md)
- 🔄 [Manual de Sincronización y Diagramas](docs/SINCRONIZACION.md)
- 🚀 [Guía de Instalación y Despliegue en la Nube](docs/INSTALACION.md)
- 🏛️ [Arquitectura del Sistema](docs/ARQUITECTURA.md)
- 🗄️ [Documentación de la Base de Datos](docs/BASE_DATOS.md)
