export const consoleSchema = `
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, name TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS tenants (
  project_id TEXT NOT NULL REFERENCES projects(id),
  id TEXT NOT NULL, name TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  config TEXT NOT NULL CHECK (json_valid(config)),
  PRIMARY KEY (project_id, id)
) STRICT;
CREATE TABLE IF NOT EXISTS tenant_setup (
  project_id TEXT NOT NULL, tenant_id TEXT NOT NULL, domain TEXT NOT NULL,
  revision INTEGER NOT NULL,
  settings TEXT NOT NULL CHECK (json_valid(settings)),
  PRIMARY KEY (project_id, tenant_id, domain),
  FOREIGN KEY (project_id, tenant_id) REFERENCES tenants(project_id, id)
) STRICT;
`;
