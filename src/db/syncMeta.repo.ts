import { getDatabase } from './database';

const LAST_PULL_KEY = 'last_pull_at';

export async function getLastPullAt(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM sync_meta WHERE key = ?', [
    LAST_PULL_KEY,
  ]);
  return row?.value ?? null;
}

export async function setLastPullAt(value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)', [LAST_PULL_KEY, value]);
}
