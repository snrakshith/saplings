import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Modal, Stack, Tabs, Typography } from '@saplings/murph-appui';

function TabExample() {
  const [selected, setSelected] = useState('overview');
  return (
    <Stack gap={2}>
      <Tabs
        tabs={[
          { label: 'Overview', value: 'overview' },
          { label: 'Activity', value: 'activity' },
        ]}
        value={selected}
        onChange={setSelected}
      />
      <Typography>{selected === 'overview' ? 'Workspace overview' : 'Recent activity'}</Typography>
    </Stack>
  );
}

function DialogExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onPress={() => setOpen(true)}>Open dialog</Button>
      <Modal visible={open} onClose={() => setOpen(false)} title="Workspace settings">
        <Stack gap={2}>
          <Typography>Review your workspace settings.</Typography>
          <Button onPress={() => setOpen(false)}>Done</Button>
        </Stack>
      </Modal>
    </>
  );
}

const meta = { title: 'Navigation and overlays' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const SectionTabs: Story = { render: () => <TabExample /> };
export const SettingsDialog: Story = { render: () => <DialogExample /> };
