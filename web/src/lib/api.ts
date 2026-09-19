export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "pincode_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function authedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Ошибка запроса: ${res.status}`);
  }
  return res;
}

export async function login(email: string, password: string): Promise<string> {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error("Неверный email или пароль");
  const data = await res.json();
  return data.access_token as string;
}

export type Project = {
  id: string;
  name: string;
  pdf_object_key: string | null;
  created_at: string;
  updated_at: string;
  version: number;
};

export type Pin = {
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
};

export type Photo = {
  id: string;
  pin_id: string;
  object_key: string | null;
  created_at: string;
  updated_at: string;
  version: number;
};

export async function fetchMe() {
  const res = await authedFetch("/auth/me");
  return res.json();
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await authedFetch("/projects");
  return res.json();
}

export async function fetchProject(id: string): Promise<Project> {
  const res = await authedFetch(`/projects/${id}`);
  return res.json();
}

export async function downloadProjectExport(projectId: string, projectName: string): Promise<void> {
  const res = await authedFetch(`/projects/${projectId}/export`);
  const text = await res.text();
  const safeName = projectName.trim().replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "project";

  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName}.pincode`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function importProjectFile(payloadText: string): Promise<Project> {
  const res = await authedFetch("/projects/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payloadText,
  });
  return res.json();
}

export async function renameProject(id: string, name: string): Promise<Project> {
  const res = await authedFetch(`/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  await authedFetch(`/projects/${id}`, { method: "DELETE" });
}

export async function fetchPins(projectId: string): Promise<Pin[]> {
  const res = await authedFetch(`/pins?project_id=${projectId}`);
  return res.json();
}

export async function fetchPhotos(pinId: string): Promise<Photo[]> {
  const res = await authedFetch(`/photos?pin_id=${pinId}`);
  return res.json();
}

export async function createPin(input: {
  projectId: string;
  pageNumber: number;
  x: number;
  y: number;
  description: string;
}): Promise<Pin> {
  const res = await authedFetch("/pins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      project_id: input.projectId,
      page_number: input.pageNumber,
      x: input.x,
      y: input.y,
      description: input.description,
    }),
  });
  return res.json();
}

export async function uploadPinPhoto(pinId: string, file: File): Promise<Photo> {
  const form = new FormData();
  form.append("file", file);
  const res = await authedFetch(`/pins/${pinId}/photos`, {
    method: "POST",
    body: form,
  });
  return res.json();
}

export async function updatePin(pinId: string, description: string): Promise<Pin> {
  const res = await authedFetch(`/pins/${pinId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });
  return res.json();
}

export async function deletePin(pinId: string): Promise<void> {
  await authedFetch(`/pins/${pinId}`, { method: "DELETE" });
}

export function pdfUrl(projectId: string): string {
  return `${API_URL}/projects/${projectId}/pdf`;
}

export function photoUrl(photoId: string): string {
  return `${API_URL}/photos/${photoId}/file`;
}
