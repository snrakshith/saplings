import { useState } from 'react';
import { Button } from '@saplings/murphi-ui';
import type { Project, Tenant } from '../../contracts.js';
import { type consoleApi, message, tenantPath } from '../api.js';
import { FormError } from '../forms/FormError.js';
import { Gateway } from '../gateway/Gateway.js';
import { Identity } from '../identity/Identity.js';
import { TenantOnboarding } from '../onboarding/TenantOnboarding.js';
import { ConfigEditor } from './ConfigEditor.js';
import { ConfigExport } from './ConfigExport.js';
import { PlatformSummary } from './PlatformSummary.js';

const tabs = ['Onboarding', 'Kingsman', 'Harbor', 'Configuration', 'Export'] as const;
type Tab = (typeof tabs)[number];

export function TenantWorkspace({
  api,
  project,
  initial,
}: {
  api: ReturnType<typeof consoleApi>;
  project: Project;
  initial: Tenant;
}) {
  const [tenant, setTenant] = useState(initial);
  const [tab, setTab] = useState<Tab>('Onboarding');
  const [notice, setNotice] = useState('');
  const [reloadError, setReloadError] = useState('');
  const [onboardingRefresh, refreshOnboarding] = useState(0);
  const path = tenantPath(project.id, tenant.id);
  const { kingsman, harbor } = tenant;
  const save = async (config: unknown) => {
    setNotice('');
    const updated = await api<Tenant>(path, 'PUT', { revision: tenant.revision, config });
    setTenant(updated);
    setNotice('Configuration saved at revision ' + updated.revision + '.');
  };

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="breadcrumb">
            {project.name} <span>/</span> Tenants
          </p>
          <h1>{tenant.name}</h1>
          <p className="muted">{tenant.id}</p>
        </div>
        <span className="status">
          <span aria-hidden="true" /> Draft · revision {tenant.revision}
        </span>
      </header>
      <nav className="tabs" aria-label="Tenant settings">
        {tabs.map((name) => (
          <button
            key={name}
            type="button"
            aria-current={tab === name ? 'page' : undefined}
            onClick={() => {
              setTab(name);
              setNotice('');
            }}
          >
            {name}
          </button>
        ))}
      </nav>
      <div className="notice" role="status">
        {notice}
      </div>
      {tab === 'Onboarding' && (
        <TenantOnboarding
          key={onboardingRefresh}
          api={api}
          path={path}
          projectId={project.id}
          tenantId={tenant.id}
          platforms={
            <PlatformSummary
              kingsman={kingsman}
              harbor={harbor}
              onIdentity={() => setTab('Kingsman')}
              onRoutes={() => setTab('Harbor')}
            />
          }
        />
      )}
      {tab === 'Kingsman' && (
        <Identity config={kingsman} save={(config) => save({ kingsman: config, harbor })} />
      )}
      {tab === 'Harbor' && (
        <Gateway config={harbor} save={(config) => save({ kingsman, harbor: config })} />
      )}
      {tab === 'Configuration' && (
        <ConfigEditor key={tenant.revision} config={{ kingsman, harbor }} save={save} />
      )}
      {tab === 'Export' && (
        <ConfigExport project={project} tenant={tenant} config={{ kingsman, harbor }} />
      )}
      <footer className="workspace-footer">
        <Button
          type="button"
          variant="text"
          onClick={async () => {
            try {
              setReloadError('');
              setTenant(await api<Tenant>(path));
              refreshOnboarding((count) => count + 1);
              setTab('Onboarding');
              setNotice('Loaded the latest saved draft.');
            } catch (error) {
              setReloadError(message(error));
            }
          }}
        >
          Reload saved draft
        </Button>
        <FormError error={reloadError} />
      </footer>
    </>
  );
}
