import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Tabs, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Navigation/Tabs',
  component: Tabs,
  parameters: {
    docs: {
      description: {
        component:
          'Render controlled native tabs from an array with stable string values. Display the content associated with the selected tab.',
      },
    },
  },
} satisfies Meta<typeof Tabs>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [active, setActive] = useState('overview');
    return (
      <Stack gap={2}>
        <Tabs
          tabs={[
            { label: 'Overview', value: 'overview' },
            { label: 'Activity', value: 'activity' },
          ]}
          value={active}
          onChange={setActive}
        />
        <Typography>{active === 'overview' ? 'Project overview' : 'Recent activity'}</Typography>
      </Stack>
    );
  },
};
