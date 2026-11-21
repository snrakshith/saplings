import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Tag } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Layout/Stack',
  component: Stack,
  parameters: {
    docs: {
      description: {
        component:
          'Lay out native views vertically or horizontally. The gap prop uses the ui-core spacing and density scale.',
      },
    },
  },
} satisfies Meta<typeof Stack>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Stack direction="row" gap={2} wrap>
        <Tag>Design</Tag>
        <Tag>Frontend</Tag>
        <Tag>Mobile</Tag>
      </Stack>
    );
  },
};
