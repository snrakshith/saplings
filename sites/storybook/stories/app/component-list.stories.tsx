import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { List, Stack, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Data display/List',
  component: List,
  parameters: {
    docs: {
      description: {
        component:
          'Render a short list from typed data. Each item supplies a stable key and an optional subtitle; onPress receives the item value.',
      },
    },
  },
} satisfies Meta<typeof List>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [selected, setSelected] = useState('None');
    return (
      <Stack gap={2}>
        <List
          items={[
            { key: 'web', title: 'Website', subtitle: 'Active', value: 'Website' },
            { key: 'app', title: 'Mobile app', subtitle: 'Paused', value: 'Mobile app' },
          ]}
          onPress={setSelected}
        />
        <Typography accessibilityLiveRegion="polite">Selected: {selected}</Typography>
      </Stack>
    );
  },
};
