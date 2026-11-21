import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Button } from '@saplings/murph-appui';

const meta = {
  title: 'Button',
  component: Button,
  args: { children: 'Save changes', onPress: fn() },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'outlined', 'text'] },
    size: { control: 'select', options: ['small', 'medium', 'large'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
