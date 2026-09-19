import * as FileSystem from 'expo-file-system';
import { deleteProject, getProject } from '../db/projects.repo';
import { listPinsForProject } from '../db/pins.repo';
import { queuePendingDelete } from '../db/pendingDeletes.repo';

async function removeProjectLocally(projectId: string): Promise<void> {
  const pins = await listPinsForProject(projectId);

  await deleteProject(projectId);

  await FileSystem.deleteAsync(`${FileSystem.documentDirectory}projects/${projectId}/`, {
    idempotent: true,
  });
  for (const pin of pins) {
    await FileSystem.deleteAsync(`${FileSystem.documentDirectory}pins/${pin.id}/`, {
      idempotent: true,
    });
  }
}

export async function deleteProjectCompletely(projectId: string): Promise<void> {
  const project = await getProject(projectId);
  if (project?.syncStatus === 'synced') {
    await queuePendingDelete(projectId, 'project');
  }
  await removeProjectLocally(projectId);
}

export async function applyRemoteProjectDeletion(projectId: string): Promise<void> {
  await removeProjectLocally(projectId);
}
