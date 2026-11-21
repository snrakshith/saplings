export type Inventory = {
  events: string[];
  reports: Record<string, unknown>[];
  cohorts: { id: string }[];
  flags: { id: string; enabled: boolean; rollout: number }[];
  experiments: { id: string; state: string }[];
};
export const text = (data: FormData, key: string) => String(data.get(key) ?? '').trim();

export type Apply = (input: Record<string, unknown>, refresh?: boolean) => Promise<void>;
