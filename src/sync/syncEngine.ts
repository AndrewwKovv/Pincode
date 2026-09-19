import { getSession } from '../auth/authStore';
import * as api from '../api/client';
import {
  getProject,
  listPendingProjects,
  markProjectSynced,
  upsertProjectFromRemote,
} from '../db/projects.repo';
import { listPendingPins, markPinSynced, upsertPinFromRemote } from '../db/pins.repo';
import { listPendingPhotos, markPhotoSynced, upsertPhotoFromRemote, deletePhoto } from '../db/photos.repo';
import { listPendingDeletes, clearPendingDelete } from '../db/pendingDeletes.repo';
import { getLastPullAt, setLastPullAt } from '../db/syncMeta.repo';
import { ensurePinDir, ensureProjectDir, fileExists, pinPhotoPath, projectPdfPath } from '../utils/files';
import { applyRemoteProjectDeletion } from '../utils/projectDelete';
import { applyRemotePinDeletion } from '../utils/pinDelete';

let isSyncing = false;

export async function syncNow(): Promise<void> {
  if (isSyncing) return;
  const session = await getSession();
  if (!session) return;

  isSyncing = true;
  try {
    await pushDeletes();
    await pushProjects();
    await pushPins();
    await pushPhotos();
    await pullChanges(session.companyId);
  } catch (error) {
    console.warn('[sync] failed', error);
  } finally {
    isSyncing = false;
  }
}

async function pushDeletes(): Promise<void> {
  const deletes = await listPendingDeletes();
  for (const item of deletes) {
    try {
      if (item.entityType === 'project') {
        await api.deleteRemoteProject(item.id);
      } else {
        await api.deleteRemotePin(item.id);
      }
      await clearPendingDelete(item.id);
    } catch (error) {
      if (error instanceof api.ApiError && error.status === 404) {
        // Already gone on the server — nothing left to do.
        await clearPendingDelete(item.id);
      }
      // Any other error: leave it queued, retry on the next sync pass.
    }
  }
}

async function pushProjects(): Promise<void> {
  const projects = await listPendingProjects();
  for (const project of projects) {
    try {
      if (!(await fileExists(project.pdfFilePath))) {
        console.warn(`[sync] skipping project ${project.id}: local PDF is missing`);
        continue;
      }
      await api.createRemoteProject(project.id, project.name);
      await api.uploadProjectPdf(project.id, project.pdfFilePath);
      await markProjectSynced(project.id);
    } catch (error) {
      console.warn(`[sync] failed to push project ${project.id}`, error);
    }
  }
}

async function pushPins(): Promise<void> {
  const pins = await listPendingPins();
  for (const pin of pins) {
    try {
      await api.createRemotePin({
        id: pin.id,
        projectId: pin.projectId,
        pageNumber: pin.pageNumber,
        x: pin.x,
        y: pin.y,
        description: pin.description,
      });
      await markPinSynced(pin.id);
    } catch (error) {
      console.warn(`[sync] failed to push pin ${pin.id}`, error);
    }
  }
}

async function pushPhotos(): Promise<void> {
  const photos = await listPendingPhotos();
  for (const photo of photos) {
    try {
      if (!(await fileExists(photo.localFilePath))) {
        console.warn(`[sync] skipping photo ${photo.id}: local file is missing`);
        continue;
      }
      await api.uploadPinPhoto(photo.pinId, photo.id, photo.localFilePath);
      await markPhotoSynced(photo.id);
    } catch (error) {
      console.warn(`[sync] failed to push photo ${photo.id}`, error);
    }
  }
}

async function ensureProjectLocallyExists(projectId: string, companyId: string): Promise<void> {
  const existing = await getProject(projectId);
  if (existing) return;

  const remote = await api.fetchRemoteProject(projectId);
  await ensureProjectDir(remote.id);
  const localPath = projectPdfPath(remote.id);
  if (!(await fileExists(localPath))) {
    await api.downloadProjectPdf(remote.id, localPath);
  }
  await upsertProjectFromRemote({
    id: remote.id,
    name: remote.name,
    pdfFilePath: localPath,
    companyId,
    createdAt: remote.created_at,
    updatedAt: remote.updated_at,
    version: remote.version,
  });
}

async function pullChanges(companyId: string): Promise<void> {
  const since = await getLastPullAt();
  const response = await api.fetchSync(since);

  for (const project of response.projects) {
    if (project.deleted) {
      await applyRemoteProjectDeletion(project.id);
      continue;
    }
    await ensureProjectDir(project.id);
    const localPath = projectPdfPath(project.id);
    if (!(await fileExists(localPath))) {
      await api.downloadProjectPdf(project.id, localPath);
    }
    await upsertProjectFromRemote({
      id: project.id,
      name: project.name,
      pdfFilePath: localPath,
      companyId,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      version: project.version,
    });
  }

  for (const pin of response.pins) {
    if (pin.deleted) {
      await applyRemotePinDeletion(pin.id);
      continue;
    }
    await ensureProjectLocallyExists(pin.project_id, companyId);
    await upsertPinFromRemote({
      id: pin.id,
      projectId: pin.project_id,
      pageNumber: pin.page_number,
      x: pin.x,
      y: pin.y,
      description: pin.description,
      author: pin.author_name,
      companyId,
      createdAt: pin.created_at,
      updatedAt: pin.updated_at,
      version: pin.version,
    });
  }

  for (const photo of response.photos) {
    if (photo.deleted) {
      await deletePhoto(photo.id);
      continue;
    }
    await ensurePinDir(photo.pin_id);
    const filename = photo.object_key ? photo.object_key.split('/').pop()! : `${photo.id}.jpg`;
    const localPath = pinPhotoPath(photo.pin_id, filename);
    if (!(await fileExists(localPath))) {
      await api.downloadPhotoFile(photo.id, localPath);
    }
    await upsertPhotoFromRemote({
      id: photo.id,
      pinId: photo.pin_id,
      localFilePath: localPath,
      companyId,
      createdAt: photo.created_at,
      updatedAt: photo.updated_at,
      version: photo.version,
    });
  }

  await setLastPullAt(response.server_time);
}
