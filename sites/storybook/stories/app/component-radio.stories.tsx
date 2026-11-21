import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Radio } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Forms/Radio',
  component: Radio,
  parameters: {
    docs: {
      description: {
        component:
          'Render a selectable radio item. Use RadioGroup when several options share one selected value.',
      },
    },
  },
} satisfies Meta<typeof Radio>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [selected, setSelected] = useState(false);
    return <Radio label="Weekly delivery" selected={selected} onChange={() => setSelected(true)} />;
  },
};
