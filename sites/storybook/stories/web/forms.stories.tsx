import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Card, Checkbox, Input, Stack, Typography } from '@saplings/murphi-ui';

function ProfileForm() {
  const [name, setName] = useState('');
  const [updates, setUpdates] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <Card variant="outlined" style={{ maxWidth: 420 }}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          setSaved(Boolean(name.trim()));
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h5" component="h1">
            Profile settings
          </Typography>
          <Input
            label="Display name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
            error={submitted && !name.trim() ? 'Enter a display name' : undefined}
            fullWidth
          />
          <Checkbox
            label="Send me updates"
            checked={updates}
            onChange={(event) => setUpdates(event.target.checked)}
          />
          <Button type="submit">Save profile</Button>
          {saved && <Typography role="status">Profile saved</Typography>}
        </Stack>
      </form>
    </Card>
  );
}

const meta = { title: 'Forms', component: ProfileForm } satisfies Meta<typeof ProfileForm>;
export default meta;

export const Profile: StoryObj<typeof meta> = {};
