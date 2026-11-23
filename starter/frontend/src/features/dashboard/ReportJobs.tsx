import { useEffect, useRef, useState } from 'react';
import { Button } from '@saplings/murphi-ui';
import { post, request } from '../../lib/api.js';

type Job = { id: string; status: string; completedAt?: string; visits?: number };

export function ReportJobs({ signedIn }: { signedIn: boolean }) {
  const [job, setJob] = useState<Job | undefined>(() => {
    const id = new URLSearchParams(location.search).get('job');
    return id && /^[a-f0-9]{64}$/.test(id) ? { id, status: 'loading' } : undefined;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pendingKey = useRef<string>(undefined);
  const activeId =
    job && !['completed', 'dead', 'cancelled'].includes(job.status) ? job.id : undefined;

  useEffect(() => {
    if (!signedIn || !activeId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const status = await request<Job>('/api/starter/jobs/' + activeId, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setJob(status);
          if (!['completed', 'dead', 'cancelled'].includes(status.status))
            timer = setTimeout(() => void poll(), 750);
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : 'Could not read report status.');
      }
    }
    timer = setTimeout(() => void poll(), 750);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [activeId, signedIn]);

  async function queue() {
    setBusy(true);
    setError('');
    pendingKey.current ??= crypto.randomUUID();
    try {
      const job = await post<Job>(
        '/api/starter/jobs',
        {},
        { 'Idempotency-Key': pendingKey.current },
      );
      const url = new URL(location.href);
      url.searchParams.set('job', job.id);
      history.replaceState(null, '', url);
      setJob(job);
      pendingKey.current = undefined;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not queue the report.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Application dashboard</h1>
      {signedIn ? (
        <section className="capability-card">
          <h2>Report jobs</h2>
          <Button disabled={busy} onClick={() => void queue()}>
            Queue report
          </Button>
          {job && (
            <p role="status">
              Report status {job.status}
              {job.completedAt ? ' · ' + new Date(job.completedAt).toLocaleString() : ''}
            </p>
          )}
          {job?.visits !== undefined && <p>Tracked visits in the last 24 hours {job.visits}</p>}
          {error && <p role="alert">{error}</p>}
        </section>
      ) : (
        <a className="starter-link" href="/login">
          Sign in to queue a report
        </a>
      )}
    </>
  );
}
