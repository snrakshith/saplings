import { Button } from '@saplings/murphi-ui';
import { Field } from '../forms/Field.js';
import { FormError } from '../forms/FormError.js';
import { useForm } from '../forms/useForm.js';
import { value } from '../forms/values.js';
import { Brand } from './Brand.js';

export function UnlockConsole({ unlock }: { unlock: (token: string) => Promise<void> }) {
  const form = useForm();
  return (
    <main className="unlock">
      <section className="panel">
        <Brand />
        <h1>Open your workspace</h1>
        <p>Manage project onboarding, Kingsman identity, and Harbor routes.</p>
        <form onSubmit={form.submit((fields) => unlock(value(fields, 'token')))}>
          <fieldset disabled={form.busy}>
            <Field
              label="Console access token"
              hint="Copy the token from the console server terminal or your local configuration."
            >
              <input name="token" type="password" required autoComplete="off" />
            </Field>
            <FormError error={form.error} />
            <Button type="submit">Unlock console</Button>
          </fieldset>
        </form>
      </section>
    </main>
  );
}
