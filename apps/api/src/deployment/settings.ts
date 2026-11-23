import { readFileSync } from 'node:fs';

export type DurableSettings = {
  origin: URL;
  databaseUrl: string;
  signingKey: string;
  visitorSecret: string;
};

export function starterProfile() {
  const profile = process.env.SAPLINGS_STARTER_PROFILE ?? 'local';
  if (profile !== 'local' && profile !== 'durable')
    throw new Error('SAPLINGS_STARTER_PROFILE must be local or durable.');
  if (profile === 'local' && process.env.NODE_ENV === 'production')
    throw new Error('Production requires SAPLINGS_STARTER_PROFILE=durable.');
  return profile;
}

export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(name + ' is required.');
  return value;
}

export function durableSettings(): DurableSettings {
  const origin = URL.parse(required('APP_ORIGIN'));
  if (
    !origin ||
    origin.protocol !== 'https:' ||
    origin.pathname !== '/' ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash
  )
    throw new Error('APP_ORIGIN must be an HTTPS origin.');
  const visitorSecret = required('SAPLINGS_VISITOR_SECRET');
  if (!/^[a-f0-9]{64}$/.test(visitorSecret))
    throw new Error('SAPLINGS_VISITOR_SECRET must contain 32 random bytes encoded as hex.');
  const databaseUrl = required('DATABASE_URL');
  const signingKey = readFileSync(required('SAPLINGS_SIGNING_KEY_FILE'), 'utf8');
  return { origin, databaseUrl, signingKey, visitorSecret };
}
