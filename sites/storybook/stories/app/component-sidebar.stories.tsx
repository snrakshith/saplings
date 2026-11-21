import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Sidebar, Stack } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Navigation/Sidebar',
  component: Sidebar,
  parameters: {
    docs: {
      description: {
        component:
          'Use a controlled left drawer as a navigation sidebar. Supply a title and close it when an item is chosen.',
      },
    },
  },
} satisfies Meta<typeof Sidebar>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [visible, setVisible] = useState(false);
    return (
      <>
        <Button onPress={() => setVisible(true)}>Show navigation</Button>
        <Sidebar visible={visible} onClose={() => setVisible(false)} title="Navigation">
          <Stack gap={2}>
            <Button variant="text" onPress={() => setVisible(false)}>
              Projects
            </Button>
            <Button variant="text" onPress={() => setVisible(false)}>
              Activity
            </Button>
          </Stack>
        </Sidebar>
      </>
    );
  },
};
