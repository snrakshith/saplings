import type { Meta, StoryObj } from '@storybook/react-vite';
import { List, ListItem } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Data display/ListItem',
  component: ListItem,
  parameters: {
    docs: {
      description: {
        component:
          'Use ListItem as a child of List. Use selected to communicate the current selection and disabled for an unavailable item.',
      },
    },
  },
} satisfies Meta<typeof ListItem>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <List>
        <ListItem>Overview</ListItem>
        <ListItem selected>Current project</ListItem>
        <ListItem disabled>Archived projects</ListItem>
      </List>
    );
  },
};
