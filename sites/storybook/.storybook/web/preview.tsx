import type { Preview } from '@storybook/react-vite';
import { MurphiThemeProvider } from '@saplings/murphi-ui';
import { StoryCanvas, storyTheme } from '../story-theme.tsx';
import { preview } from '../shared-preview.ts';

export default {
  ...preview,
  decorators: [
    (Story, { globals }) => {
      const { mode, density } = storyTheme(globals);
      return (
        <MurphiThemeProvider key={mode} defaultMode={mode} overrides={{ density }}>
          <StoryCanvas mode={mode} density={density}>
            <Story />
          </StoryCanvas>
        </MurphiThemeProvider>
      );
    },
  ],
} satisfies Preview;
