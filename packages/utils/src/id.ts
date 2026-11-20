/** Cryptographically random URL-safe ID using the platform CSPRNG (64-character alphabet). */
export function nanoid(size = 21): string {
  if (!Number.isInteger(size) || size < 1 || size > 1024) throw new RangeError('Invalid ID size');
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-';
  return Array.from(
    globalThis.crypto.getRandomValues(new Uint8Array(size)),
    (b) => alphabet[b & 63],
  ).join('');
}
