import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlertDialog, Button, Stack, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Overlays/AlertDialog',
  component: AlertDialog,
  parameters: {
    docs: {
      description: {
        component:
          'Ask for confirmation with distinct confirm and cancel actions. The destructive option changes the confirm button treatment.',
      },
    },
  },
} satisfies Meta<typeof AlertDialog>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [visible, setVisible] = useState(false);
    const [result, setResult] = useState('');
    return (
      <Stack gap={2}>
        <Button onPress={() => setVisible(true)}>Archive project</Button>
        <Typography accessibilityLiveRegion="polite">{result}</Typography>
        <AlertDialog
          visible={visible}
          title="Archive this project?"
          description="You can restore it later."
          confirmLabel="Archive"
          destructive
          onCancel={() => setVisible(false)}
          onConfirm={() => {
            setVisible(false);
            setResult('Project archived');
          }}
        />
      </Stack>
    );
  },
};
