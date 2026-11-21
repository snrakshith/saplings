import type { Meta, StoryObj } from '@storybook/react-vite';
import { Progress, Stack, Typography } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Feedback/Progress',
  component: Progress,
  parameters: {
    docs: {
      description: {
        component:
          'Show completion when a percentage is known. Use indeterminate when the operation cannot report progress.',
      },
    },
  },
} satisfies Meta<typeof Progress>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Stack spacing={2}>
        <Typography>Upload in progress</Typography>
        <Progress value={65} aria-label="Upload progress" />
      </Stack>
    );
  },
};
