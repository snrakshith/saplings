import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table } from '@saplings/murphi-ui';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Data display/Table',
  component: Table,
  parameters: {
    docs: {
      description: {
        component:
          'Compose Table.Head, Table.Body, Table.Row, Table.Header, and Table.Cell to build a semantic table. The example includes every compound part.',
      },
    },
  },
} satisfies Meta<typeof Table>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <Table striped hoverable aria-label="Project statuses">
        <Table.Head>
          <Table.Row>
            <Table.Header>Project</Table.Header>
            <Table.Header>Status</Table.Header>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Website</Table.Cell>
            <Table.Cell>Active</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Mobile app</Table.Cell>
            <Table.Cell>Paused</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    );
  },
};
