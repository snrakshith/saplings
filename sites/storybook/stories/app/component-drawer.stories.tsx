import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Drawer, Stack, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Overlays/Drawer',
  component: Drawer,
  parameters: {
    docs: {
      description: {
        component:
          'Open a modal sheet attached to the bottom or a side of the screen. Use onClose to update the visible state.',
      },
    },
  },
} satisfies Meta<typeof Drawer>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [visible, setVisible] = useState(false);
    return (
      <>
        <Button onPress={() => setVisible(true)}>Show filters</Button>
        <Drawer
          side="bottom"
          visible={visible}
          onClose={() => setVisible(false)}
          title="Project filters"
        >
          <Stack gap={2}>
            <Typography>Filter by project status.</Typography>
            <Button onPress={() => setVisible(false)}>Apply filters</Button>
          </Stack>
        </Drawer>
      </>
    );
  },
};
