import * as FileSystem from 'expo-file-system';
import { Project } from '../types/models';
import { getProject, createProject } from '../db/projects.repo';
import { listPinsForProject, createPin } from '../db/pins.repo';
import { listPhotosForPin, addPhoto } from '../db/photos.repo';
import { generateId } from './ids';
import { writePdfFromBase64, writePhotoFromBase64, getExportsDirectory } from './files';
import { getSession } from '../auth/authStore';

const FORMAT_VERSION = 1;
const FILE_EXTENSION = '.pincode';

type ExportedPhoto = {
  id: string;
  filename: string;
  base64: string;
  createdAt: string;
};

type ExportedPin = {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  description: string;
  author: string;
  createdAt: string;
  photos: ExportedPhoto[];
};

type ExportedProjectFile = {
  formatVersion: number;
  exportedAt: string;
  project: { name: string; createdAt: string };
  pdfBase64: string;
  pins: ExportedPin[];
};

export function isPincodeFile(filename: string | null | undefined): boolean {
  return !!filename && filename.toLowerCase().endsWith(FILE_EXTENSION);
}

export async function exportProjectToFile(projectId: string): Promise<string> {
  const project = await getProject(projectId);
  if (!project) throw new Error('Проект не найден');

  const pdfBase64 = await FileSystem.readAsStringAsync(project.pdfFilePath, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const pins = await listPinsForProject(projectId);
  const exportedPins: ExportedPin[] = [];

  for (const pin of pins) {
    const photos = await listPhotosForPin(pin.id);
    const exportedPhotos: ExportedPhoto[] = [];
    for (const photo of photos) {
      const base64 = await FileSystem.readAsStringAsync(photo.localFilePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      exportedPhotos.push({
        id: photo.id,
        filename: photo.localFilePath.split('/').pop() ?? `${photo.id}.jpg`,
        base64,
        createdAt: photo.createdAt,
      });
    }
    exportedPins.push({
      id: pin.id,
      pageNumber: pin.pageNumber,
      x: pin.x,
      y: pin.y,
      description: pin.description,
      author: pin.author,
      createdAt: pin.createdAt,
      photos: exportedPhotos,
    });
  }

  const payload: ExportedProjectFile = {
    formatVersion: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    project: { name: project.name, createdAt: project.createdAt },
    pdfBase64,
    pins: exportedPins,
  };

  const exportsDir = await getExportsDirectory();
  const safeName = toAsciiFileName(project.name);
  const destination = `${exportsDir}${safeName}${FILE_EXTENSION}`;
  await FileSystem.writeAsStringAsync(destination, JSON.stringify(payload));
  return destination;
}

function toAsciiFileName(name: string): string {
  const ascii = name.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return ascii || 'project';
}

export async function importProjectFromFile(
  fileUri: string,
  resolveName?: (desiredName: string) => Promise<string | null>
): Promise<Project | null> {
  const raw = await FileSystem.readAsStringAsync(fileUri);
  let payload: ExportedProjectFile;
  try {
    payload = JSON.parse(raw) as ExportedProjectFile;
  } catch {
    throw new Error('Файл повреждён или это не файл проекта Pincode');
  }

  if (payload.formatVersion !== FORMAT_VERSION) {
    throw new Error('Неподдерживаемая версия файла проекта');
  }

  const finalName = resolveName ? await resolveName(payload.project.name) : payload.project.name;
  if (finalName === null) return null;

  const session = await getSession();
  const companyId = session?.companyId ?? null;

  const projectId = generateId();
  const pdfPath = await writePdfFromBase64(payload.pdfBase64, projectId);
  const project = await createProject(projectId, finalName, pdfPath, companyId);

  for (const pin of payload.pins) {
    const createdPin = await createPin(
      project.id,
      pin.pageNumber,
      pin.x,
      pin.y,
      pin.description,
      pin.author,
      companyId,
      { createdAt: pin.createdAt }
    );
    for (const photo of pin.photos) {
      const photoPath = await writePhotoFromBase64(photo.base64, createdPin.id, photo.filename);
      await addPhoto(createdPin.id, photoPath, companyId, { createdAt: photo.createdAt });
    }
  }

  return project;
}
