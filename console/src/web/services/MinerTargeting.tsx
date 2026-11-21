import { Button } from '@saplings/murphi-ui';
import { useForm } from '../forms/useForm.js';
import { text, type Apply, type Inventory } from './miner-model.js';

export function MinerTargeting({ inventory, apply }: { inventory: Inventory; apply: Apply }) {
  const cohortForm = useForm();
  const flagForm = useForm();
  return (
    <section className="panel">
      <h3>Cohorts and targeting</h3>
      <form
        onSubmit={cohortForm.submit(async (form) => {
          await apply(
            {
              action: 'save-cohort',
              cohort: {
                id: text(form, 'id'),
                event: text(form, 'event'),
                days: Number(form.get('days')),
                property: text(form, 'property')
                  ? { key: text(form, 'property'), equals: text(form, 'equals') }
                  : undefined,
              },
            },
            true,
          );
        })}
      >
        <fieldset disabled={cohortForm.busy}>
          <div className="fields">
            <label className="field">
              Cohort ID
              <input name="id" required />
            </label>
            <label className="field">
              Membership event
              <input name="event" list="miner-events" required />
            </label>
            <label className="field">
              Lookback days
              <input name="days" type="number" min="1" max="90" defaultValue={30} required />
            </label>
            <label className="field">
              Event property
              <input name="property" />
            </label>
            <label className="field">
              Property value
              <input name="equals" />
            </label>
          </div>
          {cohortForm.error && <p role="alert">{cohortForm.error}</p>}
          <Button variant="outlined" type="submit">
            Save cohort
          </Button>
        </fieldset>
      </form>
      <form
        onSubmit={flagForm.submit(async (form) => {
          await apply(
            {
              action: 'save-flag',
              flag: {
                id: text(form, 'id'),
                enabled: form.get('enabled') === 'on',
                rollout: Number(form.get('rollout')),
                cohort: text(form, 'cohort') || undefined,
                trait: text(form, 'trait')
                  ? { key: text(form, 'trait'), equals: text(form, 'equals') }
                  : undefined,
              },
            },
            true,
          );
        })}
      >
        <fieldset disabled={flagForm.busy}>
          <div className="fields">
            <label className="field">
              Flag ID
              <input name="id" required defaultValue="starter-banner" />
            </label>
            <label className="field">
              Flag rollout (%)
              <input name="rollout" type="number" min="0" max="100" defaultValue={100} required />
            </label>
            <label className="field">
              Target cohort
              <select name="cohort">
                <option value="">All subjects</option>
                {inventory.cohorts.map(({ id }) => (
                  <option key={id}>{id}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Target trait
              <input name="trait" />
            </label>
            <label className="field">
              Trait value
              <input name="equals" />
            </label>
          </div>
          <label>
            <input name="enabled" type="checkbox" defaultChecked /> Flag enabled
          </label>
          {flagForm.error && <p role="alert">{flagForm.error}</p>}
          <div className="actions">
            <Button variant="outlined" type="submit">
              Save feature flag
            </Button>
          </div>
        </fieldset>
      </form>
      <ul className="rows">
        {inventory.flags.map((flag) => (
          <li key={flag.id}>
            {flag.id} · {flag.enabled ? 'enabled' : 'disabled'} · {flag.rollout}%
          </li>
        ))}
      </ul>
    </section>
  );
}
