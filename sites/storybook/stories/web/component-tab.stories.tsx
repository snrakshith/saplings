import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tab, Tabs } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Navigation/Tab',
  component: Tab,
  parameters: {
    docs: {
      description: {
        component:
          'Use Tab inside Tabs to declare a label and optional icon or disabled state. Tabs owns selection and navigation.',
      },
    },
  },
} satisfies Meta<typeof Tab>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Tabs aria-label="Project views">
        <Tab label="Overview" />
        <Tab label="Activity" />
        <Tab label="Archives" disabled />
      </Tabs>
    );
  },
};
