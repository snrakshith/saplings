import { Button } from '@saplings/murphi-ui';
import type { RealmClient } from '@saplings/kingsman';

export function ClientList({
  clients,
  edit,
}: {
  clients: RealmClient[];
  edit: (client: RealmClient) => void;
}) {
  return clients.length ? (
    <ul className="rows">
      {clients.map((client) => (
        <li key={client.clientId}>
          <div>
            <strong>{client.clientId}</strong>
            <p>
              {client.accessType} · {client.enabled === false ? 'disabled' : 'enabled'}
            </p>
          </div>
          <Button type="button" variant="outlined" onClick={() => edit(client)}>
            Edit<span className="visually-hidden"> {client.clientId}</span>
          </Button>
        </li>
      ))}
    </ul>
  ) : (
    <p className="muted">Register a client when your application needs to sign users in.</p>
  );
}
