# FinanzasApp — Interfaz Fintech Premium Moderna

Interfaz de usuario moderna, minimalista y profesional para la gestión de finanzas personales, diseñada bajo los más altos estándares visuales de la industria fintech moderna.

---

## 🎨 Características Visuales y de Diseño

- **Estética Fintech de Alta Gama**: Diseñada con tarjetas pastel suaves, tipografía *Plus Jakarta Sans* e *Inter*, bordes redondeados ergonómicos (`border-radius: 18px - 24px`) y sombras ultra suaves.
- **Doble Tema (Modo Claro / Modo Oscuro / Automático)**:
  - ☀️ **Modo Claro**: Fondo `#F5F7FB`, tarjetas pastel con contraste suave, canvas blanco puro.
  - 🌙 **Modo Oscuro**: Fondo azul carbón profundo (`#0B0F17`), tarjetas pastel oscurecidas de alto contraste.
  - ⚙️ **Automático**: Sincronizado en tiempo real con las preferencias de tu sistema operativo.
- **Experiencia 100% Adaptable (Desktop & Mobile)**:
  - **Escritorio / Laptop**: Barra lateral (Sidebar) oscura fija con logotipo B estilizado, navegación completa, atajos y opción de colapso a iconos.
  - **Celular / APK**: Barra lateral oculta, carrusel táctil de cuentas deslizable horizontalmente (swipe) y barra de navegación inferior fija (`Bottom Navigation Bar`) con botón destacado `+ Añadir`.
- **Módulos Integrados**:
  1. **Overview / Resumen**: Balance general interactivo con selector temporal (`1D`, `1S`, `1M`, `6M`, `1A`, `TODO`) y gráfico SVG, tarjetas pastel de cuentas y movimientos recientes.
  2. **Movimientos**: Búsqueda en tiempo real, filtros por tipo (Ingresos, Gastos, Transferencias) y modal ergonómico de registro.
  3. **Cuentas**: Administración completa de cuentas bancarias, billeteras y efectivo con transferencias neutras.
  4. **Presupuesto**: Control de límites mensuales por categoría con alertas automáticas de advertencia (>80%) y exceso (100%).
  5. **Metas de Ahorro**: Objetivos con barras porcentuales y sistema de aportes.
  6. **Reportes**: Analítica financiera con KPIs, distribución de gastos y comparativa mensual.
  7. **Finanzas AI**: Asistente financiero inteligente integrado con diagnóstico de anomalías, categorías dominantes y respuestas contextuales.

---

## 📁 Estructura de Archivos Modulares

```text
/finanzasapp/
├── index.html                  # Punto de entrada único responsive
├── README.md                   # Esta documentación
├── css/
│   ├── styles.css              # Variables de diseño, tipografía y estilos base
│   ├── dark-mode.css           # Paleta completa de Modo Oscuro
│   └── responsive.css          # Breakpoints para Desktop, Tablet y Móvil
└── js/
    ├── app.js                  # Núcleo, estado reactivo, router y modales
    ├── theme.js                # Gestor de temas claro/oscuro/auto
    ├── dashboard.js            # Lógica de Overview, gráfica SVG y cuentas
    ├── accounts.js             # Módulo de cuentas y transferencias
    ├── transactions.js         # Módulo de movimientos y filtros
    ├── budget.js               # Presupuestos por categoría y alertas
    ├── goals.js                # Metas de ahorro y aportes
    ├── reports.js              # Reportes y comparativas mensuales
    └── ai.js                   # Asistente Finanzas AI
```

---

## 🚀 Cómo Ejecutar

1. **Directo en el Navegador (Sin Servidor)**:  
   Abre directamente el archivo `index.html` en cualquier navegador web moderno (Chrome, Edge, Safari, Firefox). Funciona al 100% con datos iniciales y persistencia local (`localStorage`).

2. **Como Web App o PWA en Celular / Laptop**:  
   Sirve la carpeta mediante cualquier servidor web local o cloud (ej. Node.js, Express, Render).

3. **Conversión a Android APK**:  
   Puede empaquetarse directamente con **Capacitor** o **Cordova**:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init FinanzasApp com.finanzas.app
   npx cap add android
   npx cap copy
   npx cap open android
   ```
