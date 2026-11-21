import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Rating } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Forms/Rating',
  component: Rating,
  parameters: {
    docs: {
      description: {
        component:
          'Collect a controlled rating from a bounded scale. Use readonly when showing an existing value.',
      },
    },
  },
} satisfies Meta<typeof Rating>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [value, setValue] = useState(3);
    return <Rating value={value} onChange={setValue} max={5} label="Workspace experience" />;
  },
};
