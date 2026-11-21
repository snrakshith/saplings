import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Stack, Toast } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Feedback/Toast',
  component: Toast,
  parameters: {
    docs: {
      description: {
        component:
          'Render a transient message with controlled visibility. Supply onDismiss when the user can dismiss it.',
      },
    },
  },
} satisfies Meta<typeof Toast>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [visible, setVisible] = useState(false);
    return (
      <Stack gap={2}>
        <Button onPress={() => setVisible(true)}>Show confirmation</Button>
        <Toast
          message="Project saved"
          tone="success"
          visible={visible}
          onDismiss={() => setVisible(false)}
        />
      </Stack>
    );
  },
};
