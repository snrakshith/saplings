import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig, type UserConfig } from 'vite';

export function createConfig(target: 'web' | 'app', vite: UserConfig = {}): StorybookConfig {
  return {
    framework: '@storybook/react-vite',
    stories: [`../../stories/${target}/*.stories.tsx`],
    addons: ['@storybook/addon-docs'],
    core: { disableTelemetry: true },
    async viteFinal(config) {
      return mergeConfig(config, { base: './', ...vite });
    },
  };
}
