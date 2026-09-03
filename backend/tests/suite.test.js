/**
 * SUITE DE PRUEBAS OBLIGATORIAS — FINANZASAPP
 * Ejecución de los 8 Escenarios de Sincronización y Lógica Financiera
 */

const assert = require('assert');
const http = require('http');

// Importar aplicación Express y capa de base de datos
const app = require('../server');
const db = require('../src/db');

// Reiniciar base de datos local para entorno de prueba limpio
db.resetLocalDb();

let server;
let port = 3999;
let baseUrl = `http://localhost:${port}/api`;
let authToken = '';
let testUser = null;

// Cuentas de prueba
let accountEfectivo = null;
let accountBanco = null;
let accountNequi = null;

function apiRequest(method, endpoint, body = null, token = authToken) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 INICIANDO SUITE DE PRUEBAS OBLIGATORIAS FINANZASAPP');
  console.log('======================================================\n');

  // Iniciar servidor en puerto alterno para tests
  await new Promise(resolve => {
    server = app.listen(port, resolve);
  });

  try {
    // 0. PREPARACIÓN: Registro de usuario y obtención de cuentas iniciales en $0
    console.log('--- PREPARACIÓN: Registro de usuario (Solo Usuario/Contraseña) ---');
    const testUsername = `user_${Date.now()}`;
    const regRes = await apiRequest('POST', '/auth/register', {
      username: testUsername,
      password: 'Password123!',
      name: 'Gabriel Test',
      currency: 'COP'
    });
    assert.strictEqual(regRes.status, 201, 'El registro de usuario debe retornar 201');
    authToken = regRes.data.token;
    testUser = regRes.data.user;
    console.log(`✅ Usuario @${testUsername} registrado exitosamente con token JWT (Sin correo)`);

    // Consultar cuentas iniciales y verificar que arrancan en CERO ($0)
    const accRes = await apiRequest('GET', '/accounts');
    assert.strictEqual(accRes.status, 200);
    const accounts = accRes.data.accounts;
    accountEfectivo = accounts.find(a => a.type.toLowerCase() === 'efectivo');
    accountBanco = accounts.find(a => a.type.toLowerCase() === 'bancaria');
    accountNequi = accounts.find(a => a.type.toLowerCase() === 'nequi');
    
    assert.strictEqual(accountEfectivo.balance, 0, 'La cuenta de Efectivo debe arrancar estrictamente en $0');
    assert.strictEqual(accountBanco.balance, 0, 'La cuenta Bancaria debe arrancar estrictamente en $0');
    console.log(`✅ Cuentas creadas limpias en $0: Efectivo ($${accountEfectivo.balance}), Bancaria ($${accountBanco.balance}), Billetera ($${accountNequi.balance})`);

    // Probar ingreso a Modo Administrador con usuario: 1, contraseña: 1
    const adminRes = await apiRequest('POST', '/auth/login', { username: '1', password: '1' });
    assert.strictEqual(adminRes.status, 200, 'Login admin con 1/1 debe ser 200');
    assert.strictEqual(adminRes.data.isAdmin, true, 'Debe reconocer rol de administrador');
    console.log('✅ Modo Administrador verificado exitosamente con Usuario: 1, Contraseña: 1\n');

    // ==========================================================
    // PRUEBA 1: Crear ingreso desde celular. Verificar en laptop.
    // ==========================================================
    console.log('🔹 PRUEBA 1: Crear ingreso desde celular. Verificar en laptop.');
    const mobileIncomeRes = await apiRequest('POST', '/transactions', {
      account_id: accountBanco.id,
      type: 'ingreso',
      amount: 500000,
      category: 'Salario',
      description: 'Ingreso quincenal registrado desde celular',
      payment_method: 'Transferencia',
      device_id: 'mobile-android-01'
    });
    assert.strictEqual(mobileIncomeRes.status, 201, 'Transacción móvil debe ser 201');
    console.log('   📱 Celular registró ingreso de $500.000');

    // Laptop consulta la base de datos en la nube
    const laptopCheck1 = await apiRequest('GET', `/transactions?accountId=${accountBanco.id}`);
    const foundIncome = laptopCheck1.data.transactions.find(t => t.id === mobileIncomeRes.data.transaction.id);
    assert.ok(foundIncome, 'Laptop debe encontrar la transacción creada desde el celular');
    assert.strictEqual(foundIncome.amount, 500000);
    console.log('   💻 Laptop verificó el ingreso en la base de datos en la nube.');
    console.log('   STATUS: 🟢 PRUEBA 1 SUPERADA EXITOSAMENTE\n');

    // ==========================================================
    // PRUEBA 2: Crear gasto desde laptop. Verificar en celular.
    // ==========================================================
    console.log('🔹 PRUEBA 2: Crear gasto desde laptop. Verificar en celular.');
    const laptopExpenseRes = await apiRequest('POST', '/transactions', {
      account_id: accountEfectivo.id,
      type: 'egreso',
      amount: 25000,
      category: 'Alimentación',
      subcategory: 'Almuerzo',
      description: 'Almuerzo ejecutivo registrado desde laptop',
      payment_method: 'Efectivo',
      device_id: 'laptop-windows-01'
    });
    assert.strictEqual(laptopExpenseRes.status, 201);
    console.log('   💻 Laptop registró gasto de $25.000 en Efectivo');

    // Celular consulta cambios desde la nube (Sync Pull)
    const mobileSyncRes = await apiRequest('GET', '/sync/pull?since=1970-01-01T00:00:00.000Z');
    assert.strictEqual(mobileSyncRes.status, 200);
    const pulledTx = mobileSyncRes.data.changes.transactions;
    const foundExpense = pulledTx.find(t => t.id === laptopExpenseRes.data.transaction.id);
    assert.ok(foundExpense, 'Celular debe descargar el gasto registrado en la laptop');
    assert.strictEqual(foundExpense.amount, 25000);
    console.log('   📱 Celular descargó y verificó el nuevo gasto.');
    console.log('   STATUS: 🟢 PRUEBA 2 SUPERADA EXITOSAMENTE\n');

    // ==========================================================
    // PRUEBA 3: Apagar laptop. Registrar gasto desde celular.
    //          Encender laptop. Conectarla a Internet. Verificar sincro.
    // ==========================================================
    console.log('🔹 PRUEBA 3: Simulación Laptop Apagada -> Celular registra gastos -> Laptop enciende y sincroniza.');
    console.log('   💻 [Simulación]: Laptop apagada / desconectada.');
    
    // Celular registra 2 gastos mientras la laptop no está presente
    const txMobile1 = await apiRequest('POST', '/transactions', {
      account_id: accountBanco.id,
      type: 'egreso',
      amount: 30000,
      category: 'Transporte',
      description: 'Gasolina',
      device_id: 'mobile-android-01'
    });
    const txMobile2 = await apiRequest('POST', '/transactions', {
      account_id: accountEfectivo.id,
      type: 'egreso',
      amount: 15000,
      category: 'Snacks',
      description: 'Cafetería',
      device_id: 'mobile-android-01'
    });
    console.log('   📱 Celular guardó 2 gastos en la nube ($30.000 y $15.000).');

    console.log('   💻 [Simulación]: Laptop se enciende y conecta a Internet.');
    const laptopSyncPull = await apiRequest('GET', `/sync/pull?since=${new Date(Date.now() - 60000).toISOString()}`);
    const transactionsDownloaded = laptopSyncPull.data.changes.transactions;
    assert.ok(transactionsDownloaded.some(t => t.id === txMobile1.data.transaction.id), 'Laptop debe descargar el gasto de gasolina');
    assert.ok(transactionsDownloaded.some(t => t.id === txMobile2.data.transaction.id), 'Laptop debe descargar el gasto de cafetería');
    console.log('   💻 Laptop descargó automáticamente los cambios ocurridos mientras estuvo apagada.');
    console.log('   STATUS: 🟢 PRUEBA 3 SUPERADA EXITOSAMENTE\n');

    // ==========================================================
    // PRUEBA 4: Dejar celular sin Internet. Registrar gasto.
    //          Recuperar Internet. Verificar sincronización.
    // ==========================================================
    console.log('🔹 PRUEBA 4: Celular sin Internet (Offline) -> Cola Local -> Reconexión -> Base de Datos.');
    console.log('   📱 [Simulación]: Celular en modo avión / sin conexión.');
    
    // Generación de transacción offline con UUID único
    const offlineTxId = 'offline-tx-' + Date.now();
    const offlineItem = {
      collection: 'transactions',
      data: {
        id: offlineTxId,
        account_id: accountNequi.id,
        type: 'egreso',
        amount: 45000,
        category: 'Entretenimiento',
        description: 'Cine registrado sin internet',
        payment_method: 'Nequi',
        date: new Date().toISOString().split('T')[0],
        time: '19:30:00',
        device_id: 'mobile-android-01',
        sync_status: 'pending',
        updated_at: new Date().toISOString()
      }
    };
    console.log('   📱 Celular guardó transacción en cola offline local con ID único:', offlineTxId);

    console.log('   📱 [Simulación]: Celular recupera conexión a Internet.');
    // Envío del lote de la cola al endpoint /sync/push
    const pushRes = await apiRequest('POST', '/sync/push', {
      device_id: 'mobile-android-01',
      items: [offlineItem]
    });
    assert.strictEqual(pushRes.status, 200);
    assert.strictEqual(pushRes.data.processed_count, 1, 'El servidor debió procesar exactamente 1 elemento');

    // Verificar que la transacción existe en la base de datos central
    const checkOffline = await apiRequest('GET', '/transactions');
    const syncedTx = checkOffline.data.transactions.find(t => t.id === offlineTxId);
    assert.ok(syncedTx, 'La transacción creada offline debe estar presente en el servidor');
    assert.strictEqual(syncedTx.amount, 45000);
    console.log('   ☁️ Base de datos central recibió y persistió la transacción offline sin duplicados.');
    console.log('   STATUS: 🟢 PRUEBA 4 SUPERADA EXITOSAMENTE\n');

    // ==========================================================
    // PRUEBA 5: Crear deuda desde laptop. Verificar en celular.
    // ==========================================================
    console.log('🔹 PRUEBA 5: Crear deuda desde laptop. Verificar en celular.');
    const debtRes = await apiRequest('POST', '/debts', {
      entity_person: 'Banco Davivienda',
      description: 'Préstamo educativo',
      initial_amount: 2000000,
      pending_amount: 2000000,
      monthly_installment: 200000,
      due_date: '2026-12-31',
      frequency: 'mensual',
      device_id: 'laptop-windows-01'
    });
    assert.strictEqual(debtRes.status, 201);
    const createdDebt = debtRes.data.debt;
    console.log('   💻 Laptop creó deuda de $2.000.000 con Banco Davivienda');

    // Celular consulta las deudas en la nube
    const mobileDebts = await apiRequest('GET', '/debts');
    const foundDebt = mobileDebts.data.debts.find(d => d.id === createdDebt.id);
    assert.ok(foundDebt, 'Celular debe visualizar la deuda creada desde la laptop');
    assert.strictEqual(foundDebt.pending_amount, 2000000);
    console.log('   📱 Celular confirmó la deuda en su panel.');
    console.log('   STATUS: 🟢 PRUEBA 5 SUPERADA EXITOSAMENTE\n');

    // ==========================================================
    // PRUEBA 6: Registrar abono a deuda desde celular.
    //          Verificar modificación de deuda en laptop.
    // ==========================================================
    console.log('🔹 PRUEBA 6: Registrar abono desde celular. Verificar modificación en laptop.');
    const payRes = await apiRequest('POST', `/debts/${createdDebt.id}/payments`, {
      amount: 500000,
      account_id: accountBanco.id,
      notes: 'Abono extraordinario desde app móvil',
      device_id: 'mobile-android-01'
    });
    assert.strictEqual(payRes.status, 201);
    console.log('   📱 Celular abonó $500.000 a la deuda.');

    // Laptop consulta la deuda actualizada
    const laptopDebts = await apiRequest('GET', '/debts');
    const updatedDebt = laptopDebts.data.debts.find(d => d.id === createdDebt.id);
    assert.strictEqual(updatedDebt.pending_amount, 1500000, 'El valor pendiente debe ser 1.500.000');
    assert.strictEqual(updatedDebt.status, 'en_proceso', 'El estado debe cambiar a en_proceso');
    console.log(`   💻 Laptop verificó que el saldo pendiente bajó a $${updatedDebt.pending_amount} (Estado: ${updatedDebt.status})`);
    console.log('   STATUS: 🟢 PRUEBA 6 SUPERADA EXITOSAMENTE\n');

    // ==========================================================
    // PRUEBA 7: Realizar transferencia entre cuentas.
    //          Verificar que NO sea contabilizada como ingreso ni egreso.
    // ==========================================================
    console.log('🔹 PRUEBA 7: Transferencia entre cuentas. Verificar neutralidad (No ingreso / No egreso).');
    // Consultar estadísticas de ingresos y egresos previas
    const statsBefore = (await apiRequest('GET', '/transactions')).data.stats;

    // Realizar transferencia de $100.000 de Banco a Nequi
    const transferRes = await apiRequest('POST', '/transactions', {
      account_id: accountBanco.id,
      to_account_id: accountNequi.id,
      type: 'transferencia',
      amount: 100000,
      description: 'Pasar plata de Bancolombia a Nequi',
      device_id: 'mobile-android-01'
    });
    assert.strictEqual(transferRes.status, 201);
    console.log('   ⇄ Transferencia de $100.000 realizada: Bancolombia → Nequi');

    // Consultar estadísticas posteriores
    const statsAfter = (await apiRequest('GET', '/transactions')).data.stats;
    assert.strictEqual(statsAfter.totalIncome, statsBefore.totalIncome, 'El total de ingresos NO debe cambiar por una transferencia');
    assert.strictEqual(statsAfter.totalExpense, statsBefore.totalExpense, 'El total de egresos NO debe cambiar por una transferencia');
    console.log(`   ✅ Ingresos totales antes: $${statsBefore.totalIncome} | después: $${statsAfter.totalIncome} (Sin alteración)`);
    console.log(`   ✅ Egresos totales antes: $${statsBefore.totalExpense} | después: $${statsAfter.totalExpense} (Sin alteración)`);
    console.log('   STATUS: 🟢 PRUEBA 7 SUPERADA EXITOSAMENTE\n');

    // ==========================================================
    // PRUEBA 8: Comprobar que los gráficos utilicen los datos reales.
    // ==========================================================
    console.log('🔹 PRUEBA 8: Comprobar que los gráficos utilicen datos reales de la base de datos.');
    const analyticsRes = await apiRequest('GET', '/reports/analytics');
    assert.strictEqual(analyticsRes.status, 200);
    const { metrics, charts, insights } = analyticsRes.data;

    assert.ok(charts.monthlyHistory.length > 0, 'Debe retornar el historial mensual real');
    assert.ok(charts.byCategory.labels.length > 0, 'Debe contener categorías reales con gastos');
    assert.ok(insights.length >= 4, 'Debe generar los diagnósticos con métricas reales');
    console.log('   📊 Categorías detectadas en gráficas:', charts.byCategory.labels.join(', '));
    console.log('   📊 Diagnóstico generado:', insights[1]);
    console.log('   📊 Total dinero disponible real:', formatCurrency(metrics.totalAvailable));
    console.log('   STATUS: 🟢 PRUEBA 8 SUPERADA EXITOSAMENTE\n');

    // ==========================================================
    // PRUEBA 9: Importación masiva desde Excel / CSV (createBatch)
    // ==========================================================
    console.log('🔹 PRUEBA 9: Importación de movimientos en lote desde Excel / CSV.');
    const batchData = [
      { date: '2026-04-05', type: 'ingreso', amount: 1500000, description: 'Salario Abril', category: 'Salario' },
      { date: '2026-04-10', type: 'egreso', amount: 350000, description: 'Mercado Quincenal', category: 'Alimentación' },
      { date: '2026-04-15', type: 'egreso', amount: 120000, description: 'Servicios Públicos', category: 'Servicios' }
    ];
    const batchRes = await apiRequest('POST', '/transactions/batch', {
      transactions: batchData,
      defaultAccountId: accountBanco.id
    });
    assert.strictEqual(batchRes.status, 201);
    assert.strictEqual(batchRes.data.count, 3);
    console.log(`   📊 Se importaron ${batchRes.data.count} transacciones exitosamente.`);
    console.log('   STATUS: 🟢 PRUEBA 9 SUPERADA EXITOSAMENTE\n');

    console.log('======================================================');
    console.log('🎉 TODAS LAS PRUEBAS OBLIGATORIAS PASARON CON ÉXITO');
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ ERROR EN PRUEBAS:', error);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
  }
}

function formatCurrency(amount) {
  return '$ ' + Math.round(amount || 0).toLocaleString('es-CO');
}

runTests();
