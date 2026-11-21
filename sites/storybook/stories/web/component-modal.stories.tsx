import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Modal, Typography } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Overlays/Modal',
  component: Modal,
  parameters: {
    docs: {
      description: {
        component:
          'Open a focused task in a labeled dialog. Control the open state and handle dismissal through onClose.',
      },
    },
  },
} satisfies Meta<typeof Modal>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open project settings</Button>
        <Modal title="Project settings" open={open} onClose={() => setOpen(false)}>
          <Typography>Review project preferences.</Typography>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </Modal>
      </>
    );
  },
};
