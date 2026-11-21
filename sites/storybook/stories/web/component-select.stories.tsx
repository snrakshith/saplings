import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Forms/Select',
  component: Select,
  parameters: {
    docs: {
      description: {
        component:
          'Pick one item from a native HTML select. Disabled options can show unavailable values without making them selectable.',
      },
    },
  },
} satisfies Meta<typeof Select>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Select
        label="Project status"
        defaultValue="active"
        options={[
          { value: 'active', label: 'Active' },
          { value: 'paused', label: 'Paused' },
          { value: 'archived', label: 'Archived', disabled: true },
        ]}
      />
    );
  },
};
