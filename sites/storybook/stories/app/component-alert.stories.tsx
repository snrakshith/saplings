import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Feedback/Alert',
  component: Alert,
  parameters: {
    docs: {
      description: {
        component:
          'Display persistent contextual feedback. Choose a tone for its semantic color and supply a short message.',
      },
    },
  },
} satisfies Meta<typeof Alert>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Alert title="Saved" tone="success">
        Project settings were saved.
      </Alert>
    );
  },
};
