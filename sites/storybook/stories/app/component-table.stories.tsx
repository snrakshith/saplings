import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table } from '@saplings/murph-appui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Data display/Table',
  component: Table,
  parameters: {
    docs: {
      description: {
        component:
          'Render a small horizontally scrollable native table. Columns read text from each row and keyFor supplies stable row identities.',
      },
    },
  },
} satisfies Meta<typeof Table>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Table
        rows={[
          { name: 'Website', status: 'Active' },
          { name: 'Mobile app', status: 'Paused' },
        ]}
        columns={[
          { key: 'name', heading: 'Project', value: (row) => row.name },
          { key: 'status', heading: 'Status', value: (row) => row.status },
        ]}
        keyFor={(row) => row.name}
      />
    );
  },
};
