import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd, Stack, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Typography/Kbd',
  component: Kbd,
  parameters: {
    docs: {
      description: {
        component: 'Display a short keyboard or hardware shortcut in a bordered label.',
      },
    },
  },
} satisfies Meta<typeof Kbd>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Stack direction="row" gap={1} align="center">
        <Kbd>Ctrl</Kbd>
        <Typography>+</Typography>
        <Kbd>K</Kbd>
      </Stack>
    );
  },
};
