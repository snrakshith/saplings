import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroup } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Forms/RadioGroup',
  component: RadioGroup,
  parameters: {
    docs: {
      description: {
        component:
          'Render related choices from an options array. Use value and onChange to keep the selected option in application state.',
      },
    },
  },
} satisfies Meta<typeof RadioGroup>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [value, setValue] = useState('team');
    return (
      <RadioGroup
        name="visibility"
        label="Project visibility"
        options={[
          { value: 'team', label: 'Team' },
          { value: 'private', label: 'Private' },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
};
