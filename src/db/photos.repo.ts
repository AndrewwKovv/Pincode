import { getDatabase } from './database';
import { Photo, SyncStatus } from '../types/models';
import { generateId } from '../utils/ids';

type PhotoRow = {
  id: string;
  pin_id: string;
  local_file_path: string;
  remote_url: string | null;
  created_at: string;
  company_id: string | null;
  updated_at: string;
  version: number;
  sync_status: SyncStatus;
};

function mapRow(row: PhotoRow): Photo {
  return {
    id: row.id,
    pinId: row.pin_id,
    localFilePath: row.local_file_path,
    remoteUrl: row.remote_url,
    createdAt: row.created_at,
    companyId: row.company_id,
    updatedAt: row.updated_at,
    version: row.version,
    syncStatus: row.sync_status,
  };
}

export async function listPhotosForPin(pinId: string): Promise<Photo[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PhotoRow>(
    'SELECT * FROM photos WHERE pin_id = ? ORDER BY created_at ASC',
    [pinId]
  );
  return rows.map(mapRow);
}

export async function listPendingPhotos(): Promise<Photo[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PhotoRow>("SELECT * FROM photos WHERE sync_status = 'pending'");
  return rows.map(mapRow);
}

export async function addPhoto(
  pinId: string,
  localFilePath: string,
  companyId: string | null = null,
  overrides?: { id?: string; createdAt?: string }
): Promise<Photo> {
  const db = await getDatabase();
  const id = overrides?.id ?? generateId();
  const createdAt = overrides?.createdAt ?? new Date().toISOString();
  const updatedAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO photos (id, pin_id, local_file_path, remote_url, created_at, company_id, updated_at, version, sync_status)
     VALUES (?, ?, ?, NULL, ?, ?, ?, 1, 'pending')`,
    [id, pinId, localFilePath, createdAt, companyId, updatedAt]
  );
  return {
    id,
    pinId,
    localFilePath,
    remoteUrl: null,
    createdAt,
    companyId,
    updatedAt,
    version: 1,
    syncStatus: 'pending',
  };
}

export async function upsertPhotoFromRemote(photo: {
  id: string;
  pinId: string;
  localFilePath: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO photos (id, pin_id, local_file_path, remote_url, created_at, company_id, updated_at, version, sync_status)
     VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 'synced')
     ON CONFLICT(id) DO UPDATE SET
       updated_at = excluded.updated_at,
       version = excluded.version,
       sync_status = 'synced'`,
    [photo.id, photo.pinId, photo.localFilePath, photo.createdAt, photo.companyId, photo.updatedAt, photo.version]
  );
}

export async function markPhotoSynced(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE photos SET sync_status = 'synced' WHERE id = ?", [id]);
}

export async function getPhoto(id: string): Promise<Photo | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PhotoRow>('SELECT * FROM photos WHERE id = ?', [id]);
  return row ? mapRow(row) : null;
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM photos WHERE id = ?', [id]);
}
