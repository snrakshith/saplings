import { useState } from 'react';
import { useDebounce } from '@saplings/hooks';
import { useStarterFetch, type CatalogEntry } from '../../lib/api.js';

export function Catalog() {
  const { data, error } = useStarterFetch<CatalogEntry[]>('/api/starter/catalog');
  const [query, setQuery] = useState('');
  const search = useDebounce(query, 180).trim().toLowerCase();
  const entries = data?.filter((entry) =>
    [entry.featureId, entry.kind, entry.note, ...entry.actions]
      .join(' ')
      .toLowerCase()
      .includes(search),
  );
  return (
    <>
      <header className="page-intro">
        <h1>SDK catalog</h1>
        <p>Browse feature IDs, SDK actions, and runtime notes for this configuration.</p>
      </header>
      <label className="catalog-search">
        Search the SDK catalog
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Feature ID or action"
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading the SDK catalog…</p>}
      {entries && (
        <>
          <p role="status">
            {entries.length} of {data?.length} features
          </p>
          <ul className="catalog-list">
            {entries.map((entry) => (
              <li key={entry.featureId}>
                <strong>{entry.featureId}</strong> <span>{entry.kind}</span>
                {entry.note && <p>{entry.note}</p>}
                <p>{entry.actions.join(', ')}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
