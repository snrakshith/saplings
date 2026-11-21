import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert, Badge, Card, Progress, Stack, Typography } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Examples/Feedback',
  id: 'feedback',
  component: Alert,
  args: { severity: 'success', children: 'Your changes were saved.' },
  argTypes: {
    severity: { control: 'select', options: ['success', 'info', 'warning', 'error'] },
    variant: { control: 'select', options: ['filled', 'outlined', 'standard'] },
  },
} satisfies Meta<typeof Alert>;
export default meta;
type Story = StoryObj<typeof meta>;

export const StatusAlert: Story = {};
export const Upload: Story = {
  render: () => (
    <Card variant="outlined" style={{ maxWidth: 420 }}>
      <Stack spacing={2}>
        <Typography variant="h6">File upload</Typography>
        <Badge badgeContent={2} color="info">
          <Typography>Queued files</Typography>
        </Badge>
        <Progress aria-label="Upload progress" value={65} />
      </Stack>
    </Card>
  ),
};
