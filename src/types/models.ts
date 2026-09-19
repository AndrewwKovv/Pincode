export type SyncStatus = 'pending' | 'synced';

export interface Project {
  id: string;
  name: string;
  pdfFilePath: string;
  createdAt: string;
  companyId: string | null;
  updatedAt: string;
  version: number;
  syncStatus: SyncStatus;
}

export interface Pin {
  id: string;
  projectId: string;
  pageNumber: number;
  x: number;
  y: number;
  description: string;
  author: string;
  createdAt: string;
  companyId: string | null;
  updatedAt: string;
  version: number;
  syncStatus: SyncStatus;
}

export interface Photo {
  id: string;
  pinId: string;
  localFilePath: string;
  remoteUrl: string | null;
  createdAt: string;
  companyId: string | null;
  updatedAt: string;
  version: number;
  syncStatus: SyncStatus;
}
