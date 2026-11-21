import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator, Stack, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Layout/Separator',
  component: Separator,
  parameters: {
    docs: {
      description: {
        component:
          'Use this alias of Divider when separating two groups of content. The same sizing props are available.',
      },
    },
  },
} satisfies Meta<typeof Separator>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Stack gap={2}>
        <Typography>Preferences</Typography>
        <Separator />
        <Typography>Notifications</Typography>
      </Stack>
    );
  },
};
