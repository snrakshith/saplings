import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, Button } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Feedback/Badge',
  component: Badge,
  parameters: {
    docs: {
      description: {
        component:
          'Add a count or status dot to nearby content. Use max for counts that can outgrow the available space.',
      },
    },
  },
} satisfies Meta<typeof Badge>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Badge badgeContent={12} color="info">
        <Button variant="text">Inbox</Button>
      </Badge>
    );
  },
};
