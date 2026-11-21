import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from '@saplings/murphi-ui';
import { createConfigReader } from '@saplings/remote-config/browser';
import { createMinerClient } from '@saplings/miner/browser';
import { request } from './api.js';

const miner = createMinerClient();
type Session = { signedIn: boolean; consent: boolean };

function post<T>(path: string, payload: unknown) {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function Services() {
  const [session, setSession] = useState<Session>({ signedIn: false, consent: false });
  const [token, setToken] = useState('');
  const [welcome, setWelcome] = useState('Welcome to Saplings Starter');
  const [workspace, setWorkspace] = useState('Your workspace is ready');
  const [experiment, setExperiment] = useState('onboarding');
  const [flag, setFlag] = useState('starter-banner');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const publicConfig = useMemo(
    () =>
      createConfigReader('/api/public/config/welcome', { message: 'Welcome to Saplings Starter' }),
    [],
  );
  const privateConfig = useMemo(
    () => createConfigReader('/api/config/workspace', { message: 'Your workspace is ready' }),
    [],
  );

  useEffect(() => {
    void request<Session>('/api/starter/session').then(setSession, (error) =>
      setError(error.message),
    );
  }, []);
  useEffect(() => {
    let active = true;
    if (!session.signedIn) privateConfig.reset();
    async function read() {
      const value = await publicConfig.read();
      if (active) setWelcome(value.message);
      if (session.signedIn) {
        const value = await privateConfig.read();
        if (active) setWorkspace(value.message);
      }
    }
    void read();
    const timer = setInterval(() => void read(), 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [session.signedIn, privateConfig, publicConfig]);

  async function run(task: () => Promise<string>) {
    setBusy(true);
    setNotice('');
    setError('');
    try {
      setNotice(await task());
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to complete the action.');
    } finally {
      setBusy(false);
    }
  }
  async function login() {
    await post('/api/starter/session', { token });
    setToken('');
    privateConfig.reset();
    setSession({ ...session, signedIn: true });
    if (session.consent) await miner.identify();
    return session.consent ? 'Signed in and linked anonymous events.' : 'Signed in.';
  }
  return (
    <>
      <h1>Remote Config and Miner</h1>
      <p>Read published application settings and send explicit product events from the starter.</p>
      {error && <p role="alert">{error}</p>}
      <p role="status">{notice}</p>
      <Card className="capability-card">
        <h2>Published configuration</h2>
        <p>
          Public message: <strong>{welcome}</strong>
        </p>
        {session.signedIn && (
          <p>
            Workspace message: <strong>{workspace}</strong>
          </p>
        )}
        <Button
          variant="outlined"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              setWelcome((await publicConfig.read(Date.now(), { force: true })).message);
              if (session.signedIn)
                setWorkspace((await privateConfig.read(Date.now(), { force: true })).message);
              return 'Read published configuration.';
            })
          }
        >
          Refresh configuration
        </Button>
      </Card>
      <section>
        <h2>Session and analytics</h2>
        {session.signedIn ? (
          <Button
            variant="outlined"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await post('/api/starter/session', { logout: true });
                privateConfig.reset();
                setSession({ signedIn: false, consent: false });
                return 'Signed out.';
              })
            }
          >
            Sign out
          </Button>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(login);
            }}
          >
            <label className="catalog-search">
              Starter member token
              <input
                type="password"
                required
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
            </label>
            <Button type="submit" disabled={busy}>
              Sign in
            </Button>
          </form>
        )}
        <div className="starter-actions">
          <Button
            disabled={busy}
            variant="outlined"
            onClick={() =>
              void run(async () => {
                const enabled = !session.consent;
                await post('/api/miner/consent', { enabled });
                setSession({ ...session, consent: enabled });
                return enabled ? 'Analytics consent saved.' : 'Analytics consent withdrawn.';
              })
            }
          >
            {session.consent ? 'Withdraw analytics consent' : 'Allow analytics'}
          </Button>
          <Button
            disabled={busy || !session.consent}
            onClick={() =>
              void run(async () => {
                await miner.track('starter.viewed', { page: 'services' });
                return 'Browser event recorded.';
              })
            }
          >
            Record browser event
          </Button>
          <Button
            disabled={busy || !session.signedIn || !session.consent}
            onClick={() =>
              void run(async () => {
                await post('/api/miner/server-event', {});
                return 'Server event recorded.';
              })
            }
          >
            Record server event
          </Button>
        </div>
      </section>
      <section>
        <h2>Flags and experiments</h2>
        <label className="catalog-search">
          Flag ID
          <input value={flag} onChange={(event) => setFlag(event.target.value)} />
        </label>
        <Button
          disabled={busy || !session.consent || !flag}
          onClick={() =>
            void run(async () => {
              const result = await miner.flag(flag);
              return result.enabled ? 'Flag enabled.' : 'Flag disabled.';
            })
          }
        >
          Evaluate flag
        </Button>
        <label className="catalog-search">
          Experiment ID
          <input value={experiment} onChange={(event) => setExperiment(event.target.value)} />
        </label>
        <Button
          disabled={busy || !session.consent || !experiment}
          onClick={() =>
            void run(async () => {
              const result = await miner.assign(experiment);
              if (!result) return 'No active assignment for this visitor.';
              await miner.expose(experiment, result.variant);
              await miner.track('starter.completed');
              return 'Exposure and conversion recorded for ' + result.variant + '.';
            })
          }
        >
          Run experiment journey
        </Button>
      </section>
    </>
  );
}
