import { Button } from '@saplings/murphi-ui';
import type { ConfigPair, Project, Tenant } from '../../contracts.js';
import { download } from '../api.js';

export function ConfigExport({
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
