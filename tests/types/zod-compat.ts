import { z, ZodError } from '@saplings/validations';
import { z as original } from 'zod';
import * as v3 from '@saplings/validations/v3';
import * as mini from '@saplings/validations/mini';
import { validate } from '@saplings/middleware';
const schema = z.object({
  name: z.string(),
  age: z.coerce.number(),
  active: z.boolean().default(true),
});
type Out = z.infer<typeof schema>;
const ok: Out = { name: 'A', age: 10, active: true };
// @ts-expect-error incorrect output
const bad: Out = { name: 2, age: 10, active: true };
const same: original.ZodType = schema;
validate({ body: schema });
validate({ body: v3.object({ x: v3.string() }) });
validate({ body: mini.object({ x: mini.string() }) });
void [ok, bad, same, ZodError];
