import type { Meta, StoryObj } from '@storybook/react-vite';
import { Progress, Stack, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Feedback/Progress',
  component: Progress,
  parameters: {
    docs: {
      description: {
        component:
          'Display progress relative to a maximum value. Provide a useful label for assistive technology.',
      },
    },
  },
} satisfies Meta<typeof Progress>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Stack gap={2}>
        <Typography>Files uploaded</Typography>
        <Progress value={3} max={5} label="File upload progress" />
      </Stack>
    );
  },
};
