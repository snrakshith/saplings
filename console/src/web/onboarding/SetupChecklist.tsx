import type { ReactNode } from 'react';
import { Button } from '@saplings/murphi-ui';
import { domains, type DomainId, type TenantSetup } from '../../onboarding.js';
import { download } from '../api.js';
import { areas, groups } from './sections.js';

export function SetupChecklist({
  drafts,
  next,
  select,
  projectId,
  tenantId,
  platforms,
}: {
  drafts: TenantSetup;
  next?: DomainId;
  select: (id: DomainId) => void;
  projectId: string;
  tenantId: string;
  platforms: ReactNode;
}) {
  const savedCount = areas.filter((id) => drafts[id]).length;
  return (
    <>
      <section className="panel">
        <div className="section-head top">
          <h2>Tenant onboarding checklist</h2>
          {savedCount > 0 && (
            <Button
              type="button"
              variant="outlined"
              onClick={() =>
                download(projectId + '-' + tenantId + '.setup.json', {
                  version: 1,
                  project: projectId,
                  tenant: tenantId,
                  setup: drafts,
                })
              }
            >
              Download setup drafts
            </Button>
          )}
        </div>
        <p>Configure identity and routing, then work through every SDK area for this tenant.</p>
        <div className="setup-progress">
          <p role="status">
            <strong>
              {savedCount} of {areas.length} SDK setup drafts saved
            </strong>
          </p>
          <progress aria-label="SDK setup drafts saved" value={savedCount} max={areas.length} />
        </div>
        {next && (
          <Button type="button" onClick={() => select(next)}>
            Continue with {domains[next].title}
          </Button>
        )}
        {savedCount === areas.length && (
          <p>
            All drafts are saved. Apply the examples and verify the setup in your staging
            application.
          </p>
        )}
      </section>
      {platforms}
      {groups.map(({ title, areas }) => (
        <section key={title} className="panel" aria-label={title}>
          <h2>{title}</h2>
          <ul className="rows">
            {areas.map((id) => (
              <li key={id}>
                <div>
                  <strong>{domains[id].title}</strong>
                  <p>{domains[id].summary}</p>
                  <p>{drafts[id] ? 'Draft saved' : 'Setup needed'}</p>
                </div>
                <Button type="button" variant="outlined" onClick={() => select(id)}>
                  {drafts[id] ? 'Edit ' : 'Set up '}
                  {domains[id].title}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
