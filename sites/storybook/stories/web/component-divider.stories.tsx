import type { Meta, StoryObj } from '@storybook/react-vite';
import { Divider, Stack, Typography } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Layout/Divider',
  component: Divider,
  parameters: {
    docs: {
      description: {
        component:
          'Separate sections with a horizontal or vertical rule. Use children when the divider also needs a label.',
      },
    },
  },
} satisfies Meta<typeof Divider>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Stack spacing={2}>
        <Typography>Active projects</Typography>
        <Divider textAlign="left">Archived</Divider>
        <Typography>Quarterly planning</Typography>
      </Stack>
    );
  },
};
