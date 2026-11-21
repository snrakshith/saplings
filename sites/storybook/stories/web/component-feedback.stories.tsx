import type { Meta, StoryObj } from '@storybook/react-vite';
import { Feedback } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Feedback/Feedback',
  component: Feedback,
  parameters: {
    docs: {
      description: {
        component:
          'Collect a positive or negative response. The uncontrolled example can deselect the current choice.',
      },
    },
  },
} satisfies Meta<typeof Feedback>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return <Feedback showLabels upLabel="Helpful" downLabel="Needs work" allowDeselect />;
  },
};
