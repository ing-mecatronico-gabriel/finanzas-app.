# MANUAL DE SINCRONIZACIÓN EN LA NUBE Y ARQUITECTURA OFFLINE
### FinanzasApp — Sincronización Bidireccional Celular ↔ Nube ↔ Laptop

---

## 1. PREGUNTA FUNDAMENTAL

### ¿Necesito tener la laptop encendida para que funcione el celular?

# **RESPUESTA: NO.**

La laptop **NO** funciona como servidor.
La laptop **NO** almacena la única copia de la información.
La aplicación **NO** depende de que la laptop permanezca encendida, conectada ni en hibernación.

---

## 2. DIAGRAMA GENERAL DE SINCRONIZACIÓN

La arquitectura desacoplada opera mediante un servidor y base de datos centralizados en la nube:

```text
       📱 CELULAR
           │
           │  (WiFi / 4G / 5G)
           ▼
       INTERNET
           │
           ▼
 ☁️ SERVIDOR Y BASE DE DATOS EN LA NUBE (PostgreSQL / Supabase / REST API)
           ▲
           │
       INTERNET
           │
           │  (WiFi / Cable Ethernet)
           │
       💻 LAPTOP / COMPUTADOR
```

> **Principio de Funcionamiento**:  
> "La laptop puede estar completamente apagada durante horas, días o semanas. La sincronización ocurre siempre a través de la base de datos en la nube. Cuando enciendas la laptop y abras la aplicación, esta detectará conexión a Internet y descargará al instante todos los cambios registrados desde tu celular."

---

## 3. ESCENARIOS REALES DE USO

### Escenario A: Registro desde Celular con Laptop Apagada
1. **Lunes**: El usuario sale a la calle con su celular. La laptop está apagada y guardada en su maletín en casa.
2. El usuario registra 3 gastos desde el celular:
   - Gasto 1: Café ($5.000) en Efectivo.
   - Gasto 2: Almuerzo ($22.000) en Nequi.
   - Gasto 3: Supermercado ($85.000) en Bancolombia.
3. El celular envía inmediatamente estos 3 registros a la **base de datos en la nube**. Los datos quedan asegurados en los servidores cloud.
4. **Miércoles (2 días después)**: El usuario enciende su laptop por primera vez en la semana y abre FinanzasApp.
5. La laptop se conecta automáticamente a la API en la nube, descarga los 3 movimientos registrados el lunes y actualiza los saldos, gráficas y estadísticas sin intervención del usuario.

---

### Escenario B: Registro desde Laptop con Celular en Modo Avión / Apagado
1. El usuario está en su oficina utilizando la laptop y registra:
   - Ingreso: $1.200.000 (Pago de honorarios).
   - Nueva Tarjeta de Crédito: Visa Bancolombia (Cupo: $4.000.000).
2. La información viaja de la laptop hacia la base de datos en la nube.
3. El celular del usuario está apagado o sin batería.
4. Horas más tarde, el usuario enciende el celular.
5. En cuanto el celular detecta conexión a Internet (WiFi o datos móviles), realiza una petición `GET /api/sync/pull` al servidor, descarga el nuevo ingreso y la tarjeta, mostrando la información idéntica en ambas pantallas.

---

## 4. FUNCIONAMIENTO SIN CONEXIÓN A INTERNET (MODO OFFLINE)

¿Qué ocurre si el usuario está en el transporte público, sótano o carretera sin señal de celular?

FinanzasApp implementa una arquitectura **Offline-First**:

```text
MOVIMIENTOS EN CELULAR SIN INTERNET
         │
         ▼
[ COLA LOCAL PENDIENTE (IndexedDB / LocalStorage) ]
         │  (Almacena UUID, Timestamp UTC, Datos completos)
         │  (Actualiza saldos visuales de inmediato - Optimistic UI)
         ▼
¿SE RECUPERA LA CONEXIÓN A INTERNET?
         │
         ├───▶ [NO] ──▶ Sigue guardando localmente con indicador 🔴 Sin conexión
         │
         └───▶ [SÍ] ──▶ Evento 'online' del navegador
                         │
                         ▼
             🟡 SINCRONIZANDO EN SEGUNDO PLANO...
                         │
                         ▼
             POST /api/sync/push (Envía lote completo sin pérdidas)
                         │
                         ▼
             GET /api/sync/pull (Descarga cambios pendientes de otros equipos)
                         │
                         ▼
             🟢 SINCRONIZACIÓN COMPLETADA
```

### Indicadores Visuales de Conexión:
- 🟢 **Sincronizado**: Conectado a la nube. Todos los datos están al día.
- 🟡 **Sincronizando...**: Proceso de subida o descarga en curso.
- 🔴 **Sin conexión / Guardado local**: La aplicación funciona offline sin interrumpir al usuario. Al volver la señal, sincroniza automáticamente.

---

## 5. PROTOCOLO DE PREVENCIÓN DE CONFLICTOS (LWW)

Para evitar duplicaciones o inconsistencias si se modifica información desde dos dispositivos:
1. **Identificador Universal Único (UUID v4)**: Cada transacción, cuenta o deuda generada en cualquier dispositivo recibe un UUID irrepetible generado en el cliente (`id`). Nunca se generan IDs numéricos secuenciales que puedan colisionar.
2. **Marcas de Tiempo UTC (`created_at` y `updated_at`)**: Cada registro lleva la hora exacta en formato ISO 8601 UTC.
3. **Resolución Last-Write-Wins (LWW)**: Si un mismo registro es modificado en la laptop y en el celular, el servidor compara las marcas de tiempo y preserva la versión más reciente, notificando a ambos clientes.
4. **Borrado Lógico (Soft Delete)**: Las eliminaciones marcan `is_deleted = true`, permitiendo que los demás dispositivos reconozcan la eliminación sin provocar errores de integridad relacional.
