import { useEffect, useState } from 'react';
import { Button } from '@saplings/murphi-ui';
import { message, parseJson } from '../api.js';
import { ConfigDiff } from './ConfigDiff.js';

export type Request = <T>(path: string, body?: unknown) => Promise<T>;
type Revision = {
  number: number;
  state: string;
  value: Record<string, unknown>;
  author: string;
  reviewer?: string;
};
type History = {
  latest: number;
  published: number | null;
  versions: Revision[];
  next?: number | null;
  publishedRevision?: Revision;
};

export function RemoteConfig({ request }: { request: Request }) {
  const [documents, setDocuments] = useState<{ key: string; audience: string }[]>([]);
  const [selected, setSelected] = useState('');
  const [history, setHistory] = useState<History>();
  const [json, setJson] = useState('{}');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    request<{ documents: typeof documents }>('/config').then(
      ({ documents }) => {
        if (!active) return;
        setDocuments(documents);
        setSelected(documents[0]?.key ?? '');
      },
      (error) => {
        if (active) setError(message(error));
      },
    );
    return () => {
      active = false;
    };
  }, [request]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    request<History>('/config/' + encodeURIComponent(selected)).then(
      (history) => {
        if (!active) return;
        setHistory(history);
        setJson(JSON.stringify(history.versions[0]?.value ?? {}, null, 2));
      },
      (error) => {
        if (active) setError(message(error));
      },
    );
    return () => {
      active = false;
    };
  }, [request, selected]);
  const url = '/config/' + encodeURIComponent(selected);
  const latest = history?.versions[0];
  const dirty = Boolean(latest && json !== JSON.stringify(latest.value, null, 2));
  const published =
    history?.publishedRevision ??
    history?.versions.find((item) => item.number === history.published);
  async function change(action: string, from?: number) {
    if (!history) return;
    setBusy(true);
    setError('');
    try {
      await request(url, {
        action,
        revision: history.latest,
        from,
        ...(action === 'save' && { value: parseJson(json, 'Config') }),
      });
      const next = await request<History>(url);
      setHistory(next);
      setJson(JSON.stringify(next.versions[0].value, null, 2));
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Remote Config</h2>
      <p>Review and publish a versioned JSON document for this application.</p>
      <label className="field">
        Document
        <select
          value={selected}
          disabled={busy}
          onChange={(event) => {
            setHistory(undefined);
            setError('');
            setSelected(event.target.value);
          }}
        >
          {documents.map(({ key, audience }) => (
            <option key={key} value={key}>
              {key} · {audience}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {history && (
        <>
          <p role="status">
            Published revision {history.published ?? 'none'} · Latest {latest?.number ?? 0} (
            {latest?.state ?? 'empty'})
          </p>
          <div className="fields">
            <section>
              <h3>Published JSON</h3>
              <pre className="setup-example">{JSON.stringify(published?.value ?? {}, null, 2)}</pre>
            </section>
            <label className="field">
              Draft JSON
              <textarea
                rows={9}
                value={json}
                disabled={busy}
                readOnly={latest?.state === 'submitted'}
                onChange={(event) => setJson(event.target.value)}
              />
            </label>
          </div>
          <ConfigDiff draft={json} published={published?.value ?? {}} />
          <div className="actions">
            <Button
              disabled={busy || latest?.state === 'submitted'}
              onClick={() => void change('save')}
            >
              Save draft
            </Button>
            {latest?.state === 'draft' && (
              <Button disabled={busy || dirty} onClick={() => void change('submit')}>
                Submit for review
              </Button>
            )}
            {latest?.state === 'submitted' && (
              <>
                <Button disabled={busy} onClick={() => void change('approve')}>
                  Approve and publish
                </Button>
                <Button disabled={busy} variant="outlined" onClick={() => void change('reject')}>
                  Reject revision
                </Button>
              </>
            )}
          </div>
          <h3>Revision history</h3>
          <ul className="rows">
            {history.versions.map((revision) => (
              <li key={revision.number}>
                <span>
                  Revision {revision.number} · {revision.state} · {revision.author}
                  {revision.reviewer && ' · reviewed by ' + revision.reviewer}
                </span>
                {revision.state === 'published' && (
                  <Button
                    variant="outlined"
                    disabled={busy || latest?.state === 'submitted'}
                    onClick={() => void change('restore', revision.number)}
                  >
                    Restore as draft
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {history.next && (
            <Button
              variant="outlined"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const older = await request<History>(url + '?before=' + history.next);
                  setHistory({
                    ...history,
                    versions: [...history.versions, ...older.versions],
                    next: older.next,
                  });
                } catch (error) {
                  setError(message(error));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Load older revisions
            </Button>
          )}
        </>
      )}
    </section>
  );
}
