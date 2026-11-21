import type { Records, Scope } from './types.js';
import { collection } from './validation.js';

type Ordered = { id: string; time: number; order?: number };

export async function nextOrder(tx: Records, scope: Scope) {
  const stream = collection(scope, 'sequence');
  const id = 'activity';
  const previous = await tx.get<{ order: number }>(scope.tenantId, stream, id);
  const order = (previous?.order ?? 0) + 1;
  await tx.put(scope.tenantId, stream, { id, order });
  return order;
}

export function compareTime(left: Ordered, right: Ordered) {
  return left.time - right.time || (left.order ?? 0) - (right.order ?? 0);
}

export function compareActivity(left: Ordered, right: Ordered) {
  return compareTime(left, right) || left.id.localeCompare(right.id);
}
