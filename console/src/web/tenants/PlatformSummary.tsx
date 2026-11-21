import { Button } from '@saplings/murphi-ui';
import type { ConfigPair } from '../../contracts.js';

export function PlatformSummary({
  kingsman,
  harbor,
  onIdentity,
  onRoutes,
}: ConfigPair & {
  onIdentity: () => void;
  onRoutes: () => void;
}) {
  const routeCount = harbor.spec.services.reduce(
    (count, service) => count + service.routes.length,
    0,
  );
  return (
    <div className="summary-grid">
      <section className="panel summary">
        <h2>Kingsman</h2>
        <p className="summary-value">{kingsman.spec.clients.length}</p>
        <p>
          OIDC clients · <code>{kingsman.metadata.name}</code>
        </p>
        <Button type="button" variant="outlined" onClick={onIdentity}>
          Manage identity
        </Button>
      </section>
      <section className="panel summary">
        <h2>Harbor</h2>
        <p className="summary-value">{routeCount}</p>
        <p>Gateway routes</p>
        <Button type="button" variant="outlined" onClick={onRoutes}>
          Manage routes
        </Button>
      </section>
    </div>
  );
}
