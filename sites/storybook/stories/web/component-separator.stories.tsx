import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator, Stack, Typography } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Layout/Separator',
  component: Separator,
  parameters: {
    docs: {
      description: {
        component:
          'Divide neighboring content with a compact rule. Use decorative for purely visual separators.',
      },
    },
  },
} satisfies Meta<typeof Separator>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Stack spacing={2}>
        <Typography>Preferences</Typography>
        <Separator decorative />
        <Typography>Notifications</Typography>
      </Stack>
    );
  },
};
