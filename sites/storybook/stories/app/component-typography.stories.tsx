import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Typography/Typography',
  component: Typography,
  parameters: {
    docs: {
      description: {
        component:
          'Render a shared type variant using native font sizes and line heights. Set accessibilityRole separately for headings.',
      },
    },
  },
} satisfies Meta<typeof Typography>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Stack gap={1}>
        <Typography variant="h4" accessibilityRole="header">
          Workspace
        </Typography>
        <Typography>Review your active projects.</Typography>
        <Typography variant="caption" color="muted">
          Updated today
        </Typography>
      </Stack>
    );
  },
};
