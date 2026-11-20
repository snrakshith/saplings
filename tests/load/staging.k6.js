// Authorized dedicated staging only. Use seeded tenant-specific GET endpoints; no destructive calls.
import http from 'k6/http';
import { check, sleep } from 'k6';
const base = __ENV.STAGING_BASE_URL;
const token = __ENV.STAGING_TOKEN;
const resource = __ENV.STAGING_RESOURCE_PATH;
const forbidden = __ENV.STAGING_OTHER_TENANT_PATH;
if (
  __ENV.SAPLING_STAGING_CONFIRM !== 'yes' ||
  !base ||
  !base.startsWith('https://') ||
  !token ||
  !resource ||
  !forbidden ||
  !resource.startsWith('/') ||
  resource.startsWith('//') ||
  !forbidden.startsWith('/') ||
  forbidden.startsWith('//')
)
  throw Error('Configure approved staging URL, token, own and other tenant resource paths');
const profile = __ENV.LOAD_PROFILE ?? 'load';
const profiles = {
  load: [
    { duration: '1m', target: 10 },
    { duration: '5m', target: 30 },
    { duration: '1m', target: 0 },
  ],
  spike: [
    { duration: '30s', target: 10 },
    { duration: '10s', target: 80 },
    { duration: '1m', target: 80 },
    { duration: '30s', target: 0 },
  ],
  soak: [
    { duration: '2m', target: 20 },
    { duration: '60m', target: 20 },
    { duration: '2m', target: 0 },
  ],
};
if (!profiles[profile]) throw Error('Unknown profile');
export const options = {
  stages: profiles[profile],
  thresholds: {
    checks: ['rate==1'],
    'http_req_duration{kind:own}': ['p(95)<250', 'p(99)<1000'],
    'http_req_failed{kind:own}': ['rate<0.01'],
  },
  discardResponseBodies: true,
};
export default function () {
  const headers = { Authorization: `Bearer ${token}` };
  const a = http.get(base + resource, { headers, tags: { kind: 'own' }, redirects: 0 });
  check(a, { 'own record read succeeds': (r) => r.status === 200 });
  const b = http.get(base + forbidden, { headers, tags: { kind: 'other' }, redirects: 0 });
  check(b, { 'other tenant denied': (r) => r.status === 403 || r.status === 404 });
  sleep(1);
}
