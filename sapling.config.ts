import { defineSaplingConfig } from '@saplings/sdk';
import quality from './examples/configs/fullstack-quality-profile.ts';

// Demo configuration; replace targets and credentials for your own application.
export default defineSaplingConfig({
  app: { id: 'sapling-fullstack-demo', environment: 'development' },
  quality,
  middleware: { correlationId: true },
  realtime: { enabled: false },
});
