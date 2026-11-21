import type { Event } from './types.js';
import { day, key, reject } from './validation.js';

export function trends(events: Event[], name: string, property?: string) {
  key(name);
  if (property !== undefined) key(property);
  const people = new Set<string>();
  const groups = new Map<string, number>();
  for (const event of events) {
    if (event.name !== name) continue;
    people.add(event.subject);
    const bucket =
      property === undefined
        ? new Date(event.time).toISOString().slice(0, 10)
        : JSON.stringify(
            Object.hasOwn(event.properties, property) ? event.properties[property] : null,
          );
    groups.set(bucket, (groups.get(bucket) ?? 0) + 1);
  }
  return {
    total: [...groups.values()].reduce((sum, count) => sum + count, 0),
    unique: people.size,
    groups: [...groups].map(([key, count]) => ({ key, count })),
  };
}

export function funnel(events: Event[], steps: string[]) {
  if (!Array.isArray(steps) || steps.length < 2 || steps.length > 20)
    return reject('Select two to twenty funnel steps.');
  steps.forEach(key);
  const progress = new Map<string, number>();
  for (const event of events) {
    const next = progress.get(event.subject) ?? 0;
    if (steps[next] === event.name) progress.set(event.subject, next + 1);
  }
  const counts = [...progress.values()];
  return steps.map((name, i) => ({ name, users: counts.filter((done) => done > i).length }));
}

export function retention(events: Event[], first: string, returning: string, days: number) {
  key(first);
  key(returning);
  if (!Number.isSafeInteger(days) || days < 1 || days > 90)
    return reject('Invalid retention period.');
  const initial = new Map<string, number>();
  const daily = Array.from({ length: days + 1 }, () => new Set<string>());
  for (const event of events) {
    const start = initial.get(event.subject);
    if (start === undefined && event.name === first) initial.set(event.subject, event.time);
    if (start === undefined || event.name !== returning) continue;
    daily[Math.floor(event.time / day) - Math.floor(start / day)]?.add(event.subject);
  }
  return {
    cohort: initial.size,
    days: daily.map((people, day) => ({
      day,
      users: people.size,
      rate: initial.size ? people.size / initial.size : null,
    })),
  };
}
