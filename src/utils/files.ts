import * as FileSystem from 'expo-file-system';

export async function copyPdfToProjectStorage(sourceUri: string, projectId: string): Promise<string> {
  const dir = `${FileSystem.documentDirectory}projects/${projectId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const destination = `${dir}plan.pdf`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return destination;
}

export async function copyPhotoToPinStorage(sourceUri: string, pinId: string): Promise<string> {
  const dir = `${FileSystem.documentDirectory}pins/${pinId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const extension = sourceUri.split('.').pop() ?? 'jpg';
  const destination = `${dir}${Date.now()}.${extension}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return destination;
}

export async function writePdfFromBase64(base64: string, projectId: string): Promise<string> {
  const dir = `${FileSystem.documentDirectory}projects/${projectId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const destination = `${dir}plan.pdf`;
  await FileSystem.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });
  return destination;
}

export async function writePhotoFromBase64(base64: string, pinId: string, filename: string): Promise<string> {
  const dir = `${FileSystem.documentDirectory}pins/${pinId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const destination = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });
  return destination;
}

export async function getExportsDirectory(): Promise<string> {
  const dir = `${FileSystem.cacheDirectory}exports/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

export function projectPdfPath(projectId: string): string {
  return `${FileSystem.documentDirectory}projects/${projectId}/plan.pdf`;
}

export async function ensureProjectDir(projectId: string): Promise<void> {
  await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}projects/${projectId}/`, {
    intermediates: true,
  });
}

export function pinPhotoPath(pinId: string, filename: string): string {
  return `${FileSystem.documentDirectory}pins/${pinId}/${filename}`;
}

export async function ensurePinDir(pinId: string): Promise<void> {
  await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}pins/${pinId}/`, { intermediates: true });
}

export async function fileExists(path: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(path);
  return info.exists;
}
