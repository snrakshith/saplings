import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Navbar } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Navigation/Navbar',
  component: Navbar,
  parameters: {
    docs: {
      description: {
        component:
          'Assemble Navbar.Brand, Navbar.Content, and Navbar.Actions to group identity, navigation, and controls.',
      },
    },
  },
} satisfies Meta<typeof Navbar>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Navbar>
        <Navbar.Brand>Workspace</Navbar.Brand>
        <Navbar.Content>
          <Button variant="text">Projects</Button>
        </Navbar.Content>
        <Navbar.Actions>
          <Button>New project</Button>
        </Navbar.Actions>
      </Navbar>
    );
  },
};
