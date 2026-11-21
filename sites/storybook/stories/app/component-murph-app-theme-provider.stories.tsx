import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, MurphAppThemeProvider } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Theme/MurphAppThemeProvider',
  component: MurphAppThemeProvider,
  parameters: {
    docs: {
      description: {
        component:
          'Wrap the native tree to supply shared tokens. Set defaultMode to system to follow the device or pass a specific starting mode and overrides.',
      },
    },
  },
} satisfies Meta<typeof MurphAppThemeProvider>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <MurphAppThemeProvider defaultMode="light" overrides={{ primary: '#0e7557', radius: 12 }}>
        <Button>Brand action</Button>
      </MurphAppThemeProvider>
    );
  },
};
