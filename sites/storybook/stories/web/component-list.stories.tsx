import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { List, ListItem } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Data display/List',
  component: List,
  parameters: {
    docs: {
      description: {
        component:
          'Render a semantic list containing ListItem children. Use dense for compact rows and button for selectable rows.',
      },
    },
  },
} satisfies Meta<typeof List>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    const [selected, setSelected] = useState('overview');
    return (
      <List dense>
        <ListItem button selected={selected === 'overview'} onClick={() => setSelected('overview')}>
          Overview
        </ListItem>
        <ListItem button selected={selected === 'activity'} onClick={() => setSelected('activity')}>
          Activity
        </ListItem>
      </List>
    );
  },
};
