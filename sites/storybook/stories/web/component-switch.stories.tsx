import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Forms/Switch',
  component: Switch,
  parameters: {
    docs: {
      description: {
        component:
          'Toggle a setting that takes effect immediately. Label the setting independently of the current on or off state.',
      },
    },
  },
} satisfies Meta<typeof Switch>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return <Switch label="Weekly summary" defaultChecked />;
  },
};
