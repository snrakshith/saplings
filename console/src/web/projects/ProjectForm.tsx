import { Button } from '@saplings/murphi-ui';
import { FormError } from '../forms/FormError.js';
import { KeyFields } from '../forms/KeyFields.js';
import { useForm } from '../forms/useForm.js';
import { value } from '../forms/values.js';

export function ProjectForm({
  create,
  close,
}: {
  create: (project: { id: string; name: string }) => Promise<void>;
  close: () => void;
}) {
  const form = useForm();
  return (
    <section className="panel">
      <h2>Create a project</h2>
      <p>Group the Kingsman and Harbor configurations for a new or existing application.</p>
      <form
        onSubmit={form.submit((fields) =>
          create({ id: value(fields, 'id'), name: value(fields, 'name') }),
        )}
      >
        <fieldset disabled={form.busy}>
          <KeyFields />
          <FormError error={form.error} />
          <div className="actions">
            <Button type="submit">Create project</Button>
            <Button type="button" variant="outlined" onClick={close}>
              Cancel
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
