import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Typography } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Typography/Typography',
  component: Typography,
  parameters: {
    docs: {
      description: {
        component:
          'Render a ui-core type variant. Use component to choose an HTML heading independently from the visual variant.',
      },
    },
  },
} satisfies Meta<typeof Typography>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Stack spacing={1}>
        <Typography variant="h4" component="h2">
          Workspace
        </Typography>
        <Typography variant="body1">Review your active projects.</Typography>
        <Typography variant="caption">Updated today</Typography>
      </Stack>
    );
  },
};
