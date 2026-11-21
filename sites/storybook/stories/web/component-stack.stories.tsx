import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Tag } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Layout/Stack',
  component: Stack,
  parameters: {
    docs: {
      description: {
        component:
          'Arrange children along one axis with theme spacing between them. Use direction and flexWrap for rows that can wrap.',
      },
    },
  },
} satisfies Meta<typeof Stack>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Tag>Design</Tag>
        <Tag>Frontend</Tag>
        <Tag>Mobile</Tag>
      </Stack>
    );
  },
};
