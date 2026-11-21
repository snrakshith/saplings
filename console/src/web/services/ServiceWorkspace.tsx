import { useCallback, useState } from 'react';
import { Button } from '@saplings/murphi-ui';
import type { consoleApi } from '../api.js';
import { Miner } from './Miner.js';
import { RemoteConfig } from './RemoteConfig.js';

export function ServiceWorkspace({
  api,
  path,
  section,
}: {
  api: ReturnType<typeof consoleApi>;
  path: string;
  section: 'Remote Config' | 'Miner';
}) {
  const [input, setInput] = useState('');
  const [operator, setOperator] = useState('');
  const [session, setSession] = useState(0);
  const request = useCallback(
    <T,>(endpoint: string, body?: unknown) =>
      api<T>(path + '/services' + endpoint, body === undefined ? 'GET' : 'POST', body, operator),
    [api, path, operator],
  );
  return (
    <>
      <form
        className="panel"
        onSubmit={(event) => {
          event.preventDefault();
          setOperator(input.trim());
          setSession((session) => session + 1);
          setInput('');
        }}
      >
        <label className="field">
          Application operator token
          <input
            required
            type="password"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            autoComplete="off"
          />
        </label>
        <Button type="submit">{operator ? 'Switch operator' : 'Connect service'}</Button>
      </form>
      {operator &&
        (section === 'Remote Config' ? (
          <RemoteConfig key={session} request={request} />
        ) : (
          <Miner key={session} request={request} />
        ))}
    </>
  );
}
