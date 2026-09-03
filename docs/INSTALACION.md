# GUÍA DE INSTALACIÓN Y DESPLIEGUE — FINANZASAPP

Este documento explica paso a paso cómo poner en marcha FinanzasApp en tu entorno local y cómo desplegar el backend y la base de datos en la nube para sincronizar tus dispositivos desde cualquier lugar del mundo.

---

## 1. PUESTA EN MARCHA LOCAL (EN TU COMPUTADOR)

### Requisitos Previos:
- **Node.js**: Versión 18 o superior instalada.
- Navegador web moderno (Chrome, Edge, Firefox o Safari).

### Pasos:
1. Abre una terminal (PowerShell o CMD) en la carpeta del backend:
   ```bash
   cd FinanzasApp/backend
   ```
2. Instala las dependencias (si aún no lo has hecho):
   ```bash
   npm install
   ```
3. Ejecuta la suite de pruebas obligatorias para verificar que todo el sistema opere al 100%:
   ```bash
   npm test
   ```
4. Inicia el servidor de FinanzasApp:
   ```bash
   npm start
   ```
5. Abre en tu navegador:
   - **Portal General**: `http://localhost:3000`
   - **Versión Laptop / Desktop**: `http://localhost:3000/desktop`
   - **Versión Móvil (Emulador / Celular)**: `http://localhost:3000/mobile`

---

## 2. CONECTAR TU CELULAR A LA APLICACIÓN EN LA MISMA RED WIFI LOCAL

Si deseas probar la aplicación en tu celular sin subirla a la nube todavía:
1. En tu laptop, averigua tu dirección IP local ejecutando en la terminal:
   ```powershell
   ipconfig
   ```
   (Busca la dirección IPv4, por ejemplo: `192.168.1.35`).
2. Asegúrate de que el celular y la laptop estén conectados a la misma red WiFi.
3. En el navegador de tu celular ingresa:
   `http://192.168.1.35:3000/mobile`
4. ¡Listo! Puedes agregarla a la pantalla de inicio como PWA y registrar transacciones que se verán en tu laptop.

---

## 3. DESPLIEGUE EN LA NUBE (PARA INDEPENDENCIA TOTAL)

Para que tu celular y laptop sincronicen desde cualquier lugar con 4G/5G y sin depender de que la laptop esté en la misma red ni encendida:

### Paso 1: Crear la Base de Datos PostgreSQL en Supabase (Gratis)
1. Ve a [Supabase.com](https://supabase.com) y crea una cuenta gratuita.
2. Crea un nuevo proyecto llamado `finanzas-db`.
3. Ve al menú **SQL Editor** en el panel de Supabase.
4. Abre el archivo `database/schema.sql` de este proyecto, copia todo su contenido y pégalo en el editor SQL de Supabase. Pulsa **Run**.
5. Opcional: Ejecuta también `database/seed.sql` si deseas precargar las categorías estándar.
6. Ve a **Project Settings > Database** y copia tu cadena de conexión (Connection String - URI):
   ```text
   postgresql://postgres.[ref]:[tu-password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
   ```

### Paso 2: Desplegar el Backend en Render o Railway (Gratis)
1. Crea una cuenta gratuita en [Render.com](https://render.com) o [Railway.app](https://railway.app).
2. Conecta tu repositorio o sube la carpeta `FinanzasApp`.
3. En la configuración del servicio web:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. En la pestaña **Environment Variables**, añade:
   - `DATABASE_URL` = (Pega aquí la cadena de conexión de Supabase que obtuviste en el Paso 1).
   - `JWT_SECRET` = (Cualquier clave aleatoria segura de al menos 32 caracteres).
   - `PORT` = `3000`
5. Render generará una URL pública segura con HTTPS (ejemplo: `https://mi-finanzas-app.onrender.com`).
6. Ahora puedes acceder desde tu celular a `https://mi-finanzas-app.onrender.com/mobile` y desde tu laptop a `https://mi-finanzas-app.onrender.com/desktop` con sincronización continua 24/7.

---

## 4. COPIAS DE SEGURIDAD Y RESTAURACIÓN (BACKUPS)

### Opción A: Respaldo Rápido desde la Interfaz
1. Abre la versión laptop de FinanzasApp.
2. Ve al menú **Informes & Exportación**.
3. Pulsa **"Exportar Respaldo JSON"** para descargar un archivo estructurado con todas tus cuentas, movimientos, tarjetas y deudas.

### Opción B: Respaldo Nativo de PostgreSQL
Para generar un dump completo de la base de datos:
```bash
pg_dump -h [host] -U postgres -d postgres -F c -b -v -f finanzas_backup.dump
```
Para restaurar una copia de seguridad:
```bash
pg_restore -h [host] -U postgres -d postgres -v finanzas_backup.dump
```

---

## 5. ACTUALIZACIÓN DEL SISTEMA
Para incorporar futuras actualizaciones de FinanzasApp:
1. Reemplaza los archivos actualizados en el servidor.
2. Ejecuta `npm install` si se han agregado nuevas dependencias.
3. Ejecuta `npm test` para certificar que todos los módulos siguen en óptimo estado.
4. Reinicia el servicio `node server.js`.
