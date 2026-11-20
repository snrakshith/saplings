import { integer, fail } from './primitives.js';
/** Fixed-period proration in integer minor units. Round half away from zero; credits are explicit, not negative invoices. */
export function quotePlanChange(input: {
  oldMinor: number;
  newMinor: number;
  periodStart: number;
  periodEnd: number;
  effectiveAt: number;
  taxBps?: number;
}) {
  const old = integer(input.oldMinor, 'old price'),
    next = integer(input.newMinor, 'new price'),
    start = integer(input.periodStart, 'start'),
    end = integer(input.periodEnd, 'end'),
    at = integer(input.effectiveAt, 'effective time'),
    bps = integer(input.taxBps ?? 0, 'tax bps', 0, 10000);
  if (end <= start || at < start || at > end) return fail('Invalid proration period');
  const delta = BigInt(next) - BigInt(old),
    remaining = BigInt(end - at),
    duration = BigInt(end - start),
    absolute = delta < 0n ? -delta : delta,
    minor = (absolute * remaining * 2n + duration) / (2n * duration);
  const charge = delta > 0n ? minor : 0n,
    credit = delta < 0n ? minor : 0n,
    tax = (charge * BigInt(bps) + 5000n) / 10000n;
  return {
    chargeMinor: integer(Number(charge), 'charge'),
    creditMinor: integer(Number(credit), 'credit'),
    taxMinor: integer(Number(tax), 'tax'),
    totalMinor: integer(Number(charge + tax), 'total'),
    remainingMs: end - at,
  };
}
