import { getDatabase } from './database';
import { Project, SyncStatus } from '../types/models';

type ProjectRow = {
  id: string;
  name: string;
  pdf_file_path: string;
  created_at: string;
  company_id: string | null;
  updated_at: string;
  version: number;
  sync_status: SyncStatus;
};

function mapRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    pdfFilePath: row.pdf_file_path,
    createdAt: row.created_at,
    companyId: row.company_id,
    updatedAt: row.updated_at,
    version: row.version,
    syncStatus: row.sync_status,
  };
}

export async function listProjects(): Promise<Project[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ProjectRow>('SELECT * FROM projects ORDER BY created_at DESC');
  return rows.map(mapRow);
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ProjectRow>('SELECT * FROM projects WHERE id = ?', [id]);
  return row ? mapRow(row) : null;
}

export async function listPendingProjects(): Promise<Project[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ProjectRow>("SELECT * FROM projects WHERE sync_status = 'pending'");
  return rows.map(mapRow);
}

export async function createProject(
  id: string,
  name: string,
  pdfFilePath: string,
  companyId: string | null
): Promise<Project> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO projects (id, name, pdf_file_path, created_at, company_id, updated_at, version, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, 1, 'pending')`,
    [id, name, pdfFilePath, now, companyId, now]
  );
  return {
    id,
    name,
    pdfFilePath,
    createdAt: now,
    companyId,
    updatedAt: now,
    version: 1,
    syncStatus: 'pending',
  };
}

export async function upsertProjectFromRemote(project: {
  id: string;
  name: string;
  pdfFilePath: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO projects (id, name, pdf_file_path, created_at, company_id, updated_at, version, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       updated_at = excluded.updated_at,
       version = excluded.version,
       sync_status = 'synced'`,
    [
      project.id,
      project.name,
      project.pdfFilePath,
      project.createdAt,
      project.companyId,
      project.updatedAt,
      project.version,
    ]
  );
}

export async function markProjectSynced(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE projects SET sync_status = 'synced' WHERE id = ?", [id]);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM projects WHERE id = ?', [id]);
}
