import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Typography/Text',
  component: Text,
  parameters: {
    docs: {
      description: {
        component:
          'Text is an alias of Typography with the same variants, semantic colors, and native Text props.',
      },
    },
  },
} satisfies Meta<typeof Text>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Text variant="subtitle1" color="primary">
        This text uses the shared typography scale
      </Text>
    );
  },
};
