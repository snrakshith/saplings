import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Modal, Stack, Tab, Tabs, Typography } from '@saplings/murphi-ui';

function TabExample() {
  const [selected, setSelected] = useState(0);
  return (
    <Stack spacing={2}>
      <Tabs value={selected} onChange={setSelected} aria-label="Workspace sections">
        <Tab label="Overview" />
        <Tab label="Activity" />
      </Tabs>
      <Typography role="tabpanel">
        {selected === 0 ? 'Workspace overview' : 'Recent activity'}
      </Typography>
    </Stack>
  );
}

function DialogExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Workspace settings">
        <Stack spacing={2}>
          <Typography>Review your workspace settings.</Typography>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </Stack>
      </Modal>
    </>
  );
}

const meta = {
  tags: ['autodocs'],
  title: 'Examples/Navigation and overlays',
  id: 'navigation-and-overlays',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const SectionTabs: Story = { render: () => <TabExample /> };
export const SettingsDialog: Story = { render: () => <DialogExample /> };
