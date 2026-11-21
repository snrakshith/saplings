import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Tag } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Feedback/Tag',
  component: Tag,
  parameters: {
    docs: {
      description: {
        component:
          'Label a category or state. When onRemove is supplied, the native tag exposes a remove action.',
      },
    },
  },
} satisfies Meta<typeof Tag>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [visible, setVisible] = useState(true);
    return (
      <Stack direction="row" gap={1}>
        <Tag>Ready</Tag>
        {visible && <Tag onRemove={() => setVisible(false)}>External</Tag>}
      </Stack>
    );
  },
};
