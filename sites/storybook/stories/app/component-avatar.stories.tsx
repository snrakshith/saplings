import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Data display/Avatar',
  component: Avatar,
  parameters: {
    docs: {
      description: {
        component:
          'Identify a person with an image or readable fallback initials. The numeric size controls both dimensions.',
      },
    },
  },
} satisfies Meta<typeof Avatar>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return <Avatar initials="ML" size={64} accessibilityLabel="Morgan Lee" />;
  },
};
