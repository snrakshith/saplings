import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Forms/Select',
  component: Select,
  parameters: {
    docs: {
      description: {
        component:
          'Pick a value in a modal. The selection sheet supports disabled options and emits the selected value through onChange.',
      },
    },
  },
} satisfies Meta<typeof Select>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [value, setValue] = useState('active');
    return (
      <Select
        label="Project status"
        value={value}
        onChange={setValue}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'paused', label: 'Paused' },
          { value: 'archived', label: 'Archived', disabled: true },
        ]}
      />
    );
  },
};
