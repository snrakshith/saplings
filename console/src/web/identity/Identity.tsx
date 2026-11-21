import { useState } from 'react';
import { Button } from '@saplings/murphi-ui';
import type { RealmClient, RealmConfig } from '@saplings/kingsman';
import { FormError } from '../forms/FormError.js';
import { useForm } from '../forms/useForm.js';
import { ClientForm } from './ClientForm.js';
import { ClientList } from './ClientList.js';
import { IssuerForm } from './IssuerForm.js';

export function Identity({
  config,
  save,
}: {
  config: RealmConfig;
  save: (config: RealmConfig) => Promise<void>;
}) {
  const [editing, setEditing] = useState<{ client?: RealmClient }>();
  const removal = useForm();
  return (
    <section className="panel">
      <h2>Kingsman identity</h2>
      <p>
        Set the HTTPS issuer and register OIDC clients for this tenant. Use Configuration to edit
        roles, organizations, confidential client credentials, and other realm settings.
      </p>
      <IssuerForm config={config} save={save} />

      <div className="section-head">
        <h3>OIDC clients</h3>
        <Button type="button" onClick={() => setEditing({})}>
          Add client
        </Button>
      </div>
      <ClientList clients={config.spec.clients} edit={(client) => setEditing({ client })} />
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
