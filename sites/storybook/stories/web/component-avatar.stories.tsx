import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Data display/Avatar',
  component: Avatar,
  parameters: {
    docs: {
      description: {
        component:
          'Identify a person with an image or fallback initials. The example uses initials and an accessible label.',
      },
    },
  },
} satisfies Meta<typeof Avatar>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Avatar size="large" variant="rounded" alt="Morgan Lee">
        ML
      </Avatar>
    );
  },
};
