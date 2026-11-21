import type { Meta, StoryObj } from '@storybook/react-vite';
import { Radio, Stack } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Forms/Radio',
  component: Radio,
  parameters: {
    docs: {
      description: {
        component:
          'Use a shared name for mutually exclusive native HTML radio inputs, or choose RadioGroup for generated options.',
      },
    },
  },
} satisfies Meta<typeof Radio>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <fieldset>
        <legend>Delivery frequency</legend>
        <Stack direction="row" spacing={2}>
          <Radio name="delivery" label="Daily" value="daily" defaultChecked />
          <Radio name="delivery" label="Weekly" value="weekly" />
        </Stack>
      </fieldset>
    );
  },
};
