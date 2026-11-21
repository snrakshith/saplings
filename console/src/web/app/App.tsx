import { useState } from 'react';
import type { ProjectSummary } from '../../contracts.js';
import { consoleApi } from '../api.js';
import { Console } from './Console.js';
import { tokens } from './theme.js';
import { UnlockConsole } from './UnlockConsole.js';

export function App() {
  const [session, setSession] = useState<{ token: string; projects: ProjectSummary[] }>();
  return (
    <div style={tokens}>
      {session ? (
        <Console
          token={session.token}
          initial={session.projects}
          lock={() => setSession(undefined)}
        />
      ) : (
        <UnlockConsole
          unlock={async (token) => {
            const projects = await consoleApi(token)<ProjectSummary[]>('/projects');
            setSession({ token, projects });
          }}
        />
      )}
    </div>
  );
}
