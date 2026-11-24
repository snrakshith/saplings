import { Button } from '@saplings/murphi-ui';
import { useAsync } from '@saplings/hooks';
import { post, useStarterFetch } from '../../lib/api.js';

const endpoint = '/api/starter/profile';
const areas = [
  ['identity', 'Identity'],
  ['observability', 'Observability'],
  ['providers', 'Providers'],
] as const;

type Profile = { displayName: string; interests: string[] };

export function WorkspaceProfile() {
  const { data, error } = useStarterFetch<Profile>(endpoint);
  const save = useAsync((_signal, profile: Profile) => post<Profile>(endpoint, profile));

  return (
    <section className="capability-card">
      <h2>Workspace profile</h2>
      {error && <p role="alert">{error}</p>}
      {data && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void save
              .run({
                displayName: String(form.get('displayName') ?? ''),
                interests: form.getAll('interests').map(String),
              })
              .catch(() => {});
          }}
        >
          <label className="catalog-search">
            Display name
            <input name="displayName" defaultValue={data.displayName} required maxLength={64} />
          </label>
          <fieldset>
            <legend>Areas of interest</legend>
            {areas.map(([key, label]) => (
              <label key={key}>
                <input
                  name="interests"
                  type="checkbox"
                  value={key}
                  defaultChecked={data.interests.includes(key)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <Button type="submit" disabled={save.state.status === 'pending'}>
            Save profile
          </Button>
          {save.state.status === 'success' && <p role="status">Workspace profile saved.</p>}
          {save.state.status === 'error' && (
            <p role="alert">
              {save.state.error instanceof Error
                ? save.state.error.message
                : 'Could not save the profile.'}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
