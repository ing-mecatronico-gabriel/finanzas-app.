# MANUAL DE USUARIO — FINANZASAPP
### Sistema de Gestión Financiera Personal Multiplataforma

Bienvenido al manual oficial de **FinanzasApp**. Este documento detalla paso a paso cómo instalar, configurar y operar la aplicación tanto en tu **celular** como en tu **computador / laptop**, aprovechando la base de datos centralizada en la nube y la sincronización bidireccional continua.

---

## 1. INSTALACIÓN Y ACCESO EN CELULAR (ANDROID / IOS)

FinanzasApp está desarrollada bajo el estándar **PWA (Progressive Web App)**, lo que permite instalarla directamente desde el navegador sin necesidad de tiendas intermediarias y con soporte completo sin conexión a Internet (Offline).

### Paso 1: Abrir la Aplicación en el Celular
1. Abre tu navegador web favorito en el celular (**Google Chrome** recomendado en Android, o **Safari** en iOS / iPhone).
2. Ingresa a la dirección web de la aplicación (por ejemplo: `https://tu-dominio-en-la-nube.com/mobile` o la IP local proporcionada por tu red `http://192.168.x.x:3000/mobile`).

### Paso 2: Instalar en la Pantalla de Inicio (Como App Nativa)
- **En Android (Google Chrome)**:
  1. Aparecerá un aviso emergente en la parte inferior o pulsa el botón **"Instalar App"** en la pestaña de Ajustes de la aplicación.
  2. Alternativamente, pulsa el menú de los tres puntos (`⋮`) en la esquina superior derecha del navegador.
  3. Selecciona la opción **"Agregar a la pantalla principal"** o **"Instalar aplicación"**.
  4. Confirma pulsando **"Instalar"**.
  5. Se creará un icono con el logotipo de FinanzasApp en tu menú de aplicaciones y pantalla de inicio. Al abrirlo, funcionará a pantalla completa sin barra de navegación del navegador, como una aplicación nativa de Android.

- **En iPhone / iPad (Safari)**:
  1. Pulsa el botón de **"Compartir"** (icono del cuadrado con flecha hacia arriba en la barra inferior de Safari).
  2. Desliza hacia abajo en el menú de opciones y selecciona **"Agregar al inicio"** (*Add to Home Screen*).
  3. Confirma el nombre y pulsa **"Agregar"**.

### Paso 3: Iniciar Sesión o Crear Cuenta
1. Al abrir la aplicación por primera vez, se mostrará la ventana de ingreso.
2. Si eres un usuario nuevo, selecciona la pestaña **"Registrarse"**, escribe tu nombre, correo electrónico y contraseña segura.
3. Se generarán automáticamente tus 3 cuentas iniciales sugeridas: **Efectivo**, **Bancolombia** y **Nequi**.

---

## 2. INSTALACIÓN Y ACCESO EN LAPTOP / COMPUTADOR

La versión para computador está diseñada para pantallas grandes (laptops, monitores de escritorio y ultrabooks), ofreciendo un Dashboard financiero analítico con gráficos interactivos, tablas avanzadas y herramientas de exportación.

### Paso 1: Abrir la Aplicación
1. Abre **Google Chrome**, **Microsoft Edge**, **Brave** o **Firefox**.
2. Ingresa a la URL del sistema: `https://tu-dominio-en-la-nube.com/desktop` (o `http://localhost:3000/desktop` en desarrollo local).

### Paso 2: Instalar como Aplicación de Escritorio (Opcional pero recomendado)
1. En la barra de direcciones del navegador (a la derecha, junto a la estrella de favoritos), aparecerá un icono de instalación (una pantalla con una flecha hacia abajo).
2. Haz clic en **"Instalar FinanzasApp"**.
3. La aplicación se abrirá en su propia ventana independiente y se agregará a tu menú Inicio / Barra de tareas de Windows, macOS o Linux.

---

## 3. GUÍA DE USO OPERATIVO DE LOS MÓDULOS

### 3.1 Registrar un Ingreso
- **En Celular**: Pulsa el botón flotante **(+)** en la parte inferior. Selecciona la pestaña **"Ingreso"**, escribe el monto (ej. `$500.000`), selecciona la cuenta receptora (ej. *Bancolombia*), la categoría (*Salario*, *Negocio*, etc.), escribe el concepto y pulsa **"Guardar Movimiento"**.
- **En Laptop**: En la cabecera superior pulsa el botón verde **"+ Nuevo Ingreso"**, completa los campos y pulsa **"Guardar Movimiento"**.
- El saldo de la cuenta receptora se incrementará de inmediato en la nube y en todos tus dispositivos.

### 3.2 Registrar un Gasto (Egreso)
- Pulsa el botón **(+)** o **"+ Nuevo Gasto"**.
- Ingresa el valor (ej. `$25.000`), selecciona la cuenta de donde sale el dinero (ej. *Efectivo*), elige la categoría (ej. *Alimentación / Restaurante*) y el método de pago.
- El saldo de la cuenta origen se descontará automáticamente y el gasto se sumará a tus estadísticas del mes.

### 3.3 Realizar Transferencias entre Cuentas (Neutras)
- Selecciona la opción **"Transferencia"**.
- Elige la **Cuenta Origen** (de donde sale el dinero) y la **Cuenta Destino** (hacia donde entra).
- *Regla Financiera*: Las transferencias **NO se contabilizan como ingreso ni como gasto**. Únicamente mueven el saldo entre tus bolsillos (ejemplo: retirar dinero del banco hacia efectivo en mano, o enviar dinero de Bancolombia hacia Nequi).

### 3.4 Mis Cuentas y Control de Efectivo Físico
- Puedes crear tantas cuentas como desees: *Efectivo*, *Cuentas de Ahorros*, *Corriente*, *Billeteras Digitales (Nequi, Daviplata)*, etc.
- Cada cuenta mantiene su saldo independiente. El efectivo físico se controla de manera autónoma para que siempre cuadre el dinero que tienes en el bolsillo.

### 3.5 Tarjetas de Crédito
- Accede a la sección **"Tarjetas de Crédito"** (en laptop) o pestaña **"Créditos"** (en celular).
- Registra tu tarjeta indicando: Banco, Nombre, Límite total de crédito (cupo), Cupo utilizado actual, Día de corte y Día límite de pago.
- La aplicación calculará automáticamente tu **Cupo Disponible** (`Límite - Utilizado`) y te alertará sobre tus fechas de corte.

### 3.6 Deudas y Abonos a Deudas
- Registra cualquier deuda o préstamo indicando la entidad acreedora o persona, el valor inicial y el valor pendiente actual.
- **Para registrar un pago o abono**:
  1. Haz clic en el botón **"Abonar"** junto a la deuda.
  2. Ingresa el monto a pagar y selecciona la cuenta desde la cual deseas descontar los fondos.
  3. El sistema reducirá el saldo pendiente de la deuda, descontará el dinero de tu cuenta bancaria o efectivo, y si la deuda llega a cero, su estado cambiará automáticamente a **"Pagada"**.

### 3.7 Presupuestos Semanales y Mensuales
- Configura límites de gasto mensuales o semanales (por categoría o de forma global).
- La aplicación comparará en tiempo real el **Presupuesto vs. el Gasto Real** acumulado, mostrándote una barra de progreso:
  - 🟢 **Verde**: Menos del 80% del presupuesto consumido.
  - 🟡 **Amarillo**: Entre el 80% y 99% (Alerta preventiva).
  - 🔴 **Rojo**: Presupuesto excedido (100% o más).

### 3.8 Informes y Exportación de Datos
- En la sección **"Informes & Exportación"** de la laptop puedes:
  - **Exportar a CSV**: Descarga una hoja de cálculo con todos los movimientos históricos estructurados para abrir en Microsoft Excel o Google Sheets.
  - **Exportar Respaldo JSON**: Genera una copia completa de seguridad de tu base de datos.
  - **Imprimir / Guardar en PDF**: Genera un reporte imprimible con gráficos y resúmenes.
