import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Forms/Checkbox',
  component: Checkbox,
  parameters: {
    docs: {
      description: {
        component:
          'Pass checked and onChange for a controlled native checkbox with an accessible label.',
      },
    },
  },
} satisfies Meta<typeof Checkbox>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [checked, setChecked] = useState(false);
    return <Checkbox label="Include archived projects" checked={checked} onChange={setChecked} />;
  },
};
