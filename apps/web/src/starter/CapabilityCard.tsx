import { useState } from 'react';
import { Button, Card } from '@saplings/murphi-ui';

import { request, type Capability } from './api.js';

export function CapabilityCard({ capability }: { capability: Capability }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, unknown>>();
  const [error, setError] = useState<string>();
  const run = async () => {
    setBusy(true);
    setError(undefined);
    setResult(undefined);
    try {
      const response = await request<{ result: Record<string, unknown> }>(
        '/api/starter/' + encodeURIComponent(capability.id),
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
      );
      setResult(response.result);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Starter check failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="capability-card">
      <article id={capability.id}>
        <h3>{capability.title}</h3>
        <p>{capability.description}</p>
        <Button
          type="button"
          variant="outlined"
          aria-label={'Run ' + capability.title}
          aria-busy={busy}
          disabled={busy}
          onClick={run}
        >
          {busy ? 'Running…' : 'Run check'}
        </Button>
        {error && (
          <p role="alert" className="check-error">
            {error}
          </p>
        )}
        {result && (
          <pre className="check-result" role="status">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </article>
    </Card>
  );
}
