import type { Meta, StoryObj } from '@storybook/react-vite';
import { Accordion, Typography } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Overlays/Accordion',
  component: Accordion,
  parameters: {
    docs: {
      description: {
        component:
          'Hide optional detail behind a labeled disclosure. Use defaultExpanded for an initially open uncontrolled panel.',
      },
    },
  },
} satisfies Meta<typeof Accordion>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Accordion title="Delivery settings" defaultExpanded>
        <Typography>Weekly summaries arrive on Mondays.</Typography>
      </Accordion>
    );
  },
};
