import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';

const DB_NAME = 'pincode.db';
const SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(SCHEMA_SQL);
  await migrateToSyncColumns(db);
  return db;
}

async function migrateToSyncColumns(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((row?.user_version ?? 0) >= SCHEMA_VERSION) return;

  for (const table of ['projects', 'pins', 'photos']) {
    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    const columnNames = new Set(columns.map((c) => c.name));

    if (!columnNames.has('company_id')) {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN company_id TEXT`);
    }
    if (!columnNames.has('updated_at')) {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`);
      await db.execAsync(`UPDATE ${table} SET updated_at = created_at WHERE updated_at = ''`);
    }
    if (!columnNames.has('version')) {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN version INTEGER NOT NULL DEFAULT 1`);
    }
    if (!columnNames.has('sync_status')) {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending'`);
    }
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
