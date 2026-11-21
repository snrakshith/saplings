import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Modal, Stack, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Overlays/Modal',
  component: Modal,
  parameters: {
    docs: {
      description: {
        component:
          'Use visible and onClose to control a native modal. Provide a descriptive title and an explicit action to close it.',
      },
    },
  },
} satisfies Meta<typeof Modal>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [visible, setVisible] = useState(false);
    return (
      <>
        <Button onPress={() => setVisible(true)}>Open project settings</Button>
        <Modal title="Project settings" visible={visible} onClose={() => setVisible(false)}>
          <Stack gap={2}>
            <Typography>Review project preferences.</Typography>
            <Button onPress={() => setVisible(false)}>Done</Button>
          </Stack>
        </Modal>
      </>
    );
  },
};
