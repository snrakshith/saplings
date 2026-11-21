import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Button, Tooltip } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Overlays/Tooltip',
  component: Tooltip,
  parameters: {
    docs: {
      description: {
        component:
          'Attach short supplementary text to a focusable or hoverable element. Use placement to position the hint.',
      },
    },
  },
} satisfies Meta<typeof Tooltip>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Box padding={4}>
        <Tooltip title="Export all visible rows" placement="right">
          <Button variant="outlined">Export</Button>
        </Tooltip>
      </Box>
    );
  },
};
