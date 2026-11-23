import { useState, useEffect } from 'react';
import { Button } from '@saplings/murphi-ui';
import { createMinerClient } from '@saplings/miner/browser';
import { post, request, useStarterFetch } from './api.js';
import { SessionFields, type Session } from './SessionFields.js';

export function Identity() {
  const { data, error: loadingError } = useStarterFetch<Session>('/api/starter/session');
  const [session, setSession] = useState<Session>();
  const [operator, setOperator] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setSession(data), [data]);
  useEffect(() => {
    if (!operator) return;
    const timer = setTimeout(() => setOperator(''), 5 * 60_000);
    return () => clearTimeout(timer);
  }, [operator]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The session action failed.');
    } finally {
      setBusy(false);
    }
  }

  if (loadingError) return <p role="alert">{loadingError}</p>;
  if (!session) return <p role="status">Loading identity…</p>;
  if (session.profile === 'local')
    return (
      <>
        <h1>Identity setup</h1>
        <p>Configure your issuer and OIDC client in the developer console.</p>
        <a className="starter-link" href="/dashboard#kingsman">
          Open the Kingsman check
        </a>
      </>
    );

  return (
    <>
      <h1>Kingsman sign-in</h1>
      {error && <p role="alert">{error}</p>}
      {!session.signedIn ? (
        <SessionFields
          durable
          disabled={busy}
          signIn={(input) =>
            run(async () => {
              await post('/api/starter/session', input);
              const next = await request<Session>('/api/starter/session');
              setSession(next);
              if (next.consent) await createMinerClient().identify();
            })
          }
        />
      ) : (
        <>
          <p role="status">Signed in.</p>
          <Button
            variant="outlined"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await post('/api/starter/session', { logout: true });
                setOperator('');
                setSession({ ...session, signedIn: false, canOperate: false, consent: false });
              })
            }
          >
            Sign out
          </Button>
          {session.canOperate && (
            <section className="capability-card">
              <h2>Connect Developer Console</h2>
              <Button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const credentials = await post<{ token: string }>(
                      '/api/starter/operator-token',
                      {},
                    );
                    setOperator(credentials.token);
                  })
                }
              >
                Create operator token
              </Button>
              {operator && (
                <label className="catalog-search">
                  Console operator token
                  <textarea readOnly value={operator} rows={4} />
                </label>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
