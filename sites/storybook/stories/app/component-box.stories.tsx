import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Layout/Box',
  component: Box,
  parameters: {
    docs: {
      description: {
        component:
          'Use Box for a native view with semantic background roles. Padding and gap convert design units through spacingPx.',
      },
    },
  },
} satisfies Meta<typeof Box>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Box background="surface" padding={2} radius={8}>
        <Typography>Surface with two units of padding</Typography>
      </Box>
    );
  },
};
