import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Forms/Textarea',
  component: Textarea,
  parameters: {
    docs: {
      description: {
        component:
          'Accept multiline text. A label describes the field and helperText can state a character limit or purpose.',
      },
    },
  },
} satisfies Meta<typeof Textarea>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Textarea
        label="Release notes"
        rows={4}
        maxLength={240}
        helperText="Up to 240 characters"
        placeholder="Describe what changed"
      />
    );
  },
};
