import { Button } from '@saplings/murphi-ui';
import type { ConfigPair } from '../../contracts.js';
import { parseJson } from '../api.js';
import { FormError } from '../forms/FormError.js';
import { JsonField } from '../forms/JsonField.js';
import { useForm } from '../forms/useForm.js';
import { value } from '../forms/values.js';

export function ConfigEditor({
  config,
  save,
}: {
  config: ConfigPair;
  save: (config: unknown) => Promise<void>;
}) {
  const form = useForm();
  return (
    <section className="panel">
      <h2>Platform configuration</h2>
      <p>
        Edit any field in the native Kingsman and Harbor documents. Both documents must pass
        validation before the revision is saved. Store credentials as secret references.
      </p>
      <form
        onSubmit={form.submit(async (fields) =>
          save({
            kingsman: parseJson(value(fields, 'kingsman'), 'Kingsman configuration'),
            harbor: parseJson(value(fields, 'harbor'), 'Harbor configuration'),
          }),
        )}
      >
        <fieldset disabled={form.busy}>
          <div className="fields">
            <JsonField
              name="kingsman"
              label="Kingsman RealmConfig"
              initial={JSON.stringify(config.kingsman, null, 2)}
            />
            <JsonField
              name="harbor"
              label="Harbor GatewayConfig"
              initial={JSON.stringify(config.harbor, null, 2)}
            />
          </div>
          <FormError error={form.error} />
          <Button type="submit">Validate and save configuration</Button>
        </fieldset>
      </form>
    </section>
  );
}
