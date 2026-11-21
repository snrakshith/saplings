import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Layout/Card',
  component: Card,
  parameters: {
    docs: {
      description: {
        component:
          'Group native content on a themed surface. Use outlined to control the boundary and padding to add internal spacing.',
      },
    },
  },
} satisfies Meta<typeof Card>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Card outlined padding={3}>
        <Typography variant="h6">Workspace overview</Typography>
        <Typography>Three projects are ready to review.</Typography>
      </Card>
    );
  },
};
