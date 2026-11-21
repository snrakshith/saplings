import { Button } from '@saplings/murphi-ui';
import type { RealmClient } from '@saplings/kingsman';

import { Field } from '../forms/Field.js';
import { FormError } from '../forms/FormError.js';
import { useForm } from '../forms/useForm.js';
import { lines, value } from '../forms/values.js';

export function ClientForm({
  client,
  save,
  close,
}: {
  client?: RealmClient;
  save: (client: RealmClient) => Promise<void>;
  close: () => void;
}) {
  const form = useForm();
  return (
    <form
      className="editor"
      onSubmit={form.submit(async (fields) => {
        await save({
          ...client,
          clientId: client?.clientId ?? value(fields, 'clientId'),
          enabled: fields.has('enabled'),
          accessType: client?.accessType ?? 'public',
          protocol: client?.protocol ?? 'openid-connect',
          pkce: client ? client.pkce : 'S256',
          grants: client?.grants ?? { authorizationCode: true, refreshToken: true },
          redirectUris: lines(fields, 'redirects'),
        });
      })}
    >
      <fieldset disabled={form.busy}>
        <h3>{client ? 'Edit ' + client.clientId : 'Register a public OIDC client'}</h3>
        {!client && (
          <Field label="Client ID">
            <input name="clientId" required maxLength={100} placeholder="customer-portal-web" />
          </Field>
        )}
        <Field
          label="Redirect URIs"
          hint="One exact URL per line. Use HTTPS or a loopback development URL."
        >
          <textarea
            name="redirects"
            required={!client}
            rows={3}
            defaultValue={client?.redirectUris?.join('\n')}
            placeholder="https://app.example.com/callback"
          />
        </Field>
        <label className="check">
          <input type="checkbox" name="enabled" defaultChecked={client?.enabled !== false} />{' '}
          Enabled
        </label>
        <FormError error={form.error} />
        <div className="actions">
          <Button type="submit">Save client</Button>
          <Button type="button" variant="outlined" onClick={close}>
            Cancel
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
