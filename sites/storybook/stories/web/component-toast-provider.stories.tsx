import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, ToastProvider, useToast } from '@saplings/murphi-ui';
function NotifyButton() {
  const { showToast } = useToast();
  return <Button onClick={() => showToast('Project saved', 'success')}>Save project</Button>;
}

const meta = {
  tags: ['autodocs'],
  title: 'Components/Feedback/ToastProvider',
  component: ToastProvider,
  parameters: {
    docs: {
      description: {
        component:
          'Wrap the content that needs useToast. Use showToast for temporary feedback and keep persistent errors in an Alert.',
      },
    },
  },
} satisfies Meta<typeof ToastProvider>;
export default meta;

export const Example: StoryObj = {
  render: function Example() {
    return (
      <ToastProvider>
        <NotifyButton />
      </ToastProvider>
    );
  },
};
