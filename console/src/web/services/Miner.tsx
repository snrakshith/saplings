import { useCallback, useEffect, useState } from 'react';
import { Button } from '@saplings/murphi-ui';
import { message } from '../api.js';
import { useForm } from '../forms/useForm.js';
import { MinerExperiments } from './MinerExperiments.js';
import { MinerResults, type Result } from './MinerResults.js';
import { MinerTargeting } from './MinerTargeting.js';
import { text, type Inventory } from './miner-model.js';
import type { Request } from './RemoteConfig.js';

const day = 86_400_000;
const readDate = (time: number) => new Date(time).toISOString().slice(0, 10);

export function Miner({ request }: { request: Request }) {
  const [inventory, setInventory] = useState<Inventory>();
  const [result, setResult] = useState<Result>();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [from, setFrom] = useState(() => readDate(Date.now() - 6 * day));
  const [through, setThrough] = useState(() => readDate(Date.now()));
  const [cohort, setCohort] = useState('');
  const [type, setType] = useState('trend');
  const reportForm = useForm();
  const load = useCallback(async () => setInventory(await request<Inventory>('/miner')), [request]);
  useEffect(() => {
    void load().catch((error) => setError(message(error)));
  }, [load]);

  async function apply(input: Record<string, unknown>, refresh = false) {
    setError('');
    setNotice('');
    const data = await request('/miner', {
      from: Date.parse(from),
      to: Date.parse(through) + day,
      cohort: cohort || undefined,
      ...input,
    });
    if (input.action === 'report') {
      const type = (input.report as { type: string }).type;
      setResult({ kind: type === 'trend' ? 'trends' : type, data } as Result);
    } else if (input.action === 'results') {
      setResult({ kind: 'experiment', data } as Result);
    } else {
      setNotice('Changes saved.');
    }
    if (refresh) await load();
  }
  function run(input: Record<string, unknown>, refresh = false) {
    void apply(input, refresh).catch((error) => setError(message(error)));
  }

  return (
    <>
      <section className="panel">
        <h2>Miner</h2>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {!inventory ? (
          <p role="status">Loading product intelligence…</p>
        ) : (
          <>
            <datalist id="miner-events">
              {inventory.events.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <div className="fields">
              <label className="field">
                Start day (UTC)
                <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              </label>
              <label className="field">
                Through day (UTC)
                <input
                  type="date"
                  value={through}
                  onChange={(event) => setThrough(event.target.value)}
                />
              </label>
              <label className="field">
                Report cohort
                <select value={cohort} onChange={(event) => setCohort(event.target.value)}>
                  <option value="">All subjects</option>
                  {inventory.cohorts.map(({ id }) => (
                    <option key={id}>{id}</option>
                  ))}
                </select>
              </label>
            </div>
            <form
              onSubmit={reportForm.submit(async (form) => {
                const report = {
                  id: text(form, 'id'),
                  type,
                  event: text(form, 'event'),
                  property: text(form, 'property') || undefined,
                  steps: text(form, 'steps')
                    .split(',')
                    .map((step) => step.trim()),
                  first: text(form, 'first'),
                  returning: text(form, 'returning'),
                  days: Number(form.get('days')),
                };
                await apply({ action: 'save-report', report }, true);
                await apply({ action: 'report', report });
              })}
            >
              <fieldset disabled={reportForm.busy}>
                <h3>Build a report</h3>
                <div className="fields">
                  <label className="field">
                    Report ID
                    <input name="id" required defaultValue="onboarding" />
                  </label>
                  <label className="field">
                    Report type
                    <select value={type} onChange={(event) => setType(event.target.value)}>
                      <option value="trend">Trends</option>
                      <option value="funnel">Funnel</option>
                      <option value="retention">Retention</option>
                    </select>
                  </label>
                  {type === 'trend' && (
                    <>
                      <label className="field">
                        Event
                        <input name="event" list="miner-events" required />
                      </label>
                      <label className="field">
                        Breakdown property
                        <input name="property" />
                      </label>
                    </>
                  )}
                  {type === 'funnel' && (
                    <label className="field">
                      Ordered events, separated by commas
                      <input name="steps" required />
                    </label>
                  )}
                  {type === 'retention' && (
                    <>
                      <label className="field">
                        First event
                        <input name="first" list="miner-events" required />
                      </label>
                      <label className="field">
                        Return event
                        <input name="returning" list="miner-events" required />
                      </label>
                      <label className="field">
                        Retention days
                        <input
                          name="days"
                          type="number"
                          min="1"
                          max="90"
                          defaultValue={7}
                          required
                        />
                      </label>
                    </>
                  )}
                </div>
                {reportForm.error && <p role="alert">{reportForm.error}</p>}
                <Button type="submit">Save and run report</Button>
              </fieldset>
            </form>
            <ul className="rows">
              {inventory.reports.map((report) => (
                <li key={String(report.id)}>
                  <span>
                    {String(report.id)} · {String(report.type)}
                  </span>
                  <Button variant="outlined" onClick={() => run({ action: 'report', report })}>
                    Run report
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
        {result && <MinerResults result={result} />}
      </section>
      {inventory && (
        <>
          <MinerTargeting inventory={inventory} apply={apply} />
          <MinerExperiments inventory={inventory} apply={apply} run={run} />
        </>
      )}
    </>
  );
}
