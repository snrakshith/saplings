import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Layout/Box',
  component: Box,
  parameters: {
    docs: {
      description: {
        component:
          'Use Box for a low-level layout container. Numeric padding follows the theme spacing scale. The as prop controls the HTML element.',
      },
    },
  },
} satisfies Meta<typeof Box>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Box as="section" padding={2} borderRadius={8}>
        <Typography>Box with two units of padding</Typography>
      </Box>
    );
  },
};
