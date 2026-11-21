import type { Meta, StoryObj } from '@storybook/react-vite';
import { Feedback } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Feedback/Feedback',
  component: Feedback,
  parameters: {
    docs: {
      description: {
        component:
          'Use this Alert alias to show a message about an operation. It accepts the same tones and title.',
      },
    },
  },
} satisfies Meta<typeof Feedback>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Feedback title="Ready to review" tone="info">
        Two projects are awaiting review.
      </Feedback>
    );
  },
};
