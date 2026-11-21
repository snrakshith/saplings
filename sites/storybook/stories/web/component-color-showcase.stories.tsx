import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorShowcase } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Theme/ColorShowcase',
  component: ColorShowcase,
  parameters: {
    docs: {
      description: {
        component:
          'Browse the palette ramps from ui-core. This example displays the blue family; the Foundations reference covers semantic roles and mode differences.',
      },
    },
  },
} satisfies Meta<typeof ColorShowcase>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return <ColorShowcase colorName="blue" />;
  },
};
