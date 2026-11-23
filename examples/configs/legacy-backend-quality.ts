import { defineSaplingConfig } from '@saplings/sdk';
import { backendQualityProfile } from './legacy-backend-suites.ts';

export default defineSaplingConfig({
  app: { id: 'saplings-starter', environment: 'development' },
  quality: backendQualityProfile(),
});
