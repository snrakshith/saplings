import { DatabaseSync } from 'node:sqlite';

import type { ConfigPair, Project, ProjectSummary, Tenant, TenantSummary } from '../contracts.js';
import type { DomainId, SetupDraft, SetupValues, TenantSetup } from '../onboarding.js';
import type { SampleManifest } from './discovery/manifest.js';
import { reconcileSample } from './discovery/reconcile.js';
import { InputError } from './input.js';
import { consoleSchema } from './schema.js';

type TenantRow = TenantSummary & { revision: number; config: string };

export class ConsoleStore {
  private readonly db: DatabaseSync;

  constructor(file: string) {
    this.db = new DatabaseSync(file);
    this.db.exec(consoleSchema);
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

  setup(projectId: string, tenantId: string): TenantSetup {
    this.tenant(projectId, tenantId);
    const rows = this.db
      .prepare(
        'SELECT domain, revision, settings FROM tenant_setup WHERE project_id = ? AND tenant_id = ?',
      )
      .all(projectId, tenantId) as { domain: DomainId; revision: number; settings: string }[];
    return Object.fromEntries(
      rows.map(({ domain, revision, settings }) => [
        domain,
        { revision, values: JSON.parse(settings) as SetupValues },
      ]),
    );
  }

  saveSetup(
    projectId: string,
    tenantId: string,
    domain: DomainId,
    revision: number,
    values: SetupValues,
  ): SetupDraft {
    this.tenant(projectId, tenantId);
    const settings = JSON.stringify(values);
    const result =
      revision === 0
        ? this.db
            .prepare(
              `
        INSERT INTO tenant_setup (project_id, tenant_id, domain, revision, settings)
        VALUES (?, ?, ?, 1, ?) ON CONFLICT(project_id, tenant_id, domain) DO NOTHING
      `,
            )
            .run(projectId, tenantId, domain, settings)
        : this.db
            .prepare(
              `
        UPDATE tenant_setup SET settings = ?, revision = revision + 1
        WHERE project_id = ? AND tenant_id = ? AND domain = ? AND revision = ?
      `,
            )
            .run(settings, projectId, tenantId, domain, revision);
    if (!result.changes)
      throw new InputError('This setup changed elsewhere. Reload it before editing.', 409);
    return { revision: revision + 1, values };
  }

  syncSample(manifest: SampleManifest) {
    reconcileSample(this.db, this, manifest);
  }

  close() {
    this.db.close();
  }
}
