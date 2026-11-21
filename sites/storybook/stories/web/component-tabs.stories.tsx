import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Tab, Tabs, Typography } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Navigation/Tabs',
  component: Tabs,
  parameters: {
    docs: {
      description: {
        component:
          'Use Tab children and a controlled numeric selection to switch between panels. The example switches a labeled panel.',
      },
    },
  },
} satisfies Meta<typeof Tabs>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [active, setActive] = useState(0);
    return (
      <Stack spacing={2}>
        <Tabs value={active} onChange={setActive} aria-label="Project views">
          <Tab label="Overview" />
          <Tab label="Activity" />
        </Tabs>
        <Typography role="tabpanel">
          {active === 0 ? 'Project overview' : 'Recent activity'}
        </Typography>
      </Stack>
    );
  },
};
