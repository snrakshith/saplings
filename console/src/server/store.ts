import { DatabaseSync } from 'node:sqlite';

import type { ConfigPair, Project, ProjectSummary, Tenant, TenantSummary } from '../contracts.js';
import { InputError } from './config.js';

type TenantRow = TenantSummary & { revision: number; config: string };

export class ConsoleStore {
  private readonly db: DatabaseSync;

  constructor(file: string) {
    this.db = new DatabaseSync(file);
    this.db.exec(`
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
    `);
  }

  projects(): ProjectSummary[] {
    const projects = this.db
      .prepare('SELECT id, name FROM projects ORDER BY name, id')
      .all() as unknown as Project[];
    const tenants = this.db
      .prepare('SELECT project_id, id, name FROM tenants ORDER BY name, id')
      .all() as unknown as (TenantSummary & { project_id: string })[];
    const grouped = new Map<string, TenantSummary[]>();
    for (const { project_id, id, name } of tenants) {
      const group = grouped.get(project_id) ?? [];
      group.push({ id, name });
      grouped.set(project_id, group);
    }
    return projects.map((project) => ({ ...project, tenants: grouped.get(project.id) ?? [] }));
  }

  project(id: string): Project {
    const row = this.db.prepare('SELECT id, name FROM projects WHERE id = ?').get(id);
    if (!row) throw new InputError('Project not found.', 404);
    return row as unknown as Project;
  }

  addProject(project: Project) {
    const result = this.db
      .prepare('INSERT INTO projects (id, name) VALUES (?, ?) ON CONFLICT(id) DO NOTHING')
      .run(project.id, project.name);
    if (!result.changes) throw new InputError('That project key is already in use.', 409);
    return project;
  }

  tenant(projectId: string, tenantId: string): Tenant {
    const row = this.db
      .prepare('SELECT id, name, config, revision FROM tenants WHERE project_id = ? AND id = ?')
      .get(projectId, tenantId) as TenantRow | undefined;
    if (!row) throw new InputError('Tenant not found in this project.', 404);
    const { config, ...tenant } = row;
    return { ...(JSON.parse(config) as ConfigPair), ...tenant };
  }

  addTenant(projectId: string, tenant: TenantSummary, pair: ConfigPair): Tenant {
    const result = this.db
      .prepare(
        `
      INSERT INTO tenants (project_id, id, name, config) VALUES (?, ?, ?, ?)
      ON CONFLICT(project_id, id) DO NOTHING
    `,
      )
      .run(projectId, tenant.id, tenant.name, JSON.stringify(pair));
    if (!result.changes)
      throw new InputError('That tenant key is already in use in this project.', 409);
    return { ...tenant, ...pair, revision: 1 };
  }

  saveTenant(projectId: string, tenantId: string, revision: number, pair: ConfigPair): Tenant {
    const tenant = this.tenant(projectId, tenantId);
    const result = this.db
      .prepare(
        `
      UPDATE tenants SET config = ?, revision = revision + 1
      WHERE project_id = ? AND id = ? AND revision = ?
    `,
      )
      .run(JSON.stringify(pair), projectId, tenantId, revision);
    if (!result.changes)
      throw new InputError('This draft changed elsewhere. Reload it before editing.', 409);
    return { id: tenant.id, name: tenant.name, ...pair, revision: revision + 1 };
  }

  close() {
    this.db.close();
  }
}
