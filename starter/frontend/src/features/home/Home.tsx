import { useCounter } from '@saplings/hooks';
import { Button, Card } from '@saplings/murphi-ui';

import { useStarterFetch } from '../../lib/api.js';

export function Home() {
  const { value: count, increment } = useCounter(0);
  const { data, error } = useStarterFetch<{ items: { id: string; name: string }[] }>('/api/items');
  return (
    <>
      <header className="page-intro">
        <h1>Saplings Starter</h1>
        <p>A React and TypeScript application with the Saplings SDK wired into its Express API.</p>
        <a className="starter-link" href="/dashboard">
          Open application capabilities
        </a>
      </header>
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
    </>
  );
}
