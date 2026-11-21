import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Breadcrumb, Stack, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Navigation/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    docs: {
      description: {
        component:
          'Show an ancestor path with optional press actions. Use a plain final label for the current location.',
      },
    },
  },
} satisfies Meta<typeof Breadcrumb>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [location, setLocation] = useState('Website');
    return (
      <Stack gap={2}>
        <Breadcrumb
          items={[
            { label: 'Workspace', onPress: () => setLocation('Workspace') },
            { label: 'Projects', onPress: () => setLocation('Projects') },
            { label: 'Website' },
          ]}
        />
        <Typography accessibilityLiveRegion="polite">Viewing: {location}</Typography>
      </Stack>
    );
  },
};
