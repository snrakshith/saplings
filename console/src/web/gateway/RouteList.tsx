import { Button } from '@saplings/murphi-ui';
import type { GatewayConfig } from '@saplings/harbor';
import type { RouteSelection } from './route-draft.js';

export function RouteList({
  config,
  edit,
}: {
  config: GatewayConfig;
  edit: (selection: RouteSelection) => void;
}) {
  const { services, upstreams } = config.spec;
  return services.length ? (
    <ul className="rows">
      {services.flatMap((service) =>
        service.routes.map((route) => (
          <li key={route.name}>
            <div>
              <strong>{route.name}</strong>
              <p>
                {route.paths.join(', ')} · {route.methods?.join(', ') || 'Any method'} ·{' '}
                {route.pathMatch ?? 'exact'}
              </p>
              <p>
                {service.name} →{' '}
                {upstreams
                  .find((upstream) => upstream.name === service.upstream)
                  ?.targets.map(({ target }) => target)
                  .join(', ')}
              </p>
            </div>
            <Button type="button" variant="outlined" onClick={() => edit({ service, route })}>
              Edit<span className="visually-hidden"> {route.name}</span>
            </Button>
          </li>
        )),
      )}
    </ul>
  ) : (
    <p className="muted">
      No routes saved. Add a path such as /api and the upstream that serves it.
    </p>
  );
}
