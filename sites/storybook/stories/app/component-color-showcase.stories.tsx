import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorShowcase } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Theme/ColorShowcase',
  component: ColorShowcase,
  parameters: {
    docs: {
      description: {
        component:
          'Browse ui-core color families and shades using the native swatch component. See Foundations for semantic role values in the current mode.',
      },
    },
  },
} satisfies Meta<typeof ColorShowcase>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return <ColorShowcase />;
  },
};
