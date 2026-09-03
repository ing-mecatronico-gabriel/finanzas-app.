# ☁️ GUÍA DE DESPLIEGUE EN LA NUBE (24/7 GRATIS)

Esta guía te permite colocar **FinanzasApp** en la nube en menos de 5 minutos, de modo que **tu celular funcione las 24 horas del día sin que la laptop tenga que estar encendida**.

---

## 🌟 OPCIÓN RECOMENDADA: RENDER.COM (100% Gratuito)
Render ofrece servidor Node.js y base de datos PostgreSQL en la nube de forma totalmente gratuita y sin requerir tarjeta de crédito.

### Paso 1: Crear cuenta en Render
1. Ve a [https://render.com](https://render.com) en tu navegador.
2. Haz clic en **"Sign Up"** (puedes ingresar directamente con tu cuenta de **Google** o **GitHub**).

### Paso 2: Subir el Proyecto a GitHub (o conectar repositorio)
1. Si tienes cuenta en [GitHub.com](https://github.com), crea un repositorio nuevo llamado `finanzas-app`.
2. Sube la carpeta de tu proyecto `FinanzasApp` a tu repositorio de GitHub.

### Paso 3: Desplegar automáticamente con 1 Clic (Blueprint)
1. En el panel de Render, haz clic en el botón superior **"New +"** y selecciona **"Blueprint"**.
2. Selecciona tu repositorio `finanzas-app`.
3. Render detectará automáticamente el archivo `render.yaml` que ya incluimos en el proyecto.
4. Verás que creará dos servicios en la nube:
   - 🗄️ **finanzas-db**: Base de datos PostgreSQL en la nube.
   - 🌐 **finanzas-app**: Servidor web Node.js con la API, el panel móvil y la app de laptop.
5. Haz clic en **"Apply"** (Crear).

### Paso 4: Obtener tu enlace público
En unos 2 minutos, Render te entregará tu dirección pública segura con HTTPS, por ejemplo:
`https://finanzas-app-xxxx.onrender.com`

---

## 📱 ¿CÓMO CONECTAR TUS DISPOSITIVOS A LA NUBE?

1. **En tu Celular**:
   - Abre Chrome o Safari y ve a:
     `https://finanzas-app-xxxx.onrender.com/mobile`
   - Instálala en la pantalla de inicio.
   - Inicia sesión.
2. **En tu Laptop**:
   - Abre tu navegador y ve a:
     `https://finanzas-app-xxxx.onrender.com/desktop`
   - Instálala en la barra de tareas.
   - Inicia sesión.

### 🎉 ¡RESULTADO FINAL!
- Tu servidor está en la nube las 24 horas.
- **Puedes apagar completamente la laptop.**
- Sal a la calle, haz compras y registra gastos desde tu celular con datos 4G/5G.
- Cuando vuelvas a encender la laptop en cualquier momento, verás tus finanzas sincronizadas al instante.
