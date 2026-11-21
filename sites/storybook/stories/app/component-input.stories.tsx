import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Forms/Input',
  component: Input,
  parameters: {
    docs: {
      description: {
        component:
          'Use a labeled TextInput with onChangeText to capture edits. Add an error when validation fails.',
      },
    },
  },
} satisfies Meta<typeof Input>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Input
        label="Work email"
        keyboardType="email-address"
        autoCapitalize="none"
        defaultValue="hello"
        error="Enter a complete email address"
      />
    );
  },
};
