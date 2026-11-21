import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Feedback/Badge',
  component: Badge,
  parameters: {
    docs: {
      description: {
        component: 'Display a label or short status in one of the ui-core semantic tones.',
      },
    },
  },
} satisfies Meta<typeof Badge>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return <Badge tone="warning">Review required</Badge>;
  },
};
