import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner, Stack, Typography } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Feedback/Spinner',
  component: Spinner,
  parameters: {
    docs: {
      description: {
        component:
          'Indicate that work is in progress. Provide a nearby status or a meaningful accessible label.',
      },
    },
  },
} satisfies Meta<typeof Spinner>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Stack direction="row" spacing={2} alignItems="center">
        <Spinner aria-label="Loading projects" />
        <Typography>Loading projects</Typography>
      </Stack>
    );
  },
};
