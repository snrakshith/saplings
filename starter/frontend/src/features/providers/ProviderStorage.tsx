import { useState } from 'react';
import { Button } from '@saplings/murphi-ui';
import { post, request } from '../../lib/api.js';

const endpoint = '/api/starter/providers/storage';

export function ProviderStorage({ signedDownloads }: { signedDownloads: boolean }) {
  const [text, setText] = useState('');
  const [stored, setStored] = useState('');
  const [id, setId] = useState('');
  const [url, setUrl] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The storage request failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="capability-card">
      <h2>Object storage</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            const uploaded = await post<{ id: string }>(endpoint, { text });
            setId(uploaded.id);
            setStored('');
            setUrl('');
            setNotice('Object uploaded.');
          });
        }}
      >
        <label className="catalog-search">
          Text to store
          <textarea
            required
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            maxLength={32768}
          />
        </label>
        <Button type="submit" disabled={busy}>
          Upload object
        </Button>
      </form>
      <div className="starter-actions">
        <Button
          variant="outlined"
          disabled={busy || !id}
          onClick={() =>
            void run(async () => {
              const value = await request<{ text: string }>(endpoint + '/' + id);
              setStored(value.text);
              setNotice('Object read.');
            })
          }
        >
          Read object
        </Button>
        <Button
          variant="outlined"
          disabled={busy || !id}
          onClick={() =>
            void run(async () => {
              await post(endpoint + '/' + id + '/delete', {});
              setId('');
              setStored('');
              setUrl('');
              setNotice('Object deleted.');
            })
          }
        >
          Delete object
        </Button>
        {signedDownloads && (
          <Button
            variant="outlined"
            disabled={busy || !id}
            onClick={() =>
              void run(async () => {
                const link = await request<{ url: string }>(endpoint + '/' + id + '/link');
                if (new URL(link.url).protocol !== 'https:')
                  throw new Error('Invalid download link.');
                setUrl(link.url);
              })
            }
          >
            Create download link
          </Button>
        )}
      </div>
      {url && (
        <a href={url} rel="noreferrer">
          Open signed download
        </a>
      )}
      {stored && <pre className="starter-code">{stored}</pre>}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
