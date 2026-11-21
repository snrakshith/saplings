export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type Document = { [key: string]: JsonValue };
export type Environment = 'development' | 'staging' | 'production';
export type ReviewPolicy =
  'operator' | 'distinct-reviewer' | Record<Environment, 'operator' | 'distinct-reviewer'>;
export type Scope = { projectId: string; environment: Environment; tenantId: string };
export type Actor = Scope & { actorId: string; permissions: readonly string[] };
export type Definition = {
  audience: 'public' | 'signed-in';
  validate: (value: Document) => boolean;
};
export type Revision = {
  id: string;
  number: number;
  base: number | null;
  state: 'draft' | 'submitted' | 'published' | 'rejected';
  value: Document;
  author: string;
  reviewer?: string;
  at: string;
};
export interface Records {
  get<T>(tenant: string, collection: string, id: string): Promise<T | undefined>;
  put<T extends { id: string }>(tenant: string, collection: string, record: T): Promise<void>;
}
export interface ConfigStore extends Records {
  transaction<T>(tenant: string, run: (tx: Records) => Promise<T>): Promise<T>;
}
