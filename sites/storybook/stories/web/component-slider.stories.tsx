import type { Meta, StoryObj } from '@storybook/react-vite';
import { Slider } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Forms/Slider',
  component: Slider,
  parameters: {
    docs: {
      description: {
        component:
          'Choose a number from a range. The example uses a fixed step and displays the selected value.',
      },
    },
  },
} satisfies Meta<typeof Slider>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return <Slider label="Volume" min={0} max={100} step={5} defaultValue={40} showValue />;
  },
};
