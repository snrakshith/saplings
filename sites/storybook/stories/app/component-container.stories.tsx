import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, Container, Typography } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Layout/Container',
  component: Container,
  parameters: {
    docs: {
      description: {
        component:
          'Constrain native content to a numeric maximum width. Use the ui-core breakpoints as shared width references.',
      },
    },
  },
} satisfies Meta<typeof Container>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Container maxWidth={440}>
        <Card padding={2}>
          <Typography>Centered content with a maximum width</Typography>
        </Card>
      </Container>
    );
  },
};
