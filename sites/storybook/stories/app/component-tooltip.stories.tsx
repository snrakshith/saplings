import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Overlays/Tooltip',
  component: Tooltip,
  parameters: {
    docs: {
      description: {
        component:
          'Show short help text on press. Set label to describe the trigger to assistive technology.',
      },
    },
  },
} satisfies Meta<typeof Tooltip>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Tooltip content="Exports all visible project rows." label="About exporting">
        <Typography color="primary">About exporting</Typography>
      </Tooltip>
    );
  },
};
