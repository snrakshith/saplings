import type { Preview } from '@storybook/react-vite';
import { MurphiThemeProvider } from '@saplings/murphi-ui';
import { preview } from '../shared-preview.ts';

export default {
  ...preview,
  decorators: [
    (Story, { globals }) => {
      const mode = globals.colorMode === 'dark' ? 'dark' : 'light';
      return (
        <MurphiThemeProvider key={mode} defaultMode={mode}>
          <Story />
        </MurphiThemeProvider>
      );
    },
  ],
} satisfies Preview;
