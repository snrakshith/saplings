import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { GatewayTlsPolicy } from '@saplings/harbor';
import { resolveTxt } from 'node:dns/promises';
import type { SaplingSDK } from './index.js';
import type { ActorContext, FeatureAdapter, JsonRecord } from './types.js';
import { EnvelopeCrypto } from './data.js';
import {
  atomic,
  fail,
  hash,
  insert,
  integer,
  object,
  page,
  read,
  strings,
  text,
  update,
} from './primitives.js';
import type { Row } from './primitives.js';
export interface OperationsSettings {
  backupCollections?: string[];
  pluginCatalog?: Record<string, { version: string; description: string }>;
  webhookSecrets?: Record<string, string>;
  notificationWebhookSecrets?: Record<string, string>;
  domainSuffixes?: string[];
  resolveDomain?: (hostname: string) => Promise<string[][]>;
  graphql?: {
    schema: string;
    execute: (
      ctx: ActorContext,
      input: { query: string; variables: JsonRecord; operationName?: string },
    ) => Promise<unknown>;
  };
  openapi?: JsonRecord;
  tlsTargets?: Record<string, string>;
  readiness?: Record<string, () => Promise<void>>;
  domainControl?: {
    activate: (
      ctx: ActorContext,
      hostname: string,
    ) => Promise<{ active: boolean; certificateReady: boolean }>;
    remove: (ctx: ActorContext, hostname: string) => Promise<{ removed: boolean }>;
  };
  certificateControl?: (target: string, url: string) => Promise<{ ready: boolean }>;
}
const privateCollections = new Set([
  'users',
  'sessions',
  'account-challenges',
  'mfa-factors',
  'oidc-states',
  'api-keys',
  'audit',
  'roles',
  'vault-secrets',
  'verified-payments',
  'payment-orders',
  'wallet-ledger',
  'invitations',
  'idempotency',
]);
const host = (v: unknown) => {
  const name = text(v, 'hostname', 253).toLowerCase();
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(name))
    return fail('Invalid hostname');
  return name;
};
export class Operations {
  constructor(
    private sdk: SaplingSDK,
    private settings: OperationsSettings = {},
  ) {}
  private cipher(id: string) {
    const key = this.sdk.config.services?.encryptionKey;
    if (!key) return fail('Encryption key required', 'CONFIG_REQUIRED', 503);
    return new EnvelopeCrypto(key, id);
  }
  async vault(c: ActorContext, action: string, i: JsonRecord) {
    const name = text(i.name, 'secret name', 100);
    if (!/^[A-Za-z0-9_.-]+$/.test(name)) return fail('Invalid secret name');
    const id = hash(name);
    const cipher = this.cipher('vault-v1:' + id);
    if (action === 'get') {
      const r = await read(this.sdk.store, c, 'vault-secrets', id);
      await this.sdk.audit.record(c, 'secret.access', 'vault', id);
      return { value: cipher.decrypt(c, object(r.encrypted)), version: r.version };
    }
    return atomic(this.sdk.store, c.tenantId, async (tx) => {
      const prev = await tx.get<Row>(c.tenantId, 'vault-secrets', id);
      if (action === 'rotate' && !prev) return fail('Secret not found', 'NOT_FOUND', 404);
      if (action === 'put' && prev) return fail('Use rotate for existing secret', 'CONFLICT', 409);
      const value = text(i.value, 'secret value', 100000);
      const version = Number(prev?.version ?? 0) + 1;
      await tx.put(c.tenantId, 'vault-secrets', {
        id,
        encrypted: cipher.encrypt(c, value),
        version,
        updatedAt: new Date().toISOString(),
      });
      return { name, version };
    });
  }
  async backup(c: ActorContext, action: string, i: JsonRecord) {
    const allowed = this.settings.backupCollections ?? [
      'organizations',
      'workspaces',
      'projects',
      'teams',
      'documents',
      'contacts',
      'tasks',
      'feedback',
    ];
    if (allowed.some((x) => privateCollections.has(x)))
      return fail('Protected collection in logical backup configuration');
    if (action === 'status') return page(this.sdk.store, c, 'logical-backups', i);
    if (action === 'backup') {
      const data = await atomic(this.sdk.store, c.tenantId, async (tx) => {
        const collections: Record<string, Row[]> = {};
        let total = 0;
        for (const collection of allowed) {
          const rows = await tx.list<Row>(c.tenantId, collection);
          total += rows.length;
          if (total > 5000) return fail('Logical snapshot limit exceeded', 'BACKUP_LIMIT', 413);
          collections[collection] = rows;
        }
        return collections;
      });
      const raw = JSON.stringify({ version: 1, tenantId: c.tenantId, collections: data });
      if (Buffer.byteLength(raw) > 600000)
        return fail('Logical snapshot size limit exceeded', 'BACKUP_LIMIT', 413);
      const id = randomUUID();
      const encrypted = this.cipher('logical-backup-v1').encrypt(c, raw);
      await this.sdk.store.put(c.tenantId, 'logical-backup-payloads', { id, encrypted });
      await insert(
        this.sdk.store,
        c,
        'logical-backups',
        {
          status: 'complete',
          collections: Object.keys(data),
          size: Buffer.byteLength(raw),
          createdBy: c.actorId,
        },
        id,
      );
      return { id, status: 'complete' };
    }
    if (i.confirm !== true) return fail('Explicit restore confirmation required');
    const payload = await read(this.sdk.store, c, 'logical-backup-payloads', i.id);
    const data = object(
      JSON.parse(this.cipher('logical-backup-v1').decrypt(c, object(payload.encrypted))),
    );
    if (data.tenantId !== c.tenantId || data.version !== 1) return fail('Invalid backup scope');
    const collections = object(data.collections);
    return atomic(this.sdk.store, c.tenantId, async (tx) => {
      let restored = 0;
      for (const [name, rows] of Object.entries(collections)) {
        if (!allowed.includes(name) || !Array.isArray(rows)) return fail('Collection not allowed');
        for (const row of rows) {
          const r = object(row);
          const id = text(r.id, 'record ID');
          if (await tx.get(c.tenantId, name, id))
            return fail('Restore would overwrite an existing record', 'CONFLICT', 409);
          await tx.put(c.tenantId, name, { ...r, id });
          restored++;
        }
      }
      return { restored, mode: 'merge-new-only' };
    });
  }
  async plugins(c: ActorContext, action: string, i: JsonRecord) {
    if (action === 'list') return page(this.sdk.store, c, 'installed-plugins', i);
    const name = text(i.name);
    const catalog = this.settings.pluginCatalog ?? {};
    if (action === 'install') {
      if (!Object.hasOwn(catalog, name))
        return fail('Plugin not in trusted catalog', 'FORBIDDEN', 403);
      await this.sdk.store.put(c.tenantId, 'installed-plugins', {
        id: name,
        ...catalog[name],
        enabled: true,
      });
      return { name, enabled: true };
    }
    return { removed: await this.sdk.store.delete(c.tenantId, 'installed-plugins', name) };
  }
  async domains(c: ActorContext, action: string, i: JsonRecord) {
    const name = host(i.hostname),
      id = hash(name);
    if (
      this.settings.domainSuffixes?.length &&
      !this.settings.domainSuffixes.some((s) => name === s || name.endsWith('.' + s))
    )
      return fail('Domain not permitted', 'FORBIDDEN', 403);
    if (action === 'remove') {
      const current = await read(this.sdk.store, c, 'custom-domains', id);
      if (current.status === 'active') {
        if (!this.settings.domainControl || i.confirm !== true)
          return fail(
            'Configured domain control and confirmation required',
            'CONFIG_REQUIRED',
            503,
          );
        if (!(await this.settings.domainControl.remove(c, name)).removed)
          return fail('Domain removal not verified', 'PROVIDER_FAILED', 502);
      }
      return { removed: await this.sdk.store.delete(c.tenantId, 'custom-domains', id) };
    }
    if (action === 'request') {
      const proof = randomBytes(24).toString('base64url');
      await this.sdk.store.put(c.tenantId, 'custom-domains', {
        id,
        hostname: name,
        proof,
        status: 'pending',
      });
      return { hostname: name, record: `_sapling-verification.${name}`, value: proof };
    }
    const r = await read(this.sdk.store, c, 'custom-domains', id);
    const values = await (this.settings.resolveDomain ?? resolveTxt)(
      `_sapling-verification.${name}`,
    );
    if (!values.some((v) => v.join('') === r.proof))
      return fail('Ownership not verified', 'FORBIDDEN', 403);
    if (action === 'activate') {
      if (!this.settings.domainControl || i.confirm !== true)
        return fail('Domain control and confirmation required', 'PROVIDER_REQUIRED', 503);
      const result = await this.settings.domainControl.activate(c, name);
      if (!result.active || !result.certificateReady)
        return fail('Routing or certificate not ready', 'PROVIDER_FAILED', 502);
      return update(this.sdk.store, c, 'custom-domains', id, {
        status: 'active',
        activatedAt: new Date().toISOString(),
      });
    }
    return update(this.sdk.store, c, 'custom-domains', id, {
      status: 'verified',
      verifiedAt: new Date().toISOString(),
    });
  }
  async webhook(c: ActorContext, action: string, i: JsonRecord, notification = false) {
    const source = text(i.source),
      secrets = notification
        ? this.settings.notificationWebhookSecrets
        : this.settings.webhookSecrets;
    if (!secrets || !Object.hasOwn(secrets, source))
      return fail('Webhook source not configured', 'FORBIDDEN', 403);
    const raw = text(i.rawBody, 'raw body', 1000000),
      signature = text(i.signature, 'signature', 64),
      timestamp = integer(i.timestamp, 'timestamp');
    if (!this.sdk.webhooks.verify(raw, secrets[source], timestamp, signature))
      return fail('Invalid webhook signature', 'UNAUTHENTICATED', 401);
    if (action === 'verify') return { valid: true };
    const payload = object(JSON.parse(raw));
    if (payload.tenantId !== c.tenantId) return fail('Signed tenant mismatch', 'FORBIDDEN', 403);
    const eventId = text(payload.id, 'signed event ID', 200),
      id = hash(source + ':' + eventId);
    return atomic(this.sdk.store, c.tenantId, async (tx) => {
      const collection = notification ? 'notification-callbacks' : 'webhook-inbox';
      if (await tx.get(c.tenantId, collection, id)) return { duplicate: true };
      if (notification) {
        const providerId = text(payload.providerId),
          status = text(payload.status);
        if (!['queued', 'sent', 'delivered', 'failed', 'bounced'].includes(status))
          return fail('Invalid delivery status');
        const delivery = (await tx.list<Row>(c.tenantId, 'notification-deliveries')).find(
          (r) => r.providerId === providerId,
        );
        if (!delivery) return fail('Unknown tenant delivery', 'NOT_FOUND', 404);
        if (
          ['delivered', 'bounced'].includes(String(delivery.status)) &&
          delivery.status !== status
        )
          return fail('Terminal delivery status', 'CONFLICT', 409);
        await tx.put(c.tenantId, 'notification-deliveries', { ...delivery, status });
      } else
        await insert(tx, c, 'outbox', { type: `webhook.${source}`, payload, status: 'pending' });
      await tx.put(c.tenantId, collection, { id, source, receivedAt: new Date().toISOString() });
      return { processed: true };
    });
  }
  async graphql(c: ActorContext, action: string, i: JsonRecord) {
    const g = this.settings.graphql;
    if (!g) return fail('Application GraphQL executor required', 'CONFIG_REQUIRED', 503);
    if (action === 'schema') return { schema: g.schema };
    return g.execute(c, {
      query: text(i.query, 'query', 20000),
      variables: object(i.variables ?? {}),
      operationName: i.operationName === undefined ? undefined : text(i.operationName),
    });
  }
  openapi() {
    return (
      this.settings.openapi ?? {
        openapi: '3.1.0',
        info: { title: this.sdk.config.app.id, version: '0.6.0' },
        paths: {
          '/health': {
            get: { operationId: 'health', responses: { '200': { description: 'Health' } } },
          },
        },
      }
    );
  }
  generateClient() {
    const paths = object(this.openapi().paths);
    const operations: Record<string, { path: string; method: string }> = Object.create(null);
    for (const [path, methods] of Object.entries(paths)) {
      if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\'))
        return fail('Invalid OpenAPI path');
      for (const [method, operation] of Object.entries(object(methods))) {
        if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method))
          continue;
        const id = object(operation).operationId;
        if (typeof id !== 'string' || !id || Object.hasOwn(operations, id))
          return fail('Unique operationId required');
        operations[id] = { path, method: method.toUpperCase() };
      }
    }
    return {
      language: 'typescript',
      source: `const operations = ${JSON.stringify(operations, null, 2)} as const;\nexport type Operation = keyof typeof operations;\nexport async function call(base: string, op: Operation, options: {path?: Record<string,string>; query?: Record<string,string>; token?: string; body?: unknown; signal?: AbortSignal} = {}) {\n const spec = operations[op]; const root = new URL(base); if(root.protocol !== 'https:') throw new Error('HTTPS required');\n const path = spec.path.replace(/\\{([^}]+)\\}/g, (_, k) => {if(!options.path?.[k]) throw new Error('Missing path parameter'); return encodeURIComponent(options.path[k]);});\n const url = new URL(root.href.replace(/\\/$/, '') + path); for(const [k,v] of Object.entries(options.query ?? {})) url.searchParams.set(k,v);\n const response = await fetch(url,{method:spec.method,redirect:'error',signal:options.signal,headers:{...(options.token?{authorization:'Bearer '+options.token}:{}),...(options.body===undefined?{}:{'content-type':'application/json'})},body:options.body===undefined?undefined:JSON.stringify(options.body)}); if(!response.ok) throw new Error('HTTP '+response.status); return response.status===204?undefined:response.json();\n}\n`,
    };
  }
  async tls(action: string, i: JsonRecord) {
    if (action !== 'verify' && action !== 'configure') return fail('Unsupported TLS action');
    return new GatewayTlsPolicy({
      targets: this.settings.tlsTargets,
      certificateControl: this.settings.certificateControl,
    }).execute(action, i);
  }
}
