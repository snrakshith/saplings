import { Button } from '@saplings/murphi-ui';
import { useForm } from '../forms/useForm.js';
import { text, type Apply, type Inventory } from './miner-model.js';

export function MinerExperiments({
  inventory,
  apply,
  run,
}: {
  inventory: Inventory;
  apply: Apply;
  run: (input: Record<string, unknown>, refresh?: boolean) => void;
}) {
  const experimentForm = useForm();
  return (
    <section className="panel">
      <h3>Experiments</h3>
      <form
        onSubmit={experimentForm.submit(async (form) => {
          await apply(
            {
              action: 'save-experiment',
              experiment: {
                id: text(form, 'id'),
                cohort: text(form, 'cohort') || undefined,
                allocation: Number(form.get('allocation')),
                treatment: Number(form.get('treatment')),
                conversionEvent: text(form, 'event'),
                flag: text(form, 'flag') || undefined,
              },
            },
            true,
          );
        })}
      >
        <fieldset disabled={experimentForm.busy}>
          <div className="fields">
            <label className="field">
              Experiment ID
              <input name="id" required defaultValue="onboarding" />
            </label>
            <label className="field">
              Conversion event
              <input name="event" list="miner-events" defaultValue="starter.completed" required />
            </label>
            <label className="field">
              Traffic allocation (%)
              <input
                name="allocation"
                type="number"
                min="1"
                max="100"
                defaultValue={100}
                required
              />
            </label>
            <label className="field">
              Treatment share (%)
              <input name="treatment" type="number" min="1" max="99" defaultValue={50} required />
            </label>
            <label className="field">
              Experiment flag
              <select name="flag">
                <option value="">No flag</option>
                {inventory.flags.map(({ id }) => (
                  <option key={id}>{id}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Experiment cohort
              <select name="cohort">
                <option value="">All subjects</option>
                {inventory.cohorts.map(({ id }) => (
                  <option key={id}>{id}</option>
                ))}
              </select>
            </label>
          </div>
          {experimentForm.error && <p role="alert">{experimentForm.error}</p>}
          <Button variant="outlined" type="submit">
            Save experiment draft
          </Button>
        </fieldset>
      </form>
      <ul className="rows">
        {inventory.experiments.map(({ id, state }) => (
          <li key={id}>
            <span>
              {id} · {state}
            </span>
            <div className="actions">
              {state === 'draft' && (
                <Button onClick={() => run({ action: 'launch', id }, true)}>
                  Launch experiment
                </Button>
              )}
              {state === 'running' && (
                <Button variant="outlined" onClick={() => run({ action: 'stop', id }, true)}>
                  Stop experiment
                </Button>
              )}
              {state !== 'draft' && (
                <Button variant="outlined" onClick={() => run({ action: 'results', id })}>
                  View results
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
