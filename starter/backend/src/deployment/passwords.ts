import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';
import type { RealmPasswordHasher } from '@saplings/kingsman';

const parameters = { memory: 19456, passes: 2, parallelism: 1, tagLength: 32 };
const prefix = '$argon2id$v=19$m=19456,t=2,p=1$';

function derive(password: string, nonce: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    argon2('argon2id', { ...parameters, message: Buffer.from(password), nonce }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export const passwordHasher: RealmPasswordHasher = {
  algorithm: 'argon2id',
  async hash(password) {
    const salt = randomBytes(16);
    return (
      prefix +
      salt.toString('base64url') +
      '$' +
      (await derive(password, salt)).toString('base64url')
    );
  },
  async verify(hash, password) {
    if (!hash.startsWith(prefix) || Buffer.byteLength(password) > 512) return false;
    const [salt, tag, extra] = hash.slice(prefix.length).split('$');
    if (extra !== undefined || !/^[\w-]{22}$/.test(salt) || !/^[\w-]{43}$/.test(tag)) return false;
    const expected = Buffer.from(tag, 'base64url');
    return timingSafeEqual(expected, await derive(password, Buffer.from(salt, 'base64url')));
  },
};
