import { useState } from 'react';
import { Button } from '@saplings/murphi-ui';
import type { GatewayConfig, GatewayRoute, GatewayServiceConfig } from '@saplings/harbor';

import { Field, FormError, lines, useForm, value } from './forms.js';

type RouteSelection = { service: GatewayServiceConfig; route: GatewayRoute };

export function Gateway({
  config,
  save,
}: {
  config: GatewayConfig;
  save: (config: GatewayConfig) => Promise<void>;
}) {
  const [editing, setEditing] = useState<RouteSelection | 'new'>();
  const [destination, setDestination] = useState('');
  const form = useForm();
  const remove = useForm();
  const { services, upstreams } = config.spec;
  const selected = editing === 'new' ? undefined : editing;

  const saveRoute = async (fields: FormData) => {
    const name = value(fields, 'routeName');
    const paths = lines(fields, 'paths');
    const methods = lines(fields, 'methods').map((method) => method.toUpperCase());
    if (methods.some((method) => !/^[A-Z]+$/.test(method)))
      throw new Error('Enter one HTTP method per line.');
    const route: GatewayRoute = {
      ...selected?.route,
      name,
      paths,
      methods: methods.length ? methods : undefined,
      pathMatch: value(fields, 'match') === 'exact' ? 'exact' : 'prefix',
      stripPath: fields.has('stripPath'),
    };
    const existing = selected?.service ?? (destination ? services[Number(destination)] : undefined);
    if (existing) {
      const routes = selected
        ? existing.routes.map((item) => (item.name === selected.route.name ? route : item))
        : [...existing.routes, route];
      await save({
        ...config,
        spec: {
          ...config.spec,
          services: services.map((item) => (item === existing ? { ...item, routes } : item)),
        },
      });
    } else {
      const serviceName = value(fields, 'serviceName');
      const target = value(fields, 'target');
      const upstreamName = serviceName + '-upstream';
      if (
        services.some((item) => item.name === serviceName) ||
        upstreams.some((item) => item.name === upstreamName)
      )
        throw new Error('That service or upstream name is already in use.');
      if (Number(target.split(':').at(-1)) === 0) throw new Error('Enter a nonzero upstream port.');
      await save({
        ...config,
        spec: {
          ...config.spec,
          upstreams: [...upstreams, { name: upstreamName, targets: [{ target }] }],
          services: [
            ...services,
            { name: serviceName, upstream: upstreamName, protocol: 'http', routes: [route] },
          ],
        },
      });
    }
    setEditing(undefined);
  };

  return (
    <section className="panel">
      <div className="section-head top">
        <h2>Harbor routing</h2>
        <Button
          type="button"
          onClick={() => {
            setDestination('');
            setEditing('new');
          }}
        >
          Add route
        </Button>
      </div>
      <p>
        Connect incoming paths to an HTTP service and upstream. Use Configuration to edit advanced
        routing, TLS, plugins, and consumers.
      </p>
      {services.length ? (
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
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => setEditing({ service, route })}
                >
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
      )}
      {editing && (
        <div className="editor">
          <h3>{selected ? 'Edit ' + selected.route.name : 'Register a route'}</h3>
          <form key={selected?.route.name ?? 'new'} onSubmit={form.submit(saveRoute)}>
            <fieldset disabled={form.busy}>
              {!selected && (
                <>
                  <Field label="Destination service">
                    <select
                      value={destination}
                      onChange={(event) => setDestination(event.target.value)}
                    >
                      <option value="">Create a service and upstream</option>
                      {services.map((service, index) => (
                        <option key={index} value={index}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {!destination && (
                    <div className="fields">
                      <Field label="Service name">
                        <input
                          name="serviceName"
                          required
                          placeholder="customer-api"
                          maxLength={100}
                        />
                      </Field>
                      <Field
                        label="Upstream target"
                        hint="Hostname or IP and port, without a scheme."
                      >
                        <input
                          name="target"
                          required
                          placeholder="api.internal:8080"
                          maxLength={300}
                        />
                      </Field>
                    </div>
                  )}
                </>
              )}
              <div className="fields">
                <Field label="Route name">
                  <input
                    name="routeName"
                    required
                    defaultValue={selected?.route.name}
                    placeholder="customers"
                    maxLength={100}
                  />
                </Field>
                <Field label="Path match">
                  <select name="match" defaultValue={selected?.route.pathMatch ?? 'exact'}>
                    <option value="prefix">Prefix</option>
                    <option value="exact">Exact</option>
                  </select>
                </Field>
                <Field label="Paths" hint="One path per line, starting with /.">
                  <textarea
                    name="paths"
                    required
                    rows={3}
                    placeholder="/api/customers"
                    defaultValue={selected?.route.paths.join('\n')}
                  />
                </Field>
                <Field label="HTTP methods" hint="One per line. Leave blank to accept any method.">
                  <textarea
                    name="methods"
                    rows={3}
                    placeholder="GET"
                    defaultValue={selected?.route.methods?.join('\n')}
                  />
                </Field>
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  name="stripPath"
                  defaultChecked={selected?.route.stripPath}
                />{' '}
                Strip the matched path before forwarding
              </label>
              <FormError error={form.error} />
              <div className="actions">
                <Button type="submit">Save route</Button>
                <Button type="button" variant="outlined" onClick={() => setEditing(undefined)}>
                  Cancel
                </Button>
              </div>
            </fieldset>
          </form>
          {selected && (
            <form
              onSubmit={remove.submit(async () => {
                const updated = services.flatMap((service) => {
                  if (service !== selected.service) return [service];
                  const routes = service.routes.filter((route) => route !== selected.route);
                  return routes.length ? [{ ...service, routes }] : [];
                });
                await save({ ...config, spec: { ...config.spec, services: updated } });
                setEditing(undefined);
              })}
            >
              <FormError error={remove.error} />
              <Button type="submit" variant="text" disabled={remove.busy || form.busy}>
                Remove route from draft
              </Button>
              {selected.service.routes.length === 1 && (
                <p className="muted">
                  Removing the last route also removes its service. The upstream remains in the
                  draft.
                </p>
              )}
            </form>
          )}
        </div>
      )}
    </section>
  );
}
