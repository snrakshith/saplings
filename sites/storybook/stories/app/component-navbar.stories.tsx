import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Navbar } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Navigation/Navbar',
  component: Navbar,
  parameters: {
    docs: {
      description: { component: 'Display a screen title with leading and trailing action slots.' },
    },
  },
} satisfies Meta<typeof Navbar>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Navbar
        title="Projects"
        left={<Button variant="text">Back</Button>}
        right={<Button>New</Button>}
      />
    );
  },
};
