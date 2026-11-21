import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox, Stack } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Forms/Checkbox',
  component: Checkbox,
  parameters: {
    docs: {
      description: {
        component:
          'Capture a binary choice with a visible label. A group-level checkbox can use indeterminate to show a mixed selection.',
      },
    },
  },
} satisfies Meta<typeof Checkbox>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Stack spacing={1}>
        <Checkbox label="Include archived projects" />
        <Checkbox label="Select all projects" indeterminate />
      </Stack>
    );
  },
};
