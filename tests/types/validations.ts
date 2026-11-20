import {z} from '@saplings/validations/native';
const user=z.object({name:z.string(),age:z.coerce.number().int(),active:z.boolean().default(true),nickname:z.string().optional()});
type User=z.infer<typeof user>;
const valid:User={name:'Alice',age:30,active:true};
// @ts-expect-error name must be string
const invalid:User={name:123,age:30,active:true};
// @ts-expect-error default output is required
const invalidDefault:User={name:'Alice',age:30};
const input:z.input<typeof user>={name:'Alice',age:'30'};
void [valid,invalid,invalidDefault,input];
