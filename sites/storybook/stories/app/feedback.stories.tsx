import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert, Badge, Card, Progress, Stack, Typography } from '@saplings/murph-appui';

const meta = {
  title: 'Feedback',
  component: Alert,
  args: { tone: 'success', title: 'Saved', children: 'Your changes were saved.' },
  argTypes: {
    tone: { control: 'select', options: ['success', 'info', 'warning', 'error'] },
  },
} satisfies Meta<typeof Alert>;
export default meta;
type Story = StoryObj<typeof meta>;

export const StatusAlert: Story = {};
export const Upload: Story = {
  render: () => (
    <Card padding={2} style={{ maxWidth: 420 }}>
      <Stack gap={2}>
        <Typography variant="h6">File upload</Typography>
        <Badge tone="info">2 files queued</Badge>
        <Progress label="Upload progress" value={65} />
      </Stack>
    </Card>
  ),
};
