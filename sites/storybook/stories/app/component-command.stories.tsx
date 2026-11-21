import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Command, Stack, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Overlays/Command',
  component: Command,
  parameters: {
    docs: {
      description: {
        component:
          'Filter actions by label or keyword. Select an enabled item to receive its identifier through onSelect.',
      },
    },
  },
} satisfies Meta<typeof Command>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [selected, setSelected] = useState('None');
    return (
      <Stack gap={2}>
        <Command
          options={[
            { id: 'create-project', label: 'Create project', keywords: 'new' },
            { id: 'open-settings', label: 'Open settings' },
            { id: 'archive', label: 'Archive project', disabled: true },
          ]}
          onSelect={setSelected}
        />
        <Typography accessibilityLiveRegion="polite">Selected: {selected}</Typography>
      </Stack>
    );
  },
};
