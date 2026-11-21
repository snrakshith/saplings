import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Breadcrumb } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Navigation/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    docs: {
      description: {
        component:
          'Show a hierarchy of links and a final label for the current page. The example reports an ancestor click without leaving Storybook.',
      },
    },
  },
} satisfies Meta<typeof Breadcrumb>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Breadcrumb
        items={[
          { label: 'Workspace', onClick: fn() },
          { label: 'Projects', onClick: fn() },
          { label: 'Website' },
        ]}
      />
    );
  },
};
