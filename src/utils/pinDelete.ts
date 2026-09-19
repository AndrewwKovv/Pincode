import * as FileSystem from 'expo-file-system';
import { deletePin } from '../db/pins.repo';
import { queuePendingDelete } from '../db/pendingDeletes.repo';

async function removePinLocally(pinId: string): Promise<void> {
  await deletePin(pinId);
  await FileSystem.deleteAsync(`${FileSystem.documentDirectory}pins/${pinId}/`, { idempotent: true });
}

export async function deletePinCompletely(pinId: string, wasSynced: boolean): Promise<void> {
  if (wasSynced) {
    await queuePendingDelete(pinId, 'pin');
  }
  await removePinLocally(pinId);
}

export async function applyRemotePinDeletion(pinId: string): Promise<void> {
  await removePinLocally(pinId);
}
