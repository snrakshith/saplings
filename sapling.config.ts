import { defineSaplingConfig } from '@saplings/sdk';
import { sampleConfig } from './apps/api/src/sapling.config.ts';
import quality from './examples/configs/fullstack-quality-profile.ts';

// Use the same SDK and platform configuration as the sample API.
export default defineSaplingConfig({
  ...sampleConfig(Number(process.env.PORT ?? 3000)),
  quality,
});
