/** Shared form definitions for the tenant onboarding checklist. */
type FieldBase = { key: string; label: string; hint?: string };
export type SetupField = FieldBase &
  (
    | { type: 'key' | 'text' | 'url' | 'env'; initial: string }
    | { type: 'number'; initial: number; min: number; max: number }
    | { type: 'choice'; initial: string; options: readonly string[] }
    | { type: 'boolean'; initial: boolean }
  );
export type SetupValue = string | number | boolean;
export type SetupValues = Record<string, SetupValue>;

export interface SetupDomain {
  title: string;
  summary: string;
  fields: readonly SetupField[];
  steps: readonly string[];
  example: (values: SetupValues) => string;
}
