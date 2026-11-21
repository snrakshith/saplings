import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, MurphiThemeProvider } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Theme/MurphiThemeProvider',
  component: MurphiThemeProvider,
  parameters: {
    docs: {
      description: {
        component:
          'Wrap the React web tree to supply the shared theme and Emotion styling. Pass defaultMode and overrides for service-specific branding.',
      },
    },
  },
} satisfies Meta<typeof MurphiThemeProvider>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <MurphiThemeProvider defaultMode="light" overrides={{ primary: '#0e7557', radius: 12 }}>
        <Button>Brand action</Button>
      </MurphiThemeProvider>
    );
  },
};
