import { Button } from '@saplings/murphi-ui';
import type { RealmConfig } from '@saplings/kingsman';

import { Field } from '../forms/Field.js';
import { FormError } from '../forms/FormError.js';
import { useForm } from '../forms/useForm.js';
import { value } from '../forms/values.js';

export function IssuerForm({
  config,
  save,
}: {
  config: RealmConfig;
  save: (config: RealmConfig) => Promise<void>;
}) {
  const issuer = useForm();
  return (
    <form
      onSubmit={issuer.submit(async (fields) =>
        save({
          ...config,
          spec: {
            ...config.spec,
            frontend: { ...config.spec.frontend, issuer: value(fields, 'issuer') },
          },
        }),
      )}
    >
      <fieldset disabled={issuer.busy}>
        <Field
          label="Issuer URL"
          hint={'The URL must end with /realms/' + config.metadata.name + '.'}
        >
          <input
            key={config.spec.frontend.issuer}
            name="issuer"
            type="url"
            required
            defaultValue={config.spec.frontend.issuer}
          />
        </Field>
        <FormError error={issuer.error} />
        <Button type="submit" variant="outlined">
          Save issuer
        </Button>
      </fieldset>
    </form>
  );
}
