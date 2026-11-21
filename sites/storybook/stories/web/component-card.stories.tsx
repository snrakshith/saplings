import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, Typography } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Layout/Card',
  component: Card,
  parameters: {
    docs: {
      description: {
        component:
          'Group related information in a themed paper surface. Choose an outlined border or a shadow elevation from the theme.',
      },
    },
  },
} satisfies Meta<typeof Card>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Card variant="elevated" elevation={2} padding={3}>
        <Typography variant="h6">Workspace overview</Typography>
        <Typography>Three projects are ready to review.</Typography>
      </Card>
    );
  },
};
