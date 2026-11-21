import { createHash, randomUUID } from 'node:crypto';
import type {
  Actor,
  ConfigStore,
  Definition,
  Revision,
  ReviewPolicy,
  Scope,
  Records,
} from './types.js';
import { ConfigError, document, scopedKey } from './validation.js';

export { ConfigError };
export type * from './types.js';

const heads = 'remote-config-heads';
const revisions = 'remote-config-revisions';
type Head = { id: string; latest: number; published: number | null };
const initial = (id: string): Head => ({ id, latest: 0, published: null });
const revisionId = (id: string, number: number) => JSON.stringify([id, number]);
const defaultPolicy = {
  development: 'operator',
  staging: 'distinct-reviewer',
  production: 'distinct-reviewer',
} as const;

export function createRemoteConfig(options: {
  store: ConfigStore;
  definitions: Readonly<Record<string, Definition>>;
  publicTenantId: string;
  reviewPolicy?: ReviewPolicy;
}) {
  const { store, publicTenantId, definitions, reviewPolicy = defaultPolicy } = options;
  const definition = (key: string) => {
    if (!Object.hasOwn(definitions, key)) throw new ConfigError('Unknown config document.', 404);
    return definitions[key];
  };
  function authorize(actor: Actor, key: string, permission: string) {
    if (!actor.actorId || !actor.permissions.includes(permission))
      throw new ConfigError('Config permission denied.', 403);
    if (definition(key).audience === 'public' && actor.tenantId !== publicTenantId)
      throw new ConfigError('Public config requires project-level access.', 403);
    return scopedKey(actor, key);
  }
  async function load(tx: Records, tenant: string, id: string, number: number) {
    const stored = await tx.get<Revision>(tenant, revisions, revisionId(id, number));
    if (!stored) throw new ConfigError('Config revision missing.', 404);
    return stored;
  }
  async function audit(
    tx: Records,
    actor: Actor,
    action: string,
    key: string,
    number: number,
    restoredFrom?: number,
  ) {
    await tx.put(actor.tenantId, 'audit', {
      id: randomUUID(),
      at: new Date().toISOString(),
      tenantId: actor.tenantId,
      actorId: actor.actorId,
      resourceType: 'remote-config',
      resourceId: key,
      action: 'config.' + action,
      detail: {
        projectId: actor.projectId,
        environment: actor.environment,
        revision: number,
        restoredFrom,
      },
    });
  }
  async function draft(
    actor: Actor,
    key: string,
    input: unknown,
    expected: number,
    restoredFrom?: number,
  ) {
    const id = authorize(actor, key, 'config:edit');
    const value = document(input);
    if (!definition(key).validate(value))
      throw new ConfigError('Config does not match its registered schema.');
    return store.transaction(actor.tenantId, async (tx) => {
      const head = (await tx.get<Head>(actor.tenantId, heads, id)) ?? initial(id);
      if (expected !== head.latest)
        throw new ConfigError('Config changed. Reload the revision.', 409);
      if (head.latest && (await load(tx, actor.tenantId, id, head.latest)).state === 'submitted')
        throw new ConfigError('Resolve the submitted revision before creating another draft.', 409);
      const number = head.latest + 1;
      const draft: Revision = {
        id: revisionId(id, number),
        number,
        base: head.published,
        state: 'draft',
        value,
        author: actor.actorId,
        at: new Date().toISOString(),
      };
      await tx.put(actor.tenantId, revisions, draft);
      await tx.put(actor.tenantId, heads, { ...head, latest: number });
      await audit(
        tx,
        actor,
        restoredFrom === undefined ? 'drafted' : 'restored',
        key,
        number,
        restoredFrom,
      );
      return draft;
    });
  }
  async function transition(
    actor: Actor,
    key: string,
    number: number,
    action: 'submit' | 'approve' | 'reject',
  ) {
    const id = authorize(actor, key, action === 'submit' ? 'config:edit' : 'config:review');
    return store.transaction(actor.tenantId, async (tx) => {
      const head = await tx.get<Head>(actor.tenantId, heads, id);
      if (!head || head.latest !== number)
        throw new ConfigError('Config changed. Reload the revision.', 409);
      const current = await load(tx, actor.tenantId, id, number);
      if (
        current.base !== head.published ||
        current.state !== (action === 'submit' ? 'draft' : 'submitted')
      )
        throw new ConfigError('Revision is no longer eligible for this transition.', 409);
      const policy =
        typeof reviewPolicy === 'string' ? reviewPolicy : reviewPolicy[actor.environment];
      if (policy !== 'operator' && policy !== 'distinct-reviewer')
        throw new ConfigError('Config review policy is invalid.', 500);
      if (
        action === 'approve' &&
        policy === 'distinct-reviewer' &&
        current.author === actor.actorId
      )
        throw new ConfigError('A reviewer distinct from the author is required.', 403);
      if (action === 'approve' && !definition(key).validate(current.value))
        throw new ConfigError('Config no longer matches its registered schema.', 409);
      const next: Revision = {
        ...current,
        state: action === 'submit' ? 'submitted' : action === 'approve' ? 'published' : 'rejected',
        ...(action !== 'submit' && { reviewer: actor.actorId }),
      };
      await tx.put(actor.tenantId, revisions, next);
      if (action === 'approve') await tx.put(actor.tenantId, heads, { ...head, published: number });
      await audit(tx, actor, action, key, number);
      return next;
    });
  }
  return {
    saveDraft: (actor: Actor, key: string, input: unknown, expected: number) =>
      draft(actor, key, input, expected),
    submit: (actor: Actor, key: string, number: number) => transition(actor, key, number, 'submit'),
    approve: (actor: Actor, key: string, number: number) =>
      transition(actor, key, number, 'approve'),
    reject: (actor: Actor, key: string, number: number) => transition(actor, key, number, 'reject'),
    async restore(actor: Actor, key: string, from: number, expected: number) {
      const id = authorize(actor, key, 'config:edit');
      const old = await load(store, actor.tenantId, id, from);
      if (old.state !== 'published')
        throw new ConfigError('Restore requires a previously published revision.', 409);
      return draft(actor, key, old.value, expected, from);
    },
    async history(actor: Actor, key: string, before?: number) {
      const id = authorize(actor, key, 'config:read');
      if (before !== undefined && (!Number.isSafeInteger(before) || before < 1))
        throw new ConfigError('Invalid revision cursor.');
      return store.transaction(actor.tenantId, async (tx) => {
        const head = (await tx.get<Head>(actor.tenantId, heads, id)) ?? initial(id);
        const start = Math.min(head.latest, (before ?? head.latest + 1) - 1);
        const versions = [];
        for (let n = start; n > Math.max(0, start - 25); n--)
          versions.push(await load(tx, actor.tenantId, id, n));
        return {
          latest: head.latest,
          published: head.published,
          publishedRevision: head.published
            ? await load(tx, actor.tenantId, id, head.published)
            : undefined,
          versions,
          next: start > 25 ? start - 24 : null,
        };
      });
    },
    async read(scope: Scope, key: string, audience: Definition['audience']) {
      if (definition(key).audience !== audience)
        throw new ConfigError('Unknown config document.', 404);
      if (audience === 'public' && scope.tenantId !== publicTenantId)
        throw new ConfigError('Unknown config document.', 404);
      const id = scopedKey(scope, key);
      const head = await store.get<Head>(scope.tenantId, heads, id);
      if (!head?.published) return;
      const version = await load(store, scope.tenantId, id, head.published);
      const etag =
        '"' +
        createHash('sha256')
          .update(JSON.stringify([scope.tenantId, id, version.number, version.value]))
          .digest('hex') +
        '"';
      return { revision: version.number, value: version.value, etag };
    },
  };
}
