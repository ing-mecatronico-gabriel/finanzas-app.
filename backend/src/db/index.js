const fs = require('fs');
const path = require('path');
const config = require('../config');
const schemaSql = require('./schemaSql');

let pgPool = null;
let usePostgres = false;
let schemaInitPromise = null;

async function ensurePostgresSchema() {
  if (!usePostgres || !pgPool) return;
  if (!schemaInitPromise) {
    schemaInitPromise = pgPool.query(schemaSql)
      .then(() => {
        console.log('✅ Esquema PostgreSQL inicializado/verificado con éxito.');
      })
      .catch(err => {
        console.error('Error inicializando esquema PostgreSQL:', err.message);
        schemaInitPromise = null;
        throw err;
      });
  }
  return schemaInitPromise;
}

// Si existe DATABASE_URL, inicializar conexión a PostgreSQL
if (config.databaseUrl && config.databaseUrl.trim() !== '') {
  try {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    usePostgres = true;
    console.log('🔌 Modo de Base de Datos: PostgreSQL Nube / Supabase activado.');
    ensurePostgresSchema().catch(e => console.warn('Esquema warning:', e.message));
  } catch (err) {
    console.warn('⚠️ No se pudo inicializar driver PostgreSQL. Usando almacenamiento local.', err.message);
    usePostgres = false;
  }
} else {
  console.log('📁 Modo de Base de Datos: Almacenamiento Local JSON/Transaccional activo (DATABASE_URL no configurado).');
}

// Almacén local persistente para desarrollo y pruebas inmediatas
const dataDir = path.join(__dirname, '..', '..', 'data');
const dbFilePath = path.join(dataDir, 'finanzas_local.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const defaultState = {
  users: [],
  accounts: [],
  categories: [],
  transactions: [],
  credit_cards: [],
  debts: [],
  debt_payments: [],
  budgets: [],
  recurring_rules: [],
  sync_logs: []
};

function readLocalDb() {
  if (!fs.existsSync(dbFilePath)) {
    fs.writeFileSync(dbFilePath, JSON.stringify(defaultState, null, 2), 'utf-8');
    return JSON.parse(JSON.stringify(defaultState));
  }
  try {
    const content = fs.readFileSync(dbFilePath, 'utf-8');
    return JSON.parse(content || '{}');
  } catch (e) {
    return JSON.parse(JSON.stringify(defaultState));
  }
}

function writeLocalDb(data) {
  fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

let tableColumnsCache = {};

async function getTableColumns(tableName) {
  if (tableColumnsCache[tableName]) return tableColumnsCache[tableName];
  try {
    const res = await pgPool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [tableName]
    );
    if (res.rows && res.rows.length > 0) {
      tableColumnsCache[tableName] = new Set(res.rows.map(r => r.column_name));
      return tableColumnsCache[tableName];
    }
  } catch (e) {
    console.warn('Error fetching columns for table', tableName, e.message);
  }
  return null;
}

const db = {
  resetLocalDb() {
    writeLocalDb(JSON.parse(JSON.stringify(defaultState)));
  },

  isPostgres() {
    return usePostgres;
  },

  async query(sqlText, params = []) {
    if (usePostgres && pgPool) {
      await ensurePostgresSchema();
      return await pgPool.query(sqlText, params);
    }
    return { rows: [] };
  },

  // Operaciones de Colección Genéricas (Compatibilidad Dual)
  async find(collectionName, filter = {}) {
    if (usePostgres && pgPool) {
      await ensurePostgresSchema();
      const keys = Object.keys(filter).filter(k => filter[k] !== undefined);
      let query = `SELECT * FROM ${collectionName} WHERE 1=1`;
      const values = [];
      let paramIdx = 1;

      if (filter.is_deleted === undefined) {
        query += ` AND is_deleted = false`;
      } else if (filter.is_deleted !== null) {
        query += ` AND is_deleted = $${paramIdx++}`;
        values.push(filter.is_deleted);
      }

      keys.forEach((key) => {
        if (key === 'is_deleted') return;
        query += ` AND ${key} = $${paramIdx++}`;
        values.push(filter[key]);
      });
      const res = await pgPool.query(query, values);
      return res.rows;
    }

    const state = readLocalDb();
    const list = state[collectionName] || [];
    return list.filter(item => {
      if (filter.is_deleted === undefined) {
        if (item.is_deleted === true) return false;
      } else if (filter.is_deleted !== null) {
        if (item.is_deleted !== filter.is_deleted) return false;
      }

      for (const key of Object.keys(filter)) {
        if (key === 'is_deleted') continue;
        if (filter[key] !== undefined && item[key] !== filter[key]) return false;
      }
      return true;
    });
  },

  async findOne(collectionName, filter = {}) {
    const results = await this.find(collectionName, filter);
    return results.length > 0 ? results[0] : null;
  },

  async insert(collectionName, item) {
    const now = new Date().toISOString();
    const record = {
      ...item,
      created_at: item.created_at || now,
      updated_at: item.updated_at || now,
      is_deleted: item.is_deleted || false
    };

    if (usePostgres && pgPool) {
      await ensurePostgresSchema();
      const validCols = await getTableColumns(collectionName);
      const keys = Object.keys(record).filter(k => !validCols || validCols.has(k));
      const values = keys.map(k => record[k]);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const query = `INSERT INTO ${collectionName} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const res = await pgPool.query(query, values);
      return res.rows[0];
    }

    const state = readLocalDb();
    if (!state[collectionName]) state[collectionName] = [];
    state[collectionName].push(record);
    writeLocalDb(state);
    return record;
  },

  async update(collectionName, id, updates) {
    const now = new Date().toISOString();
    const updatedFields = {
      ...updates,
      updated_at: updates.updated_at || now
    };

    if (usePostgres && pgPool) {
      await ensurePostgresSchema();
      const validCols = await getTableColumns(collectionName);
      const keys = Object.keys(updatedFields).filter(k => !validCols || validCols.has(k));
      const values = keys.map(k => updatedFields[k]);
      values.push(id);
      const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const query = `UPDATE ${collectionName} SET ${setClause} WHERE id = $${values.length} RETURNING *`;
      const res = await pgPool.query(query, values);
      return res.rows[0];
    }

    const state = readLocalDb();
    const list = state[collectionName] || [];
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return null;

    list[index] = { ...list[index], ...updatedFields };
    writeLocalDb(state);
    return list[index];
  },

  async softDelete(collectionName, id) {
    return await this.update(collectionName, id, { is_deleted: true });
  }
};

module.exports = db;
