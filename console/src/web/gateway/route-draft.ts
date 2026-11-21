import type { GatewayConfig, GatewayRoute, GatewayServiceConfig } from '@saplings/harbor';
import { lines, value } from '../forms/values.js';

export type RouteSelection = { service: GatewayServiceConfig; route: GatewayRoute };

export function saveRouteDraft(
  config: GatewayConfig,
  fields: FormData,
  destination: string,
  selected?: RouteSelection,
): GatewayConfig {
  const { services, upstreams } = config.spec;
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
    return {
      ...config,
      spec: {
        ...config.spec,
        services: services.map((item) => (item === existing ? { ...item, routes } : item)),
      },
    };
  }
  const serviceName = value(fields, 'serviceName');
  const target = value(fields, 'target');
  const upstreamName = serviceName + '-upstream';
  if (
    services.some((item) => item.name === serviceName) ||
    upstreams.some((item) => item.name === upstreamName)
  )
    throw new Error('That service or upstream name is already in use.');
  if (Number(target.split(':').at(-1)) === 0) throw new Error('Enter a nonzero upstream port.');
  return {
    ...config,
    spec: {
      ...config.spec,
      upstreams: [...upstreams, { name: upstreamName, targets: [{ target }] }],
      services: [
        ...services,
        { name: serviceName, upstream: upstreamName, protocol: 'http', routes: [route] },
      ],
    },
  };
}

export function removeRouteDraft(config: GatewayConfig, selected: RouteSelection): GatewayConfig {
  const services = config.spec.services.flatMap((service) => {
    if (service !== selected.service) return [service];
    const routes = service.routes.filter((route) => route !== selected.route);
    return routes.length ? [{ ...service, routes }] : [];
  });
  return { ...config, spec: { ...config.spec, services } };
}
