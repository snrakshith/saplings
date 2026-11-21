import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Drawer, Stack, Typography } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Overlays/Drawer',
  component: Drawer,
  parameters: {
    docs: {
      description: {
        component:
          'Slide a panel in from an edge. Use anchor to choose a side and onClose to update the controlled open state.',
      },
    },
  },
} satisfies Meta<typeof Drawer>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Show filters</Button>
        <Drawer
          anchor="right"
          open={open}
          onClose={() => setOpen(false)}
          aria-label="Project filters"
        >
          <Stack spacing={2} style={{ padding: 16 }}>
            <Typography variant="h6">Project filters</Typography>
            <Button onClick={() => setOpen(false)}>Apply filters</Button>
          </Stack>
        </Drawer>
      </>
    );
  },
};
