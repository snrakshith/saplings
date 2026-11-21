import type { Meta, StoryObj } from '@storybook/react-vite';
import { Accordion, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Overlays/Accordion',
  component: Accordion,
  parameters: {
    docs: {
      description: {
        component:
          'Group optional detail behind an expandable heading. Set defaultOpen to expand it initially.',
      },
    },
  },
} satisfies Meta<typeof Accordion>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Accordion title="Delivery settings" defaultOpen>
        <Typography>Weekly summaries arrive on Mondays.</Typography>
      </Accordion>
    );
  },
};
