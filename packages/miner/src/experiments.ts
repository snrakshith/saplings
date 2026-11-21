import { createHash } from 'node:crypto';
import { compareActivity, compareTime, nextOrder } from './order.js';
import type {
  Actor,
  Experiment,
  ExperimentRecord,
  Flag,
  MinerStore,
  Records,
  Schema,
  Window,
} from './types.js';
import type { createEngine } from './engine.js';
import { collection, day, key, percentage, permission, props, reject } from './validation.js';

type Variation = 'control' | 'treatment';
type Assignment = {
  id: string;
  experiment: string;
  subject: string;
  variant: Variation;
  time: number;
};
type Exposure = Assignment & { order?: number };
const assignmentId = (experiment: string, subject: string) => JSON.stringify([experiment, subject]);
const bucket = (...parts: string[]) =>
  (createHash('sha256').update(JSON.stringify(parts)).digest().readUInt32BE() / 2 ** 32) * 100;

export function createExperiments(
  store: MinerStore,
  engine: ReturnType<typeof createEngine>,
  schemas: Readonly<Record<string, Schema>>,
  clock: () => number,
) {
  function rules(input: Pick<Flag, 'trait' | 'cohort'>) {
    if (input.trait) props({ [input.trait.key]: input.trait.equals });
    if (input.cohort) key(input.cohort);
  }
  async function eligible(actor: Actor, input: Pick<Flag, 'trait' | 'cohort'>) {
    const subject = key(actor.subject);
    const aliases = await engine.canonicalSubjects(actor);
    const canonical = aliases.get(subject) ?? subject;
    return (
      actor.consent &&
      (!input.trait || actor.traits?.[input.trait.key] === input.trait.equals) &&
      (!input.cohort || (await engine.cohortMembers(actor, input.cohort)).has(canonical))
    );
  }
  async function setFlag(actor: Actor, input: Flag) {
    permission(actor, 'miner:admin');
    key(input.id);
    percentage(input.rollout);
    if (typeof input.enabled !== 'boolean') return reject('Flag enabled must be a boolean.');
    rules(input);
    await store.put(actor.tenantId, collection(actor, 'flags'), input);
    return input;
  }
  async function evaluateFlag(actor: Actor, id: string) {
    const flag = await store.get<Flag>(actor.tenantId, collection(actor, 'flags'), key(id));
    return {
      enabled: Boolean(
        flag?.enabled &&
        (await eligible(actor, flag)) &&
        bucket(collection(actor, 'flags'), actor.tenantId, id, actor.subject) < flag.rollout,
      ),
    };
  }
  async function saveExperiment(actor: Actor, input: Experiment) {
    permission(actor, 'miner:admin');
    key(input.id);
    percentage(input.allocation);
    percentage(input.treatment);
    key(input.conversionEvent);
    if (
      !Object.hasOwn(schemas, input.conversionEvent) ||
      input.allocation === 0 ||
      [0, 100].includes(input.treatment)
    )
      return reject('Select a registered conversion event and allocate both variants.');
    rules(input);
    if (
      input.flag !== undefined &&
      !(await store.get(actor.tenantId, collection(actor, 'flags'), key(input.flag)))
    )
      return reject('Unknown feature flag.', 404);
    const section = collection(actor, 'experiments');
    return store.transaction(actor.tenantId, async (tx) => {
      const previous = await tx.get<ExperimentRecord>(actor.tenantId, section, input.id);
      if (previous && previous.state !== 'draft')
        return reject('Only draft experiments can change.', 409);
      const experiment: ExperimentRecord = {
        id: input.id,
        flag: input.flag,
        allocation: input.allocation,
        treatment: input.treatment,
        conversionEvent: input.conversionEvent,
        trait: input.trait,
        cohort: input.cohort,
        state: 'draft',
      };
      await tx.put(actor.tenantId, section, experiment);
      return experiment;
    });
  }
  async function changeState(actor: Actor, id: string, state: 'running' | 'stopped') {
    permission(actor, 'miner:admin');
    const section = collection(actor, 'experiments');
    key(id);
    return store.transaction(actor.tenantId, async (tx) => {
      const experiment = await tx.get<ExperimentRecord>(actor.tenantId, section, id);
      if (!experiment || experiment.state !== (state === 'running' ? 'draft' : 'running'))
        return reject('Experiment cannot change to this state.', 409);
      const next = { ...experiment, state, [state === 'running' ? 'started' : 'stopped']: clock() };
      await tx.put(actor.tenantId, section, next);
      return next;
    });
  }
  async function canonical(actor: Actor, tx: Records) {
    const aliases = await engine.canonicalSubjects(actor, tx);
    const subject = key(actor.subject);
    const id = aliases.get(subject) ?? subject;
    const linked = [...aliases].filter(([, target]) => target === id).map(([source]) => source);
    if (
      (await tx.get(actor.tenantId, collection(actor, 'deleted'), id)) ||
      (await tx.get(actor.tenantId, collection(actor, 'deleted'), subject))
    )
      return reject('Subject data has been deleted.', 403);
    return { id, linked };
  }
  async function findAssignment(actor: Actor, tx: Records, experiment: string, subjects: string[]) {
    const name = collection(actor, 'assignments');
    const [primary, ...linked] = await Promise.all(
      subjects.map((subject) =>
        tx.get<Assignment>(actor.tenantId, name, assignmentId(experiment, subject)),
      ),
    );
    return (
      primary ?? linked.filter((row): row is Assignment => Boolean(row)).sort(compareActivity)[0]
    );
  }
  async function assign(actor: Actor, experiment: string) {
    key(experiment);
    if (!actor.consent) return null;
    const section = collection(actor, 'experiments');
    const initial = await store.get<ExperimentRecord>(actor.tenantId, section, experiment);
    if (initial?.state !== 'running') return null;
    if (initial.flag && !(await evaluateFlag(actor, initial.flag)).enabled) return null;
    const allowed = await eligible(actor, initial);
    return store.transaction(actor.tenantId, async (tx) => {
      const config = await tx.get<ExperimentRecord>(actor.tenantId, section, experiment);
      if (config?.state !== 'running') return null;
      const { id, linked } = await canonical(actor, tx);
      const assigned = await findAssignment(actor, tx, experiment, [id, ...linked]);
      if (
        !assigned &&
        (!allowed || bucket(section, actor.tenantId, experiment, id, 'sample') >= config.allocation)
      )
        return null;
      const variant =
        assigned?.variant ??
        (bucket(section, actor.tenantId, experiment, id, 'variant') < config.treatment
          ? 'treatment'
          : 'control');
      if (assigned?.subject !== id) {
        await tx.put(actor.tenantId, collection(actor, 'assignments'), {
          id: assignmentId(experiment, id),
          subject: id,
          variant,
          experiment,
          time: assigned?.time ?? clock(),
        });
      }
      return { variant };
    });
  }
  async function expose(actor: Actor, id: string, variant: Variation) {
    if (!actor.consent) return reject('Analytics consent is required.', 403);
    key(id);
    return store.transaction(actor.tenantId, async (tx) => {
      const config = await tx.get<ExperimentRecord>(
        actor.tenantId,
        collection(actor, 'experiments'),
        id,
      );
      if (config?.state !== 'running') return reject('Experiment is inactive.', 409);
      const { id: subject, linked } = await canonical(actor, tx);
      const assignment = await findAssignment(actor, tx, id, [subject, ...linked]);
      if (!assignment || assignment.variant !== variant)
        return reject('Exposure must match an assignment.', 409);
      const exposures = collection(actor, 'exposures');
      const eventId = assignmentId(id, subject);
      const seen = await Promise.all(
        [subject, ...linked].map((entry) =>
          tx.get(actor.tenantId, exposures, assignmentId(id, entry)),
        ),
      );
      if (seen.some(Boolean)) return { duplicate: true };
      const order = await nextOrder(tx, actor);
      await tx.put(actor.tenantId, exposures, {
        id: eventId,
        experiment: id,
        subject,
        variant,
        time: clock(),
        order,
      });
      return { duplicate: false };
    });
  }
  async function results(actor: Actor, id: string, range: Window) {
    permission(actor, 'miner:read');
    const config = await store.get<ExperimentRecord>(
      actor.tenantId,
      collection(actor, 'experiments'),
      key(id),
    );
    if (!config || config.started === undefined) return reject('Experiment has not started.', 404);
    const conversions = await engine.events(actor, { from: range.from, to: range.to });
    const aliases = await engine.canonicalSubjects(actor);
    const cohort = range.cohort
      ? await engine.cohortMembers(actor, range.cohort, range.to)
      : undefined;
    const exposed = new Map<string, Exposure>();
    const rows = await store.list<Exposure>(actor.tenantId, collection(actor, 'exposures'));
    for (const row of rows.sort(compareActivity)) {
      if (row.experiment !== id || row.time < range.from || row.time >= range.to) continue;
      const subject = aliases.get(row.subject) ?? row.subject;
      if ((!cohort || cohort.has(subject)) && !exposed.has(subject)) exposed.set(subject, row);
    }
    const converted = new Set<string>();
    for (const event of conversions) {
      const exposure = exposed.get(event.subject);
      if (
        event.name === config.conversionEvent &&
        exposure &&
        compareTime(event, exposure) > 0 &&
        event.time < exposure.time + 14 * day
      )
        converted.add(event.subject);
    }
    const variants = (['control', 'treatment'] as const).map((variant) => {
      const people = [...exposed].filter(([, exposure]) => exposure.variant === variant);
      const count = people.filter(([subject]) => converted.has(subject)).length;
      return {
        variant,
        exposed: people.length,
        converted: count,
        rate: people.length ? count / people.length : null,
      };
    });
    const [baseline, treatment] = variants;
    return {
      variants,
      lift:
        baseline.rate === null || treatment.rate === null ? null : treatment.rate - baseline.rate,
    };
  }
  return {
    setFlag,
    evaluateFlag,
    saveExperiment,
    launch: (actor: Actor, id: string) => changeState(actor, id, 'running'),
    stop: (actor: Actor, id: string) => changeState(actor, id, 'stopped'),
    assign,
    expose,
    results,
  };
}
