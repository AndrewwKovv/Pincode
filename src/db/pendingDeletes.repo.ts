import { getDatabase } from './database';

export type EntityType = 'project' | 'pin';

export type PendingDelete = {
  id: string;
  entityType: EntityType;
};

export async function queuePendingDelete(id: string, entityType: EntityType): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO pending_deletes (id, entity_type, created_at) VALUES (?, ?, ?)',
    [id, entityType, new Date().toISOString()]
  );
}

export async function listPendingDeletes(): Promise<PendingDelete[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; entity_type: EntityType }>(
    'SELECT id, entity_type FROM pending_deletes'
  );
  return rows.map((row) => ({ id: row.id, entityType: row.entity_type }));
}

export async function clearPendingDelete(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM pending_deletes WHERE id = ?', [id]);
}
