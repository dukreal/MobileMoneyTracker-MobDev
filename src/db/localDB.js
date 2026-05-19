import * as SQLite from "expo-sqlite";

let db = null;
let dbInitPromise = null;

export async function initDB() {
  if (db) return db;
  if (dbInitPromise) return dbInitPromise;
  dbInitPromise = (async () => {
    try {
      const instance = await SQLite.openDatabaseAsync("moneytracker.db");
      await instance.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY, user_id TEXT, amount REAL, type TEXT,
          parent_category TEXT, sub_category TEXT, notes TEXT, image_urls TEXT,
          latitude REAL, longitude REAL, created_at TEXT,
          is_edited INTEGER DEFAULT 0, last_edited_at TEXT,
          original_amount REAL, original_notes TEXT, is_local INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS pending_ops (
          local_id TEXT PRIMARY KEY, op_type TEXT, payload TEXT, created_at TEXT
        );
      `);
      db = instance;
      return db;
    } catch (e) {
      console.warn("[DB] Failed to open database:", e.message);
      dbInitPromise = null;
      return null;
    }
  })();
  return dbInitPromise;
}

export async function cacheTransactions(userId, transactions) {
  const database = await initDB();
  if (!database) return;
  await database.runAsync("DELETE FROM transactions WHERE user_id = ?", [userId]);
  for (const tx of transactions) {
    await database.runAsync(
      `INSERT OR REPLACE INTO transactions
        (id, user_id, amount, type, parent_category, sub_category, notes,
         image_urls, latitude, longitude, created_at, is_edited, last_edited_at,
         original_amount, original_notes, is_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [tx.id, tx.user_id, tx.amount, tx.type, tx.parent_category, tx.sub_category,
       tx.notes, JSON.stringify(tx.image_urls ?? []), tx.latitude ?? null,
       tx.longitude ?? null, tx.created_at, tx.is_edited ? 1 : 0,
       tx.last_edited_at ?? null, tx.original_amount ?? null, tx.original_notes ?? null]
    );
  }
}

export async function getLocalTransactions(userId) {
  const database = await initDB();
  const rows = await database.getAllAsync(
    "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC", [userId]
  );
  return rows.map((row) => ({
    ...row,
    image_urls: (() => { try { return JSON.parse(row.image_urls ?? "[]"); } catch { return []; } })(),
    is_edited: row.is_edited === 1,
    is_local: row.is_local === 1,
  }));
}

export async function insertLocalTransaction(tx) {
  const database = await initDB();
  if (!database) return;
  await database.runAsync(
    `INSERT OR REPLACE INTO transactions
      (id, user_id, amount, type, parent_category, sub_category, notes,
       image_urls, latitude, longitude, created_at, is_local)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [tx.id, tx.user_id, tx.amount, tx.type, tx.parent_category, tx.sub_category,
     tx.notes ?? "", JSON.stringify(tx.image_urls ?? []),
     tx.latitude ?? null, tx.longitude ?? null, tx.created_at]
  );
}

export async function updateLocalTransaction(id, fields) {
  const database = await initDB();
  if (!database) return;
  await database.runAsync(
    `UPDATE transactions SET amount = ?, notes = ?, is_edited = 1,
       last_edited_at = ?, original_amount = COALESCE(original_amount, ?),
       original_notes = COALESCE(original_notes, ?) WHERE id = ?`,
    [fields.amount, fields.notes, fields.last_edited_at,
     fields.original_amount, fields.original_notes, id]
  );
}

export async function deleteLocalTransaction(id) {
  const database = await initDB();
  if (!database) return;
  await database.runAsync("DELETE FROM transactions WHERE id = ?", [id]);
}

export async function enqueuePendingOp(localId, opType, payload) {
  const database = await initDB();
  if (!database) return;
  await database.runAsync(
    `INSERT OR REPLACE INTO pending_ops (local_id, op_type, payload, created_at)
     VALUES (?, ?, ?, ?)`,
    [localId, opType, JSON.stringify(payload), new Date().toISOString()]
  );
}

export async function getPendingOps() {
  const database = await initDB();
  if (!database) return [];
  const rows = await database.getAllAsync(
    "SELECT * FROM pending_ops ORDER BY created_at ASC"
  );
  return rows.map((row) => ({ ...row, payload: JSON.parse(row.payload) }));
}

export async function removePendingOp(localId) {
  const database = await initDB();
  if (!database) return;
  await database.runAsync("DELETE FROM pending_ops WHERE local_id = ?", [localId]);
}

export async function getPendingCount() {
  const database = await initDB();
  if (!database) return 0;
  const result = await database.getFirstAsync("SELECT COUNT(*) as count FROM pending_ops");
  return result?.count ?? 0;
}