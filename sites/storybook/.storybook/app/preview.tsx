import type { Preview } from '@storybook/react-vite';
import { MurphAppThemeProvider } from '@saplings/murph-appui';
import { preview } from '../shared-preview.ts';

export default {
  ...preview,
  decorators: [
    (Story, { globals }) => {
      const mode = globals.colorMode === 'dark' ? 'dark' : 'light';
      return (
        <MurphAppThemeProvider key={mode} defaultMode={mode}>
          <Story />
        </MurphAppThemeProvider>
      );
    },
  ],
} satisfies Preview;
