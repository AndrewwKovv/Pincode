import { getDatabase } from './database';
import { Pin, SyncStatus } from '../types/models';
import { generateId } from '../utils/ids';

type PinRow = {
  id: string;
  project_id: string;
  page_number: number;
  x: number;
  y: number;
  description: string;
  author: string;
  created_at: string;
  company_id: string | null;
  updated_at: string;
  version: number;
  sync_status: SyncStatus;
};

function mapRow(row: PinRow): Pin {
  return {
    id: row.id,
    projectId: row.project_id,
    pageNumber: row.page_number,
    x: row.x,
    y: row.y,
    description: row.description,
    author: row.author,
    createdAt: row.created_at,
    companyId: row.company_id,
    updatedAt: row.updated_at,
    version: row.version,
    syncStatus: row.sync_status,
  };
}

export async function listPinsForProjectPage(projectId: string, pageNumber: number): Promise<Pin[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PinRow>(
    'SELECT * FROM pins WHERE project_id = ? AND page_number = ? ORDER BY created_at ASC',
    [projectId, pageNumber]
  );
  return rows.map(mapRow);
}

export async function listPinsForProject(projectId: string): Promise<Pin[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PinRow>(
    'SELECT * FROM pins WHERE project_id = ? ORDER BY page_number ASC, created_at ASC',
    [projectId]
  );
  return rows.map(mapRow);
}

export async function listPendingPins(): Promise<Pin[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PinRow>("SELECT * FROM pins WHERE sync_status = 'pending'");
  return rows.map(mapRow);
}

export async function createPin(
  projectId: string,
  pageNumber: number,
  x: number,
  y: number,
  description: string,
  author = 'Вы',
  companyId: string | null = null,
  overrides?: { id?: string; createdAt?: string }
): Promise<Pin> {
  const db = await getDatabase();
  const id = overrides?.id ?? generateId();
  const createdAt = overrides?.createdAt ?? new Date().toISOString();
  const updatedAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO pins (id, project_id, page_number, x, y, description, author, created_at, company_id, updated_at, version, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending')`,
    [id, projectId, pageNumber, x, y, description, author, createdAt, companyId, updatedAt]
  );
  return {
    id,
    projectId,
    pageNumber,
    x,
    y,
    description,
    author,
    createdAt,
    companyId,
    updatedAt,
    version: 1,
    syncStatus: 'pending',
  };
}

export async function upsertPinFromRemote(pin: {
  id: string;
  projectId: string;
  pageNumber: number;
  x: number;
  y: number;
  description: string;
  author: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO pins (id, project_id, page_number, x, y, description, author, created_at, company_id, updated_at, version, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
     ON CONFLICT(id) DO UPDATE SET
       description = excluded.description,
       x = excluded.x,
       y = excluded.y,
       updated_at = excluded.updated_at,
       version = excluded.version,
       sync_status = 'synced'`,
    [
      pin.id,
      pin.projectId,
      pin.pageNumber,
      pin.x,
      pin.y,
      pin.description,
      pin.author,
      pin.createdAt,
      pin.companyId,
      pin.updatedAt,
      pin.version,
    ]
  );
}

export async function markPinSynced(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE pins SET sync_status = 'synced' WHERE id = ?", [id]);
}

export async function deletePin(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM pins WHERE id = ?', [id]);
}
