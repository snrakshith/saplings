import {test} from 'vitest';
import {cases} from '../scripts/consolidation-fixtures.mjs';
for(const scenario of cases)test(scenario.name,scenario.run);
