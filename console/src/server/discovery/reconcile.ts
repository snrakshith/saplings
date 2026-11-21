import type { DatabaseSync } from 'node:sqlite';
import { isDeepStrictEqual } from 'node:util';

import { domainId, type DomainId } from '../../onboarding.js';
import type { ConsoleStore } from '../store.js';
import type { StarterManifest } from './manifest.js';

type Revisions = { platform: number; setup: Partial<Record<DomainId, number>> };

export function reconcileStarter(db: DatabaseSync, store: ConsoleStore, manifest: StarterManifest) {
  db.exec('BEGIN IMMEDIATE');
  try {
    reconcileDrafts(db, store, manifest);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function reconcileDrafts(
  db: DatabaseSync,
  store: ConsoleStore,
  { project, tenant, config, setup }: StarterManifest,
) {
  const row = db
    .prepare('SELECT revisions FROM sample_imports WHERE project_id = ? AND tenant_id = ?')
    .get(project.id, tenant.id);
  let revisions: Revisions;
  if (row) {
    revisions = JSON.parse(String(row.revisions)) as Revisions;
    const current = store.tenant(project.id, tenant.id);
    db.prepare('UPDATE projects SET name = ? WHERE id = ? AND name <> ?').run(
      project.name,
      project.id,
      project.name,
    );
    db.prepare('UPDATE tenants SET name = ? WHERE project_id = ? AND id = ? AND name <> ?').run(
      tenant.name,
      project.id,
      tenant.id,
      tenant.name,
    );
    const pair = { kingsman: current.kingsman, harbor: current.harbor };
    if (current.revision === revisions.platform && !isDeepStrictEqual(pair, config)) {
      revisions.platform = store.saveTenant(
        project.id,
        tenant.id,
        current.revision,
        config,
      ).revision;
    }
  } else {
    const exists = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(project.id);
    if (exists) return;
    store.addProject(project);
    revisions = { platform: store.addTenant(project.id, tenant, config).revision, setup: {} };
  }

  const drafts = store.setup(project.id, tenant.id);
  for (const [domain, values] of Object.entries(setup)) {
    if (!domainId(domain)) continue;
    const draft = drafts[domain];
    if (
      !draft ||
      (draft.revision === revisions.setup[domain] && !isDeepStrictEqual(draft.values, values))
    ) {
      revisions.setup[domain] = store.saveSetup(
        project.id,
        tenant.id,
        domain,
        draft?.revision ?? 0,
        values,
      ).revision;
    }
  }

  db.prepare(
    `
    INSERT INTO sample_imports (project_id, tenant_id, revisions) VALUES (?, ?, ?)
    ON CONFLICT(project_id, tenant_id) DO UPDATE SET revisions = excluded.revisions
    WHERE revisions <> excluded.revisions
  `,
  ).run(project.id, tenant.id, JSON.stringify(revisions));
}
