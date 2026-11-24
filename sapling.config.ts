import { defineSaplingConfig } from '@saplings/sdk';
import { starterConfig } from './starter/backend/src/config/sapling.ts';
import quality from './examples/configs/fullstack-quality-profile.ts';

// Use the same SDK and platform configuration as the starter API.
export default defineSaplingConfig({
  ...starterConfig(Number(process.env.PORT ?? 3000)),
  quality,
});
