import type { Preview } from '@storybook/react-vite';

export const preview: Preview = {
  tags: ['autodocs'],
  initialGlobals: { colorMode: 'light' },
  globalTypes: {
    colorMode: {
      description: 'Component theme',
      toolbar: {
        title: 'Theme',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
};
