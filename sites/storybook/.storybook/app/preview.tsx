import type { Preview } from '@storybook/react-vite';
import { MurphAppThemeProvider } from '@saplings/murph-appui';
import { StoryCanvas, storyTheme } from '../story-theme.tsx';
import { preview } from '../shared-preview.ts';

export default {
  ...preview,
  decorators: [
    (Story, { globals }) => {
      const { mode, density } = storyTheme(globals);
      return (
        <MurphAppThemeProvider key={mode} defaultMode={mode} overrides={{ density }}>
          <StoryCanvas mode={mode} density={density}>
            <Story />
          </StoryCanvas>
        </MurphAppThemeProvider>
      );
    },
  ],
} satisfies Preview;
