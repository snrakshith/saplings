import type { Meta, StoryObj } from '@storybook/react-vite';
import { Divider, Stack, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Layout/Divider',
  component: Divider,
  parameters: {
    docs: {
      description: {
        component:
          'Show a visual divider between native views. Size and spacing are numeric values.',
      },
    },
  },
} satisfies Meta<typeof Divider>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Stack gap={2}>
        <Typography>Active projects</Typography>
        <Divider spacing={8} />
        <Typography>Archived projects</Typography>
      </Stack>
    );
  },
};
