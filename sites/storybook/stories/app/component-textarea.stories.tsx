import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Forms/Textarea',
  component: Textarea,
  parameters: {
    docs: {
      description: {
        component:
          'Collect multiline text in a native input. Configure maxLength and provide a clear label or helper text.',
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
        maxLength={240}
        helperText="Up to 240 characters"
        placeholder="Describe what changed"
      />
    );
  },
};
