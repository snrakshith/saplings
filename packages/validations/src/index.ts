/** Independent schema parser, inspired by Zod's public API. No Zod dependency. */
export type Path = (string | number)[];
export interface Issue {
  code: string;
  path: Path;
  message: string;
}
export class ValidationError extends Error {
  constructor(readonly issues: Issue[]) {
    super(issues.map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`).join('; '));
    this.name = 'ValidationError';
  }
  flatten() {
    const formErrors: string[] = [],
      fieldErrors: Record<string, string[]> = Object.create(null);
    for (const i of this.issues) {
      if (!i.path.length) formErrors.push(i.message);
      else (fieldErrors[String(i.path[0])] ??= []).push(i.message);
    }
    return { formErrors, fieldErrors };
  }
}
export { ValidationError as ZodError };
export type SafeResult<T> = { success: true; data: T } | { success: false; error: ValidationError };
type Maybe<T> = T | Promise<T>;
type Result<T> = T | typeof BAD;
const BAD = Symbol('invalid');
type Context = {
  path: Path;
  issues: Issue[];
  async: boolean;
  depth: number;
  budget: { remaining: number };
};
const root = (async: boolean): Context => ({
  path: [],
  issues: [],
  async,
  depth: 0,
  budget: { remaining: 100000 },
});
const issue = (c: Context, code: string, message: string): typeof BAD => {
  if (c.issues.length < 100) c.issues.push({ code, path: [...c.path], message });
  return BAD;
};
const child = (c: Context, key: string | number): Context => ({
  ...c,
  path: [...c.path, key],
  depth: c.depth + 1,
});
const promise = (x: unknown): x is PromiseLike<unknown> =>
  x !== null &&
  (typeof x === 'object' || typeof x === 'function') &&
  typeof (x as { then?: unknown }).then === 'function';
function chain<A, B>(v: Maybe<A>, fn: (v: A) => Maybe<B>): Maybe<B> {
  return promise(v) ? Promise.resolve(v).then(fn) : fn(v);
}
function each<T>(items: readonly T[], fn: (x: T, i: number) => Maybe<unknown>): Maybe<void> {
  let pending: Maybe<void> = undefined;
  for (let i = 0; i < items.length; i++) {
    if (promise(pending))
      pending = Promise.resolve(pending)
        .then(() => fn(items[i], i))
        .then(() => undefined);
    else {
      const v = fn(items[i], i);
      if (promise(v)) pending = Promise.resolve(v).then(() => undefined);
    }
  }
  return pending;
}
const plain = (v: unknown): v is Record<string, unknown> =>
  v !== null &&
  typeof v === 'object' &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const safeKey = (k: string) => !['__proto__', 'constructor', 'prototype'].includes(k);
type Parser<T> = (value: unknown, c: Context) => Maybe<Result<T>>;
export class Schema<Out, In = Out> {
  declare readonly _output: Out;
  declare readonly _input: In;
  constructor(private readonly parser: Parser<Out>) {}
  _parse(v: unknown, c: Context): Maybe<Result<Out>> {
    if (c.depth > 64 || --c.budget.remaining < 0)
      return issue(c, 'limit', 'Input exceeds validation complexity limit');
    return this.parser(v, c);
  }
  parse(v: unknown): Out {
    const c = root(false),
      r = this._parse(v, c);
    if (promise(r)) {
      void Promise.resolve(r).catch(() => {});
      throw new Error('Async schema: use parseAsync');
    }
    if (r === BAD || c.issues.length) throw new ValidationError(c.issues);
    return r;
  }
  safeParse(v: unknown): SafeResult<Out> {
    try {
      return { success: true, data: this.parse(v) };
    } catch (e) {
      if (e instanceof ValidationError) return { success: false, error: e };
      throw e;
    }
  }
  async parseAsync(v: unknown): Promise<Out> {
    const c = root(true),
      r = await this._parse(v, c);
    if (r === BAD || c.issues.length) throw new ValidationError(c.issues);
    return r;
  }
  async safeParseAsync(v: unknown): Promise<SafeResult<Out>> {
    try {
      return { success: true, data: await this.parseAsync(v) };
    } catch (e) {
      if (e instanceof ValidationError) return { success: false, error: e };
      throw e;
    }
  }
  optional(): Schema<Out | undefined, In | undefined> {
    return new Schema<Out | undefined, In | undefined>((v, c) =>
      v === undefined ? undefined : this._parse(v, c),
    );
  }
  nullable(): Schema<Out | null, In | null> {
    return new Schema<Out | null, In | null>((v, c) => (v === null ? null : this._parse(v, c)));
  }
  nullish() {
    return this.optional().nullable();
  }
  default(value: Out | (() => Out)): Schema<Out, In | undefined> {
    return new Schema((v, c) =>
      this._parse(
        v === undefined ? (typeof value === 'function' ? (value as () => Out)() : value) : v,
        c,
      ),
    );
  }
  array() {
    return new ArraySchema(this);
  }
  or<S extends AnySchema>(other: S): Schema<Out | output<S>, In | input<S>> {
    return union([this, other]);
  }
  and<S extends AnySchema>(other: S): Schema<Out & output<S>, In & input<S>> {
    return intersection(this, other);
  }
  refine(check: (v: Out) => Maybe<boolean>, message = 'Invalid value'): Schema<Out, In> {
    return new Schema((v, c) =>
      chain(this._parse(v, c), (r) =>
        r === BAD ? BAD : chain(check(r), (ok) => (ok ? r : issue(c, 'custom', message))),
      ),
    );
  }
  superRefine(
    check: (
      v: Out,
      ctx: { addIssue: (i: { code?: string; message: string; path?: Path }) => void },
    ) => Maybe<void>,
  ): Schema<Out, In> {
    return new Schema((v, c) =>
      chain(this._parse(v, c), (r) => {
        if (r === BAD) return BAD;
        let invalid = false;
        return chain(
          check(r, {
            addIssue: (i) => {
              invalid = true;
              issue({ ...c, path: [...c.path, ...(i.path ?? [])] }, i.code ?? 'custom', i.message);
            },
          }),
          () => (invalid ? BAD : r),
        );
      }),
    );
  }
  transform<T>(fn: (v: Out) => Maybe<T>): Schema<T, In> {
    return new Schema((v, c) => chain(this._parse(v, c), (r) => (r === BAD ? BAD : fn(r))));
  }
  pipe<S extends AnySchema>(schema: S): Schema<output<S>, In> {
    return new Schema((v, c) =>
      chain(this._parse(v, c), (r) => (r === BAD ? BAD : schema._parse(r, c))),
    );
  }
  catch(value: Out): Schema<Out, In> {
    return new Schema((v, c) => {
      const local = { ...c, issues: [] };
      return chain(this._parse(v, local), (r) => (r === BAD || local.issues.length ? value : r));
    });
  }
}
export type AnySchema = Schema<any, any>;
export type output<S extends AnySchema> = S['_output'];
export type input<S extends AnySchema> = S['_input'];
export type infer<S extends AnySchema> = output<S>;
export class StringSchema<In = string> extends Schema<string, In> {
  constructor(
    parser: Parser<string> = (v, c) =>
      typeof v === 'string' ? v : issue(c, 'invalid_type', 'Expected string'),
  ) {
    super(parser);
  }
  private check(fn: (s: string) => boolean, message: string, code = 'invalid_string') {
    return new StringSchema<In>((v, c) =>
      chain(this._parse(v, c), (r) => (r === BAD ? BAD : fn(r) ? r : issue(c, code, message))),
    );
  }
  min(n: number, m = `Expected at least ${n} characters`) {
    return this.check((s) => s.length >= n, m, 'too_small');
  }
  max(n: number, m = `Expected at most ${n} characters`) {
    return this.check((s) => s.length <= n, m, 'too_big');
  }
  length(n: number) {
    return this.check((s) => s.length === n, `Expected ${n} characters`);
  }
  nonempty() {
    return this.min(1);
  }
  email() {
    return this.check((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), 'Invalid email');
  }
  url() {
    return this.check((s) => {
      try {
        new URL(s);
        return true;
      } catch {
        return false;
      }
    }, 'Invalid URL');
  }
  uuid() {
    return this.check(
      (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
      'Invalid UUID',
    );
  }
  regex(re: RegExp, m = 'Invalid format') {
    const copy = new RegExp(re.source, re.flags.replace(/[gy]/g, ''));
    return this.check((s) => copy.test(s), m);
  }
  startsWith(s: string) {
    return this.check((v) => v.startsWith(s), `Must start with ${s}`);
  }
  endsWith(s: string) {
    return this.check((v) => v.endsWith(s), `Must end with ${s}`);
  }
  includes(s: string) {
    return this.check((v) => v.includes(s), `Must include ${s}`);
  }
  datetime() {
    return this.check(
      (s) =>
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s) &&
        Number.isFinite(Date.parse(s)),
      'Invalid ISO datetime',
    );
  }
  trim() {
    return new StringSchema<In>((v, c) =>
      chain(this._parse(v, c), (r) => (r === BAD ? BAD : r.trim())),
    );
  }
  toLowerCase() {
    return new StringSchema<In>((v, c) =>
      chain(this._parse(v, c), (r) => (r === BAD ? BAD : r.toLowerCase())),
    );
  }
  toUpperCase() {
    return new StringSchema<In>((v, c) =>
      chain(this._parse(v, c), (r) => (r === BAD ? BAD : r.toUpperCase())),
    );
  }
}
export class NumberSchema<In = number> extends Schema<number, In> {
  constructor(
    parser: Parser<number> = (v, c) =>
      typeof v === 'number' && Number.isFinite(v)
        ? v
        : issue(c, 'invalid_type', 'Expected finite number'),
  ) {
    super(parser);
  }
  private check(fn: (n: number) => boolean, m: string) {
    return new NumberSchema<In>((v, c) =>
      chain(this._parse(v, c), (r) =>
        r === BAD ? BAD : fn(r) ? r : issue(c, 'invalid_number', m),
      ),
    );
  }
  min(n: number) {
    return this.check((v) => v >= n, `Expected >= ${n}`);
  }
  max(n: number) {
    return this.check((v) => v <= n, `Expected <= ${n}`);
  }
  gt(n: number) {
    return this.check((v) => v > n, `Expected > ${n}`);
  }
  lt(n: number) {
    return this.check((v) => v < n, `Expected < ${n}`);
  }
  int() {
    return this.check(Number.isSafeInteger, 'Expected safe integer');
  }
  positive() {
    return this.gt(0);
  }
  nonnegative() {
    return this.min(0);
  }
  negative() {
    return this.lt(0);
  }
  nonpositive() {
    return this.max(0);
  }
  finite() {
    return this.check(Number.isFinite, 'Expected finite number');
  }
  multipleOf(n: number) {
    if (!Number.isFinite(n) || n === 0) throw Error('Invalid divisor');
    return this.check(
      (v) =>
        Math.abs(v / n - Math.round(v / n)) <= Number.EPSILON * Math.max(1, Math.abs(v / n)) * 2,
      `Expected multiple of ${n}`,
    );
  }
}
export class ArraySchema<S extends AnySchema> extends Schema<output<S>[], input<S>[]> {
  constructor(
    readonly element: S,
    private readonly bounds: { min?: number; max?: number } = {},
  ) {
    super((v, c) => {
      if (!Array.isArray(v)) return issue(c, 'invalid_type', 'Expected array');
      if (v.length > 10000 || v.length < (bounds.min ?? 0) || v.length > (bounds.max ?? 10000))
        return issue(c, 'invalid_length', 'Array length out of bounds');
      const out: output<S>[] = [];
      let failed = false;
      return chain(
        each(v, (x, i) =>
          chain(element._parse(x, child(c, i)), (r) => {
            if (r === BAD) failed = true;
            else out[i] = r;
          }),
        ),
        () => (failed ? BAD : out),
      );
    });
  }
  min(n: number) {
    return new ArraySchema(this.element, { ...this.bounds, min: n });
  }
  max(n: number) {
    return new ArraySchema(this.element, { ...this.bounds, max: n });
  }
  length(n: number) {
    return new ArraySchema(this.element, { min: n, max: n });
  }
  nonempty() {
    return this.min(1);
  }
}
export type Shape = Record<string, AnySchema>;
type Optional<S extends Shape, Mode extends '_input' | '_output'> = {
  [K in keyof S]-?: undefined extends S[K][Mode] ? K : never;
}[keyof S];
type ShapeValue<S extends Shape, M extends '_input' | '_output'> = {
  [K in Exclude<keyof S, Optional<S, M>>]: S[K][M];
} & { [K in Optional<S, M>]?: S[K][M] };
export class ObjectSchema<S extends Shape> extends Schema<
  ShapeValue<S, '_output'>,
  ShapeValue<S, '_input'>
> {
  constructor(
    readonly shape: S,
    private readonly unknownKeys: 'strip' | 'strict' | 'passthrough' = 'strip',
  ) {
    super((v, c) => {
      if (!plain(v)) return issue(c, 'invalid_type', 'Expected plain object');
      const keys = Object.keys(v);
      if (keys.length > 10000 || keys.some((k) => !safeKey(k)))
        return issue(c, 'invalid_key', 'Unsafe or excessive object keys');
      const out: Record<string, unknown> = {};
      let failed = false;
      for (const k of keys) {
        if (!Object.hasOwn(shape, k)) {
          if (unknownKeys === 'strict') {
            issue(child(c, k), 'unrecognized_key', 'Unrecognized key');
            failed = true;
          } else if (unknownKeys === 'passthrough') out[k] = v[k];
        }
      }
      return chain(
        each(Object.keys(shape), (k) =>
          chain(shape[k]._parse(Object.hasOwn(v, k) ? v[k] : undefined, child(c, k)), (r) => {
            if (r === BAD) failed = true;
            else if (r !== undefined || Object.hasOwn(v, k)) out[k] = r;
          }),
        ),
        () => (failed ? BAD : (out as ShapeValue<S, '_output'>)),
      );
    });
    if (Object.keys(shape).some((k) => !safeKey(k))) throw Error('Unsafe schema key');
  }
  strict() {
    return new ObjectSchema(this.shape, 'strict');
  }
  strip() {
    return new ObjectSchema(this.shape, 'strip');
  }
  passthrough() {
    return new ObjectSchema(this.shape, 'passthrough');
  }
  extend<T extends Shape>(shape: T) {
    return new ObjectSchema({ ...this.shape, ...shape } as Omit<S, keyof T> & T, this.unknownKeys);
  }
  merge<T extends Shape>(other: ObjectSchema<T>) {
    return this.extend(other.shape);
  }
  pick<K extends keyof S>(mask: Record<K, true>) {
    return new ObjectSchema(
      Object.fromEntries(
        Object.keys(mask)
          .filter((k) => Object.hasOwn(this.shape, k))
          .map((k) => [k, this.shape[k]]),
      ) as Pick<S, K>,
      this.unknownKeys,
    );
  }
  omit<K extends keyof S>(mask: Record<K, true>) {
    return new ObjectSchema(
      Object.fromEntries(
        Object.keys(this.shape)
          .filter((k) => !Object.hasOwn(mask, k))
          .map((k) => [k, this.shape[k]]),
      ) as Omit<S, K>,
      this.unknownKeys,
    );
  }
  partial() {
    return new ObjectSchema(
      Object.fromEntries(Object.entries(this.shape).map(([k, s]) => [k, s.optional()])) as {
        [K in keyof S]: Schema<output<S[K]> | undefined, input<S[K]> | undefined>;
      },
      this.unknownKeys,
    );
  }
}
export const string = () => new StringSchema();
export const number = () => new NumberSchema();
export const boolean = () =>
  new Schema<boolean>((v, c) =>
    typeof v === 'boolean' ? v : issue(c, 'invalid_type', 'Expected boolean'),
  );
export const bigint = () =>
  new Schema<bigint>((v, c) =>
    typeof v === 'bigint' ? v : issue(c, 'invalid_type', 'Expected bigint'),
  );
export const date = () =>
  new Schema<Date>((v, c) =>
    v instanceof Date && Number.isFinite(v.getTime())
      ? new Date(v)
      : issue(c, 'invalid_type', 'Expected valid Date'),
  );
export const unknown = () => new Schema<unknown>((v) => v);
export const any = () => new Schema<any>((v) => v);
export const never = () => new Schema<never>((_, c) => issue(c, 'invalid_type', 'Never allowed'));
export const literal = <const T extends string | number | boolean | bigint | null | undefined>(
  x: T,
) =>
  new Schema<T>((v, c) =>
    Object.is(v, x) ? x : issue(c, 'invalid_literal', 'Unexpected literal'),
  );
export const nullType = () => literal(null);
export const undefinedType = () => literal(undefined);
export const enumType = <const T extends readonly [string, ...string[]]>(values: T) =>
  new Schema<T[number]>((v, c) =>
    typeof v === 'string' && values.includes(v)
      ? (v as T[number])
      : issue(c, 'invalid_enum', 'Invalid enum value'),
  );
export const object = <S extends Shape>(s: S) => new ObjectSchema(s);
export const array = <S extends AnySchema>(s: S) => new ArraySchema(s);
export const tuple = <const S extends readonly AnySchema[]>(schemas: S) =>
  new Schema<{ [K in keyof S]: output<S[K]> }, { [K in keyof S]: input<S[K]> }>((v, c) => {
    if (!Array.isArray(v) || v.length !== schemas.length)
      return issue(c, 'invalid_tuple', 'Invalid tuple length');
    const out: unknown[] = [];
    let failed = false;
    return chain(
      each(schemas, (s, i) =>
        chain(s._parse(v[i], child(c, i)), (r) => {
          if (r === BAD) failed = true;
          else out[i] = r;
        }),
      ),
      () => (failed ? BAD : (out as { [K in keyof S]: output<S[K]> })),
    );
  });
export const record = <S extends AnySchema>(s: S) =>
  new Schema<Record<string, output<S>>, Record<string, input<S>>>((v, c) => {
    if (!plain(v)) return issue(c, 'invalid_type', 'Expected record');
    const entries = Object.keys(v);
    if (entries.length > 10000 || entries.some((k) => !safeKey(k)))
      return issue(c, 'invalid_key', 'Unsafe or excessive keys');
    const out: Record<string, output<S>> = {};
    let failed = false;
    return chain(
      each(entries, (k) =>
        chain(s._parse(v[k], child(c, k)), (r) => {
          if (r === BAD) failed = true;
          else out[k] = r;
        }),
      ),
      () => (failed ? BAD : out),
    );
  });
export function union<const S extends readonly AnySchema[]>(
  schemas: S,
): Schema<output<S[number]>, input<S[number]>> {
  return new Schema((v, c) => {
    const attempt = (i: number): Maybe<Result<output<S[number]>>> => {
      if (i >= schemas.length) return issue(c, 'invalid_union', 'No union branch matched');
      const local = { ...c, issues: [] };
      return chain(schemas[i]._parse(v, local), (r) =>
        r !== BAD && !local.issues.length ? r : attempt(i + 1),
      );
    };
    return attempt(0);
  });
}
export function intersection<A extends AnySchema, B extends AnySchema>(
  a: A,
  b: B,
): Schema<output<A> & output<B>, input<A> & input<B>> {
  return new Schema((v, c) =>
    chain(a._parse(v, c), (x) =>
      chain(b._parse(v, c), (y) => {
        if (x === BAD || y === BAD) return BAD;
        if (Object.is(x, y)) return x;
        if (plain(x) && plain(y)) {
          for (const k of Object.keys(x))
            if (Object.hasOwn(y, k) && !Object.is(x[k], y[k]))
              return issue(c, 'invalid_intersection', 'Conflicting intersection output');
          return { ...x, ...y } as output<A> & output<B>;
        }
        return issue(c, 'invalid_intersection', 'Incompatible outputs');
      }),
    ),
  );
}
export const lazy = <S extends AnySchema>(get: () => S): Schema<output<S>, input<S>> =>
  new Schema((v, c) => get()._parse(v, { ...c, depth: c.depth + 1 }));
export const preprocess = <S extends AnySchema>(
  fn: (v: unknown) => Maybe<unknown>,
  schema: S,
): Schema<output<S>, unknown> => new Schema((v, c) => chain(fn(v), (r) => schema._parse(r, c)));
export const custom = <T>(fn: (v: unknown) => v is T, message = 'Invalid value') =>
  new Schema<T>((v, c) => (fn(v) ? v : issue(c, 'custom', message)));
export const coerce = {
  string: () =>
    new StringSchema<unknown>((v, c) =>
      ['string', 'boolean', 'number', 'bigint'].includes(typeof v)
        ? String(v)
        : issue(c, 'invalid_type', 'Cannot coerce to string'),
    ),
  number: () =>
    new NumberSchema<unknown>((v, c) => {
      const n =
        typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
      return Number.isFinite(n) ? n : issue(c, 'invalid_type', 'Cannot coerce to finite number');
    }),
  boolean: () =>
    new Schema<boolean, unknown>((v, c) =>
      v === true || v === 'true' || v === 1
        ? true
        : v === false || v === 'false' || v === 0
          ? false
          : issue(c, 'invalid_type', 'Cannot coerce to boolean'),
    ),
  date: () =>
    new Schema<Date, unknown>((v, c) => {
      const d =
        v instanceof Date
          ? new Date(v)
          : typeof v === 'string' || typeof v === 'number'
            ? new Date(v)
            : new Date(NaN);
      return Number.isFinite(d.getTime()) ? d : issue(c, 'invalid_type', 'Cannot coerce to date');
    }),
};
export const map = <K extends AnySchema, V extends AnySchema>(key: K, value: V) =>
  new Schema<Map<output<K>, output<V>>, Map<input<K>, input<V>>>((v, c) => {
    if (!(v instanceof Map) || v.size > 10000)
      return issue(c, 'invalid_type', 'Expected bounded map');
    const out = new Map<output<K>, output<V>>();
    let failed = false;
    return chain(
      each([...v], ([k, val], i) =>
        chain(key._parse(k, child(child(c, i), 'key')), (kr) =>
          chain(value._parse(val, child(child(c, i), 'value')), (vr) => {
            if (kr === BAD || vr === BAD) failed = true;
            else out.set(kr, vr);
          }),
        ),
      ),
      () => (failed ? BAD : out),
    );
  });
export const set = <S extends AnySchema>(element: S) =>
  new Schema<Set<output<S>>, Set<input<S>>>((v, c) => {
    if (!(v instanceof Set) || v.size > 10000)
      return issue(c, 'invalid_type', 'Expected bounded set');
    const out = new Set<output<S>>();
    let failed = false;
    return chain(
      each([...v], (x, i) =>
        chain(element._parse(x, child(c, i)), (r) => {
          if (r === BAD) failed = true;
          else out.add(r);
        }),
      ),
      () => (failed ? BAD : out),
    );
  });
export const discriminatedUnion = <const S extends readonly ObjectSchema<any>[]>(
  key: string,
  schemas: S,
): Schema<output<S[number]>, input<S[number]>> =>
  new Schema((v, c) => {
    if (!plain(v) || !safeKey(key) || !Object.hasOwn(v, key))
      return issue(c, 'invalid_discriminator', 'Missing discriminator');
    const matched = schemas.filter(
      (s) => Object.hasOwn(s.shape, key) && s.shape[key].safeParse(v[key]).success,
    );
    if (matched.length !== 1)
      return issue(
        child(c, key),
        'invalid_discriminator',
        'Expected exactly one matching discriminator',
      );
    return matched[0]._parse(v, c);
  });
export const z = {
  map,
  set,
  discriminatedUnion,
  string,
  number,
  boolean,
  bigint,
  date,
  unknown,
  any,
  never,
  literal,
  null: nullType,
  undefined: undefinedType,
  enum: enumType,
  object,
  array,
  tuple,
  record,
  union,
  intersection,
  lazy,
  preprocess,
  custom,
  coerce,
};
export namespace z {
  export type infer<S extends AnySchema> = output<S>;
  export type input<S extends AnySchema> = S['_input'];
  export type output<S extends AnySchema> = S['_output'];
}
