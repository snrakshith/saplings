import { useTheme } from '@saplings/murphi-ui';
import { useStarterFetch } from '../../../lib/api.js';
import type { Session } from '../../auth/SessionFields.js';
import { WorkspaceProfile } from '../WorkspaceProfile.js';
import { saveColorMode } from '../appearance.js';

export function SettingsPage() {
  const { mode, setMode } = useTheme();
  const { data, error } = useStarterFetch<Session>('/api/starter/session');
  return (
    <>
      <h1>Settings</h1>
      <section className="capability-card">
        <h2>Appearance</h2>
        <label className="catalog-search">
          Color theme
          <select
            value={mode}
            onChange={(event) => {
              const next = event.target.value === 'dark' ? 'dark' : 'light';
              setMode(next);
              saveColorMode(next);
            }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </section>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading profile…</p>}
      {data &&
        (data.signedIn ? (
          <WorkspaceProfile />
        ) : (
          <p>
            <a href="/login">Sign in to edit your workspace profile</a>
          </p>
        ))}
    </>
  );
}
