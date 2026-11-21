import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Command, Stack, Typography } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Overlays/Command',
  component: Command,
  parameters: {
    docs: {
      description: {
        component:
          'Filter executable actions by label or keywords. Each command item supplies its own onSelect handler.',
      },
    },
  },
} satisfies Meta<typeof Command>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [selected, setSelected] = useState('None');
    return (
      <Stack spacing={2}>
        <Command
          items={[
            {
              id: 'create',
              label: 'Create project',
              keywords: ['new'],
              onSelect: () => setSelected('Create project'),
            },
            { id: 'open', label: 'Open settings', onSelect: () => setSelected('Open settings') },
          ]}
        />
        <Typography role="status">Selected: {selected}</Typography>
      </Stack>
    );
  },
};
