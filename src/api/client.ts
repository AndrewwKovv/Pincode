import * as FileSystem from 'expo-file-system';
import { getToken } from '../auth/authStore';

// iOS Simulator shares the Mac's network stack, so localhost reaches the
// backend running on the same machine. A real device needs the Mac's LAN IP.
export const API_URL = 'http://localhost:8000';

export type RemoteUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company_id: string;
};

export type RemoteProject = {
  id: string;
  name: string;
  pdf_object_key: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  deleted: boolean;
};

export type RemotePin = {
  id: string;
  project_id: string;
  page_number: number;
  x: number;
  y: number;
  description: string;
  author_name: string;
  is_conflict: boolean;
  created_at: string;
  updated_at: string;
  version: number;
  deleted: boolean;
};

export type RemotePhoto = {
  id: string;
  pin_id: string;
  object_key: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  deleted: boolean;
};

export type SyncResponse = {
  server_time: string;
  projects: RemoteProject[];
  pins: RemotePin[];
  photos: RemotePhoto[];
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function authedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(body || `${res.status} ${res.statusText}`, res.status);
  }
  return res;
}

export async function login(email: string, password: string): Promise<string> {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new ApiError('Неверный email или пароль', res.status);
  const data = await res.json();
  return data.access_token as string;
}

export async function fetchMe(token: string): Promise<RemoteUser> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new ApiError('Не удалось получить профиль', res.status);
  return res.json();
}

export async function createRemoteProject(id: string, name: string): Promise<RemoteProject> {
  const res = await authedFetch('/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name }),
  });
  return res.json();
}

export async function uploadProjectPdf(projectId: string, localFileUri: string): Promise<void> {
  const form = new FormData();
  form.append('file', {
    uri: localFileUri,
    name: 'plan.pdf',
    type: 'application/pdf',
  } as unknown as Blob);
  await authedFetch(`/projects/${projectId}/pdf`, { method: 'POST', body: form });
}

export async function downloadProjectPdf(projectId: string, destPath: string): Promise<void> {
  const token = await getToken();
  await FileSystem.downloadAsync(`${API_URL}/projects/${projectId}/pdf`, destPath, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export async function fetchRemoteProject(id: string): Promise<RemoteProject> {
  const res = await authedFetch(`/projects/${id}`);
  return res.json();
}

export async function deleteRemoteProject(id: string): Promise<void> {
  await authedFetch(`/projects/${id}`, { method: 'DELETE' });
}

export async function createRemotePin(pin: {
  id: string;
  projectId: string;
  pageNumber: number;
  x: number;
  y: number;
  description: string;
}): Promise<RemotePin> {
  const res = await authedFetch('/pins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: pin.id,
      project_id: pin.projectId,
      page_number: pin.pageNumber,
      x: pin.x,
      y: pin.y,
      description: pin.description,
    }),
  });
  return res.json();
}

export async function updateRemotePin(id: string, description: string): Promise<RemotePin> {
  const res = await authedFetch(`/pins/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });
  return res.json();
}

export async function deleteRemotePin(id: string): Promise<void> {
  await authedFetch(`/pins/${id}`, { method: 'DELETE' });
}

export async function uploadPinPhoto(pinId: string, photoId: string, localFileUri: string): Promise<RemotePhoto> {
  const extension = localFileUri.split('.').pop() || 'jpg';
  const form = new FormData();
  form.append('photo_id', photoId);
  form.append('file', {
    uri: localFileUri,
    name: `photo.${extension}`,
    type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
  } as unknown as Blob);
  const res = await authedFetch(`/pins/${pinId}/photos`, { method: 'POST', body: form });
  return res.json();
}

export async function downloadPhotoFile(photoId: string, destPath: string): Promise<void> {
  const token = await getToken();
  await FileSystem.downloadAsync(`${API_URL}/photos/${photoId}/file`, destPath, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export async function fetchSync(sinceIso: string | null): Promise<SyncResponse> {
  const query = sinceIso ? `?since=${encodeURIComponent(sinceIso)}` : '';
  const res = await authedFetch(`/sync${query}`);
  return res.json();
}
