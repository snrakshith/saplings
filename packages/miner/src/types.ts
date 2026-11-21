export type Scope = {
  tenantId: string;
  projectId: string;
  environment: 'development' | 'staging' | 'production';
};
export type Scalar = string | number | boolean | null;
export type Actor = Scope & {
  subject: string;
  consent: boolean;
  permissions?: readonly string[];
  traits?: Record<string, Scalar>;
};
export type Properties = Record<string, Scalar>;
export type EventInput = { id: string; name: string; at?: string; properties?: Properties };
export type Event = {
  id: string;
  name: string;
  time: number;
  order?: number;
  subject: string;
  properties: Properties;
};
export type Schema = Readonly<Record<string, 'string' | 'number' | 'boolean'>>;
export interface Records {
  get<T>(tenant: string, collection: string, id: string): Promise<T | undefined>;
  put<T extends { id: string }>(tenant: string, collection: string, record: T): Promise<void>;
  list<T>(tenant: string, collection: string): Promise<T[]>;
  delete(tenant: string, collection: string, id: string): Promise<boolean>;
}
export interface MinerStore extends Records {
  transaction<T>(tenant: string, run: (tx: Records) => Promise<T>): Promise<T>;
  minerEvents?(
    scope: Scope,
    collection: string,
    from: number,
    to: number,
    limit: number,
  ): Promise<Event[]>;
}
export type Window = { from: number; to: number; cohort?: string };
export type Cohort = {
  id: string;
  event: string;
  days: number;
  property?: { key: string; equals: Scalar };
};
export type Flag = {
  id: string;
  enabled: boolean;
  rollout: number;
  trait?: { key: string; equals: Scalar };
  cohort?: string;
};
export type Experiment = {
  id: string;
  flag?: string;
  trait?: Flag['trait'];
  cohort?: string;
  allocation: number;
  treatment: number;
  conversionEvent: string;
};
export type ExperimentRecord = Experiment & {
  state: 'draft' | 'running' | 'stopped';
  started?: number;
  stopped?: number;
};
export type SavedReport =
  | { id: string; type: 'trend'; event: string; property?: string }
  | { id: string; type: 'funnel'; steps: string[] }
  | { id: string; type: 'retention'; first: string; returning: string; days: number };
