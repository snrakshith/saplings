import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sidebar } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Navigation/Sidebar',
  component: Sidebar,
  parameters: {
    docs: {
      description: {
        component:
          'Compose Sidebar.Header, Sidebar.Content, Sidebar.Footer, and Sidebar.Item to organize in-page navigation.',
      },
    },
  },
} satisfies Meta<typeof Sidebar>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Sidebar aria-label="Project menu">
        <Sidebar.Header>Workspace</Sidebar.Header>
        <Sidebar.Content>
          <Sidebar.Item>Projects</Sidebar.Item>
          <Sidebar.Item>Activity</Sidebar.Item>
        </Sidebar.Content>
        <Sidebar.Footer>Settings</Sidebar.Footer>
      </Sidebar>
    );
  },
};
