import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd, Stack } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Typography/Kbd',
  component: Kbd,
  parameters: {
    docs: {
      description: {
        component:
          'Format keyboard shortcuts as kbd elements. Use one key per element so combinations remain readable.',
      },
    },
  },
} satisfies Meta<typeof Kbd>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Kbd>Ctrl</Kbd>
        <span>+</span>
        <Kbd>K</Kbd>
      </Stack>
    );
  },
};
