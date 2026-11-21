import { useState } from 'react';
import { Button } from '@saplings/murphi-ui';
import type { RealmClient, RealmConfig } from '@saplings/kingsman';

import { Field, FormError, lines, useForm, value } from './forms.js';

function ClientForm({
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

export function Identity({
  config,
  save,
}: {
  config: RealmConfig;
  save: (config: RealmConfig) => Promise<void>;
}) {
  const [editing, setEditing] = useState<{ client?: RealmClient }>();
  const issuer = useForm();
  const removal = useForm();
  return (
    <section className="panel">
      <h2>Kingsman identity</h2>
      <p>
        Set the HTTPS issuer and register OIDC clients for this tenant. Use Configuration to edit
        roles, organizations, confidential client credentials, and other realm settings.
      </p>
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

      <div className="section-head">
        <h3>OIDC clients</h3>
        <Button type="button" onClick={() => setEditing({})}>
          Add client
        </Button>
      </div>
      {config.spec.clients.length ? (
        <ul className="rows">
          {config.spec.clients.map((client) => (
            <li key={client.clientId}>
              <div>
                <strong>{client.clientId}</strong>
                <p>
                  {client.accessType} · {client.enabled === false ? 'disabled' : 'enabled'}
                </p>
              </div>
              <Button type="button" variant="outlined" onClick={() => setEditing({ client })}>
                Edit<span className="visually-hidden"> {client.clientId}</span>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Register a client when your application needs to sign users in.</p>
      )}
      {editing && (
        <ClientForm
          key={editing.client?.clientId ?? 'new'}
          client={editing.client}
          close={() => setEditing(undefined)}
          save={async (client) => {
            const clients = editing.client
              ? config.spec.clients.map((item) =>
                  item.clientId === client.clientId ? client : item,
                )
              : [...config.spec.clients, client];
            await save({ ...config, spec: { ...config.spec, clients } });
            setEditing(undefined);
          }}
        />
      )}
      {editing?.client && (
        <form
          onSubmit={removal.submit(async () => {
            const clients = config.spec.clients.filter(
              (item) => item.clientId !== editing.client?.clientId,
            );
            await save({ ...config, spec: { ...config.spec, clients } });
            setEditing(undefined);
          })}
        >
          <FormError error={removal.error} />
          <Button type="submit" variant="text" disabled={removal.busy}>
            Remove client from draft
          </Button>
        </form>
      )}
    </section>
  );
}
