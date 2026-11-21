import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Feedback/Alert',
  component: Alert,
  parameters: {
    docs: {
      description: {
        component:
          'Show persistent feedback in context. Use severity to select a semantic color and supply a clear message.',
      },
    },
  },
} satisfies Meta<typeof Alert>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Alert severity="success" variant="outlined">
        Project settings were saved.
      </Alert>
    );
  },
};
