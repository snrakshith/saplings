import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes: Uint8Array) {
  let bits = 0,
    value = 0,
    out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}
export function decode32(value: string) {
  let bits = 0,
    acc = 0;
  const out: number[] = [];
  for (const ch of value) {
    const n = alphabet.indexOf(ch);
    if (n < 0) throw Error('Invalid base32');
    acc = (acc << 5) | n;
    bits += 5;
    if (bits >= 8) {
      out.push((acc >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}
export function totp(secret: string, step: number) {
  const counter = new Uint8Array(8);
  new DataView(counter.buffer).setBigUint64(0, BigInt(step));
  const mac = createHmac('sha1', Buffer.from(decode32(secret)))
    .update(Buffer.from(counter))
    .digest();
  const offset = mac[mac.length - 1] & 15;
  const n =
    ((mac[offset] & 127) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];
  return String(n % 1_000_000).padStart(6, '0');
}
export function matchTotp(secret: string, code: unknown, last = -1, time = Date.now()) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return undefined;
  const current = Math.floor(time / 30000);
  for (const step of [current, current - 1, current + 1])
    if (
      step > last &&
      step >= 0 &&
      timingSafeEqual(Buffer.from(totp(secret, step)), Buffer.from(code))
    )
      return step;
  return undefined;
}
export function newTotpSecret() {
  return base32(randomBytes(20));
}
