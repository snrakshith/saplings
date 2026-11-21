import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Forms/Input',
  component: Input,
  parameters: {
    docs: {
      description: {
        component:
          'Use a labeled text field with helper text or a validation error. The example demonstrates the error state.',
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
        type="email"
        defaultValue="hello"
        error="Enter a complete email address"
      />
    );
  },
};
