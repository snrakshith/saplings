import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Tag } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Feedback/Tag',
  component: Tag,
  parameters: {
    docs: {
      description: {
        component:
          'Label an item with a short category or state. Passing onRemove makes the tag removable.',
      },
    },
  },
} satisfies Meta<typeof Tag>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [visible, setVisible] = useState(true);
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Tag color="success">Ready</Tag>
        {visible && (
          <Tag color="info" variant="outlined" onRemove={() => setVisible(false)}>
            External
          </Tag>
        )}
      </Stack>
    );
  },
};
