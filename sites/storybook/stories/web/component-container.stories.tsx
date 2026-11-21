import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, Container, Typography } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Layout/Container',
  component: Container,
  parameters: {
    docs: {
      description: {
        component:
          'Constrain page content to a named ui-core breakpoint. Set disableGutters when the parent already supplies horizontal padding.',
      },
    },
  },
} satisfies Meta<typeof Container>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Container maxWidth="sm">
        <Card variant="outlined">
          <Typography>Content constrained to the sm breakpoint</Typography>
        </Card>
      </Container>
    );
  },
};
