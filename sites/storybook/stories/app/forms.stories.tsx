import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Card, Checkbox, Input, Stack, Typography } from '@saplings/murph-appui';

function ProfileForm() {
  const [name, setName] = useState('');
  const [updates, setUpdates] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <Card padding={2} style={{ maxWidth: 420 }}>
      <Stack gap={2}>
        <Typography variant="h5" accessibilityRole="header">
          Profile settings
        </Typography>
        <Input
          label="Display name"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setSaved(false);
          }}
          error={submitted && !name.trim() ? 'Enter a display name' : undefined}
        />
        <Checkbox label="Send me updates" checked={updates} onChange={setUpdates} />
        <Button
          onPress={() => {
            setSubmitted(true);
            setSaved(Boolean(name.trim()));
          }}
        >
          Save profile
        </Button>
        {saved && <Typography accessibilityRole="status">Profile saved</Typography>}
      </Stack>
    </Card>
  );
}

const meta = {
  tags: ['autodocs'],
  title: 'Examples/Forms',
  id: 'forms',
  component: ProfileForm,
} satisfies Meta<typeof ProfileForm>;
export default meta;

export const Profile: StoryObj<typeof meta> = {};
