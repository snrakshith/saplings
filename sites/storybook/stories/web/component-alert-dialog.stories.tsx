import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlertDialog, Button, Stack, Typography } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Overlays/AlertDialog',
  component: AlertDialog,
  parameters: {
    docs: {
      description: {
        component:
          'Ask for an explicit confirmation before an important action. Provide separate cancel and confirm paths.',
      },
    },
  },
} satisfies Meta<typeof AlertDialog>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState('');
    return (
      <Stack spacing={2}>
        <Button onClick={() => setOpen(true)}>Archive project</Button>
        <Typography role="status">{result}</Typography>
        <AlertDialog
          open={open}
          title="Archive this project?"
          description="You can restore it later."
          confirmText="Archive"
          severity="warning"
          onClose={() => setOpen(false)}
          onConfirm={() => {
            setOpen(false);
            setResult('Project archived');
          }}
        />
      </Stack>
    );
  },
};
