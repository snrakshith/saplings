import type { Session } from '../auth/SessionFields.js';
import { useCounter } from '@saplings/hooks';
import { Button, Card } from '@saplings/murphi-ui';

import { useStarterFetch } from '../../lib/api.js';

function LocalItems() {
  const { value: count, increment } = useCounter(0);
  const { data, error } = useStarterFetch<{ items: { id: string; name: string }[] }>('/api/items');
  return (
    <section aria-labelledby="connection">
      <h2 id="connection">Frontend and API</h2>
      <p data-quality-state>Count: {count}</p>
      <Button className="counter-button" type="button" onClick={() => increment()}>
        Increment counter
      </Button>
      <Card className="api-items" aria-label="Loaded items">
        <h3>API items</h3>
        {error && <p role="alert">{error}</p>}
        <ul data-quality-items>
          {data?.items.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

export function Home() {
  const { data, error } = useStarterFetch<Session>('/api/starter/session');
  return (
    <>
      <header className="page-intro">
        <h1>Saplings Starter</h1>
        <p>A React and TypeScript application with the Saplings SDK wired into its Express API.</p>
        <a className="starter-link" href="/dashboard">
          Open application capabilities
        </a>
      </header>
      {error && <p role="alert">{error}</p>}
      {!error && !data && <p role="status">Loading workspace…</p>}
      {data?.profile === 'local' && <LocalItems />}
      {data?.profile === 'durable' && (
        <section aria-labelledby="workspace-title">
          <h2 id="workspace-title">Your workspace</h2>
          <p>
            {data.signedIn
              ? 'Manage your workspace profile and preferences.'
              : 'Sign in to save a workspace profile and run reports.'}
          </p>
          <a href={data.signedIn ? '/settings' : '/login'}>
            {data.signedIn ? 'Manage settings' : 'Sign in to your workspace'}
          </a>
        </section>
      )}
    </>
  );
}
