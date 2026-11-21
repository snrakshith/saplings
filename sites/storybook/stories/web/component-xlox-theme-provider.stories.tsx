import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, XloxThemeProvider } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Theme/XloxThemeProvider',
  component: XloxThemeProvider,
  parameters: {
    docs: {
      description: {
        component:
          'Compatibility alias for MurphiThemeProvider. It supplies the same theme and accepts the same props.',
      },
    },
  },
} satisfies Meta<typeof XloxThemeProvider>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <XloxThemeProvider defaultMode="light">
        <Button variant="outlined">Themed action</Button>
      </XloxThemeProvider>
    );
  },
};
