/* Offline-build-only minimal Node declarations. Normal consumers should install @types/node.
   Avoid putting this file into published library declaration bundles. */
declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
  cwd(): string;
  exitCode?: number;
};
declare const Buffer: {
  from(data: string | ArrayBuffer | Uint8Array, encoding?: string): any;
  alloc(size: number): any;
  isBuffer(value: unknown): boolean;
  concat(chunks: any[]): any;
  byteLength(value: string): number;
};
type Buffer = any;
declare module 'node:crypto' {
  export function randomUUID(): string;
  export function randomBytes(size: number): Buffer;
  export function createHash(algorithm: string): {
    update(value: string | Buffer): any;
    digest(encoding?: string): any;
  };
  export function createHmac(
    algorithm: string,
    key: string | Buffer,
  ): { update(value: string | Buffer): any; digest(encoding?: string): any };
  export function timingSafeEqual(a: Buffer, b: Buffer): boolean;
}
declare module 'node:fs' {
  export const promises: any;
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding?: string): any;
}
declare module 'node:path' {
  export function join(...args: string[]): string;
  export function resolve(...args: string[]): string;
  export function relative(from: string, to: string): string;
  export function extname(path: string): string;
  export const sep: string;
}
declare module 'node:url' {
  export function pathToFileURL(path: string): { href: string };
}
declare module 'node:dns/promises' {
  export function resolve4(hostname: string): Promise<string[]>;
  export function resolveMx(hostname: string): Promise<any[]>;
  export function resolveTxt(hostname: string): Promise<string[][]>;
}
declare module 'node:crypto' {
  export function scrypt(
    password: string,
    salt: string,
    keylen: number,
    callback: (error: Error | null, key: Buffer) => void,
  ): void;
  export function createCipheriv(algorithm: string, key: Buffer, iv: Buffer): any;
  export function createDecipheriv(algorithm: string, key: Buffer, iv: Buffer): any;
}
