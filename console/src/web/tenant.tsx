import { useState } from 'react';
import { Button } from '@saplings/murphi-ui';

import type { ConfigPair, Project, Tenant } from '../contracts.js';
import { type consoleApi, download, parseJson, tenantPath } from './api.js';
import { FormError, JsonField, message, useForm, value } from './forms.js';
import { Gateway } from './gateway.js';
import { Identity } from './identity.js';

const tabs = ['Overview', 'Kingsman', 'Harbor', 'Configuration', 'Export'] as const;
type Tab = (typeof tabs)[number];

function ConfigEditor({
  config,
  save,
}: {
  config: ConfigPair;
  save: (config: unknown) => Promise<void>;
}) {
  const form = useForm();
  return (
    <section className="panel">
      <h2>Platform configuration</h2>
      <p>
        Edit any field in the native Kingsman and Harbor documents. Both documents must pass
        validation before the revision is saved. Store credentials as secret references.
      </p>
      <form
        onSubmit={form.submit(async (fields) =>
          save({
            kingsman: parseJson(value(fields, 'kingsman'), 'Kingsman configuration'),
            harbor: parseJson(value(fields, 'harbor'), 'Harbor configuration'),
          }),
        )}
      >
        <fieldset disabled={form.busy}>
          <div className="fields">
            <JsonField
              name="kingsman"
              label="Kingsman RealmConfig"
              initial={JSON.stringify(config.kingsman, null, 2)}
            />
            <JsonField
              name="harbor"
              label="Harbor GatewayConfig"
              initial={JSON.stringify(config.harbor, null, 2)}
            />
          </div>
          <FormError error={form.error} />
          <Button type="submit">Validate and save configuration</Button>
        </fieldset>
      </form>
    </section>
  );
}

function Export({
  config,
  project,
  tenant,
}: {
  config: ConfigPair;
  project: Project;
  tenant: Tenant;
}) {
  const prefix = project.id + '-' + tenant.id;
  return (
    <section className="panel">
      <h2>Export for SDK integration</h2>
      <p>
        Download the validated draft and commit the configuration with your application. Keep secret
        values in your runtime secret store.
      </p>
      <div className="actions">
        <Button type="button" onClick={() => download(prefix + '.saplings.json', config)}>
          Download bundle
        </Button>
        <Button
          type="button"
          variant="outlined"
          onClick={() => download('realm.json', config.kingsman)}
        >
          Download realm.json
        </Button>
        <Button
          type="button"
          variant="outlined"
          onClick={() => download('gateway.json', config.harbor)}
        >
          Download gateway.json
        </Button>
      </div>
      <ol className="instructions">
        <li>
          Load the individual files with <code>loadRealmConfig</code> and{' '}
          <code>loadGatewayConfig</code> in your application.
        </li>
        <li>
          Pass the configs to <code>platforms.kingsman</code> and <code>platforms.harbor</code> when
          you create your Saplings SDK instance.
        </li>
        <li>
          Supply your persistent identity store, password hasher, signing keys, and gateway
          dependencies. Verify the config in staging before you deploy.
        </li>
      </ol>
      <p className="muted">
        The bundle can be imported into another console tenant. Your running application applies the
        downloaded configuration through its own release process.
      </p>
    </section>
  );
}

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
  const [tab, setTab] = useState<Tab>('Overview');
  const [notice, setNotice] = useState('');
  const [reloadError, setReloadError] = useState('');
  const path = tenantPath(project.id, tenant.id);
  const { kingsman, harbor } = tenant;
  const routeCount = harbor.spec.services.reduce(
    (count, service) => count + service.routes.length,
    0,
  );
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
      {tab === 'Overview' && (
        <>
          <div className="summary-grid">
            <section className="panel summary">
              <h2>Kingsman</h2>
              <p className="summary-value">{kingsman.spec.clients.length}</p>
              <p>OIDC clients</p>
              <Button type="button" variant="outlined" onClick={() => setTab('Kingsman')}>
                Manage identity
              </Button>
            </section>
            <section className="panel summary">
              <h2>Harbor</h2>
              <p className="summary-value">{routeCount}</p>
              <p>Gateway routes</p>
              <Button type="button" variant="outlined" onClick={() => setTab('Harbor')}>
                Manage routes
              </Button>
            </section>
          </div>
          <section className="panel">
            <h2>Onboarding checklist</h2>
            <ol className="instructions">
              <li>
                <strong>Configure identity.</strong> Confirm the issuer for{' '}
                <code>{kingsman.metadata.name}</code> and add an OIDC client if your app signs users
                in.
              </li>
              <li>
                <strong>Register entry points.</strong> Map incoming Harbor routes to your
                application’s upstream services.
              </li>
              <li>
                <strong>Integrate the SDK.</strong> Export the validated revision, supply your
                runtime dependencies, and test the app in staging.
              </li>
            </ol>
            <Button type="button" variant="outlined" onClick={() => setTab('Export')}>
              Go to export
            </Button>
          </section>
        </>
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
        <Export project={project} tenant={tenant} config={{ kingsman, harbor }} />
      )}
      <footer className="workspace-footer">
        <Button
          type="button"
          variant="text"
          onClick={async () => {
            try {
              setReloadError('');
              setTenant(await api<Tenant>(path));
              setTab('Overview');
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
