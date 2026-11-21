import type { Meta, StoryObj } from '@storybook/react-vite';
import { Rating } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Forms/Rating',
  component: Rating,
  parameters: {
    docs: {
      description: {
        component:
          'Collect a bounded rating with a default value or a controlled value. Use readOnly when displaying a rating.',
      },
    },
  },
} satisfies Meta<typeof Rating>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return <Rating defaultValue={3} max={5} precision={1} showValue />;
  },
};
