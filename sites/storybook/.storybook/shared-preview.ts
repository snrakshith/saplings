import type { Preview } from '@storybook/react-vite';

export const preview: Preview = {
  initialGlobals: { colorMode: 'light', density: 'comfortable' },
  globalTypes: {
    density: {
      description: 'Control and spacing density',
      toolbar: {
        title: 'Density',
        items: ['comfortable', 'compact'],
        dynamicTitle: true,
      },
    },
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
