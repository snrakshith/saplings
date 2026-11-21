import { useState } from 'react';
import { Button } from '@saplings/murphi-ui';
import type { Tenant } from '../../contracts.js';
import { parseJson } from '../api.js';
import { Field } from '../forms/Field.js';
import { JsonField } from '../forms/JsonField.js';
import { FormError } from '../forms/FormError.js';
import { KeyFields } from '../forms/KeyFields.js';
import { useForm } from '../forms/useForm.js';
import { value } from '../forms/values.js';

export function TenantForm({
  create,
  close,
}: {
  create: (payload: unknown) => Promise<Tenant>;
  close: () => void;
}) {
  const [mode, setMode] = useState('new');
  const [format, setFormat] = useState('pair');
  const form = useForm();
  return (
    <section className="panel">
      <h2>Onboard a tenant</h2>
      <p>
        Create a realm and gateway draft for a tenant, or import the configurations your application
        uses today.
      </p>
      <form
        onSubmit={form.submit(async (fields) => {
          const tenant = { id: value(fields, 'id'), name: value(fields, 'name'), mode };
          if (mode === 'new') {
            await create({ ...tenant, issuerBase: value(fields, 'issuerBase') });
            return;
          }
          const config =
            format === 'bundle'
              ? parseJson(value(fields, 'bundle'), 'Bundle')
              : {
                  kingsman: parseJson(value(fields, 'kingsman'), 'Kingsman configuration'),
                  harbor: value(fields, 'harbor'),
                };
          await create({ ...tenant, config });
        })}
      >
        <fieldset disabled={form.busy}>
          <KeyFields />
          <Field label="Onboarding mode">
            <select value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="new">Generate starter configuration</option>
              <option value="import">Import existing configuration</option>
            </select>
          </Field>
          {mode === 'new' ? (
            <Field
              label="Kingsman issuer base URL"
              hint="The console appends /realms/ followed by the project and tenant keys."
            >
              <input
                name="issuerBase"
                type="url"
                placeholder="https://auth.example.com"
                required
                maxLength={500}
              />
            </Field>
          ) : (
            <>
              <Field label="Import format">
                <select value={format} onChange={(event) => setFormat(event.target.value)}>
                  <option value="pair">Separate Kingsman and Harbor documents</option>
                  <option value="bundle">Console bundle</option>
                </select>
              </Field>
              <p className="muted">Use secret references in configuration files.</p>
              {format === 'bundle' ? (
                <JsonField label="Console bundle" name="bundle" bundle />
              ) : (
                <div className="fields">
                  <JsonField label="Kingsman RealmConfig" name="kingsman" />
                  <JsonField label="Harbor GatewayConfig (JSON or YAML)" name="harbor" yaml />
                </div>
              )}
            </>
          )}
          <FormError error={form.error} />
          <div className="actions">
            <Button type="submit">
              {mode === 'new' ? 'Create tenant draft' : 'Validate and import'}
            </Button>
            <Button type="button" variant="outlined" onClick={close}>
              Cancel
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
