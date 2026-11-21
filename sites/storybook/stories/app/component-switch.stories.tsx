import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Forms/Switch',
  component: Switch,
  parameters: {
    docs: {
      description: {
        component:
          'Toggle an immediate preference with a controlled boolean and an accessible name.',
      },
    },
  },
} satisfies Meta<typeof Switch>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [enabled, setEnabled] = useState(true);
    return <Switch label="Weekly summary" checked={enabled} onChange={setEnabled} />;
  },
};
