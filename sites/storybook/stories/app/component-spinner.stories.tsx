import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner, Stack, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Feedback/Spinner',
  component: Spinner,
  parameters: {
    docs: {
      description: {
        component:
          'Show an activity indicator while a task is running. Set label to describe what is loading.',
      },
    },
  },
} satisfies Meta<typeof Spinner>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Stack direction="row" gap={2} align="center">
        <Spinner label="Loading projects" />
        <Typography>Loading projects</Typography>
      </Stack>
    );
  },
};
