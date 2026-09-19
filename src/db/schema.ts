export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  pdf_file_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  company_id TEXT,
  updated_at TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS pins (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  company_id TEXT,
  updated_at TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY NOT NULL,
  pin_id TEXT NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  local_file_path TEXT NOT NULL,
  remote_url TEXT,
  created_at TEXT NOT NULL,
  company_id TEXT,
  updated_at TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS pending_deletes (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pins_project_page ON pins(project_id, page_number);
CREATE INDEX IF NOT EXISTS idx_photos_pin ON photos(pin_id);
`;
