import { isDeepStrictEqual } from 'node:util';
import { compareActivity, nextOrder } from './order.js';
import type {
  Actor,
  Cohort,
  Event,
  EventInput,
  MinerStore,
  Records,
  Schema,
  Window,
} from './types.js';
import { collection, day, key, permission, props, reject, window } from './validation.js';

type Alias = { id: string; canonical: string };

export function createEngine(
  store: MinerStore,
  schemas: Readonly<Record<string, Schema>>,
  retentionDays: number,
  clock: () => number,
) {
  function names(actor: Actor) {
    return {
      events: collection(actor, 'events'),
      aliases: collection(actor, 'aliases'),
      cohorts: collection(actor, 'cohorts'),
      deleted: collection(actor, 'deleted'),
    };
  }
  async function track(actor: Actor, input: EventInput) {
    if (!actor.consent) return reject('Analytics consent is required.', 403);
    const { events, aliases, deleted } = names(actor);
    const id = key(input.id);
    const name = key(input.name);
    const schema = Object.hasOwn(schemas, name) ? schemas[name] : undefined;
    if (!schema) return reject('Event is not registered.');
    const properties = props(input.properties ?? {});
    for (const [name, value] of Object.entries(properties))
      if (!Object.hasOwn(schema, name) || typeof value !== schema[name])
        return reject('Event property does not match its schema.');
    const now = clock();
    if (input.at !== undefined && typeof input.at !== 'string')
      return reject('Event timestamp must be a string.');
    const time = input.at === undefined ? now : Date.parse(input.at);
    if (!Number.isFinite(time) || time < now - retentionDays * day || time > now + 60_000)
      return reject('Event timestamp is outside the accepted range.');
    const subject = key(actor.subject);
    return store.transaction(actor.tenantId, async (tx) => {
      const alias = await tx.get<Alias>(actor.tenantId, aliases, subject);
      if (
        (await tx.get(actor.tenantId, deleted, subject)) ||
        (alias && (await tx.get(actor.tenantId, deleted, alias.canonical)))
      )
        return reject('Subject data has been deleted.', 403);
      const old = await tx.get<Event>(actor.tenantId, events, id);
      if (old) {
        if (
          old.name !== name ||
          old.subject !== subject ||
          (input.at !== undefined && old.time !== time) ||
          !isDeepStrictEqual(old.properties, properties)
        )
          return reject('Event ID is already in use.', 409);
        return { duplicate: true };
      }
      const order = await nextOrder(tx, actor);
      await tx.put(actor.tenantId, events, { id, name, time, order, subject, properties });
      return { duplicate: false };
    });
  }
  async function identify(actor: Actor, anonymous: string) {
    if (!actor.consent || !actor.subject.startsWith('u:') || !anonymous.startsWith('a:'))
      return reject('Verified sign-in and consent are required.', 403);
    key(anonymous);
    key(actor.subject);
    const { aliases, deleted } = names(actor);
    await store.transaction(actor.tenantId, async (tx) => {
      const alias = await tx.get<Alias>(actor.tenantId, aliases, anonymous);
      if (alias && alias.canonical !== actor.subject)
        return reject('This anonymous identity is already linked.', 409);
      if (
        (await tx.get(actor.tenantId, deleted, anonymous)) ||
        (await tx.get(actor.tenantId, deleted, actor.subject))
      )
        return reject('Subject data has been deleted.', 403);
      if (!alias)
        await tx.put(actor.tenantId, aliases, { id: anonymous, canonical: actor.subject });
    });
  }
  async function canonicalSubjects(actor: Actor, tx: Records = store) {
    const aliases = await tx.list<Alias>(actor.tenantId, names(actor).aliases);
    return new Map(aliases.map((alias) => [alias.id, alias.canonical]));
  }
  async function events(actor: Actor, range: Window): Promise<Event[]> {
    window(range, retentionDays);
    const { events } = names(actor);
    const from = Math.max(range.from, clock() - retentionDays * day);
    const rows = store.minerEvents
      ? await store.minerEvents(actor, events, from, range.to, 50_001)
      : (await store.list<Event>(actor.tenantId, events)).filter(
          (row) => row.time >= from && row.time < range.to,
        );
    if (rows.length > 50_000) return reject('Choose a shorter time range.', 413);
    const aliases = await canonicalSubjects(actor);
    const canonical = rows
      .map((event) => ({ ...event, subject: aliases.get(event.subject) ?? event.subject }))
      .sort(compareActivity);
    if (!range.cohort) return canonical;
    const members = await cohortMembers(actor, range.cohort, range.to);
    return canonical.filter((row) => members.has(row.subject));
  }
  async function cohortMembers(
    actor: Actor,
    id: string,
    until = clock() + 1,
  ): Promise<Set<string>> {
    const cohort = await store.get<Cohort>(actor.tenantId, names(actor).cohorts, key(id));
    if (!cohort) return reject('Unknown cohort.', 404);
    const rows = await events(actor, { from: Math.max(0, until - cohort.days * day), to: until });
    const property = cohort.property;
    return new Set(
      rows
        .filter(
          (row) =>
            row.name === cohort.event &&
            (!property ||
              (Object.hasOwn(row.properties, property.key) &&
                row.properties[property.key] === property.equals)),
        )
        .map((row) => row.subject),
    );
  }
  async function saveCohort(actor: Actor, cohort: Cohort) {
    permission(actor, 'miner:admin');
    key(cohort.id);
    key(cohort.event);
    if (
      !Object.hasOwn(schemas, cohort.event) ||
      !Number.isInteger(cohort.days) ||
      cohort.days < 1 ||
      cohort.days > retentionDays
    )
      return reject('Invalid cohort.');
    if (cohort.property) props({ [cohort.property.key]: cohort.property.equals });
    await store.put(actor.tenantId, names(actor).cohorts, cohort);
    return cohort;
  }
  async function deleteSubject(actor: Actor, subject: string) {
    permission(actor, 'miner:privacy');
    key(subject);
    const { events, aliases, deleted } = names(actor);
    return store.transaction(actor.tenantId, async (tx) => {
      const links = await canonicalSubjects(actor, tx);
      const canonical = links.get(subject) ?? subject;
      const related = new Set([
        canonical,
        ...[...links].filter(([, to]) => to === canonical).map(([from]) => from),
      ]);
      for (const id of related) {
        await tx.put(actor.tenantId, deleted, { id });
        await tx.delete(actor.tenantId, aliases, id);
      }
      for (const row of await tx.list<Event>(actor.tenantId, events))
        if (related.has(row.subject)) await tx.delete(actor.tenantId, events, row.id);
      for (const section of ['assignments', 'exposures'])
        for (const row of await tx.list<{ id: string; subject: string }>(
          actor.tenantId,
          collection(actor, section),
        ))
          if (related.has(row.subject))
            await tx.delete(actor.tenantId, collection(actor, section), row.id);
    });
  }
  async function purge(actor: Actor) {
    permission(actor, 'miner:privacy');
    const cutoff = clock() - retentionDays * day;
    await store.transaction(actor.tenantId, async (tx) => {
      for (const section of ['events', 'exposures']) {
        const name = collection(actor, section);
        for (const row of await tx.list<{ id: string; time: number }>(actor.tenantId, name))
          if (row.time < cutoff) await tx.delete(actor.tenantId, name, row.id);
      }
    });
  }
  return {
    track,
    identify,
    events,
    cohortMembers,
    saveCohort,
    canonicalSubjects,
    deleteSubject,
    purge,
  };
}
