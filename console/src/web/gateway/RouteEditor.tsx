import { Button } from '@saplings/murphi-ui';
import type { GatewayConfig } from '@saplings/harbor';
import { Field } from '../forms/Field.js';
import { FormError } from '../forms/FormError.js';
import { useForm } from '../forms/useForm.js';
import { removeRouteDraft, saveRouteDraft, type RouteSelection } from './route-draft.js';

export function RouteEditor({
  config,
  selected,
  destination,
  setDestination,
  save,
  close,
}: {
  config: GatewayConfig;
  selected?: RouteSelection;
  destination: string;
  setDestination: (value: string) => void;
  save: (config: GatewayConfig) => Promise<void>;
  close: () => void;
}) {
  const form = useForm();
  const remove = useForm();
  const { services } = config.spec;
  return (
    <div className="editor">
      <h3>{selected ? 'Edit ' + selected.route.name : 'Register a route'}</h3>
      <form
        key={selected?.route.name ?? 'new'}
        onSubmit={form.submit(async (fields) => {
          await save(saveRouteDraft(config, fields, destination, selected));
          close();
        })}
      >
        <fieldset disabled={form.busy}>
          {!selected && (
            <>
              <Field label="Destination service">
                <select
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                >
                  <option value="">Create a service and upstream</option>
                  {services.map((service, index) => (
                    <option key={index} value={index}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </Field>
              {!destination && (
                <div className="fields">
                  <Field label="Service name">
                    <input name="serviceName" required placeholder="customer-api" maxLength={100} />
                  </Field>
                  <Field label="Upstream target" hint="Hostname or IP and port, without a scheme.">
                    <input name="target" required placeholder="api.internal:8080" maxLength={300} />
                  </Field>
                </div>
              )}
            </>
          )}
          <div className="fields">
            <Field label="Route name">
              <input
                name="routeName"
                required
                defaultValue={selected?.route.name}
                placeholder="customers"
                maxLength={100}
              />
            </Field>
            <Field label="Path match">
              <select name="match" defaultValue={selected?.route.pathMatch ?? 'exact'}>
                <option value="prefix">Prefix</option>
                <option value="exact">Exact</option>
              </select>
            </Field>
            <Field label="Paths" hint="One path per line, starting with /.">
              <textarea
                name="paths"
                required
                rows={3}
                placeholder="/api/customers"
                defaultValue={selected?.route.paths.join('\n')}
              />
            </Field>
            <Field label="HTTP methods" hint="One per line. Leave blank to accept any method.">
              <textarea
                name="methods"
                rows={3}
                placeholder="GET"
                defaultValue={selected?.route.methods?.join('\n')}
              />
            </Field>
          </div>
          <label className="check">
            <input type="checkbox" name="stripPath" defaultChecked={selected?.route.stripPath} />{' '}
            Strip the matched path before forwarding
          </label>
          <FormError error={form.error} />
          <div className="actions">
            <Button type="submit">Save route</Button>
            <Button type="button" variant="outlined" onClick={close}>
              Cancel
            </Button>
          </div>
        </fieldset>
      </form>
      {selected && (
        <form
          onSubmit={remove.submit(async () => {
            await save(removeRouteDraft(config, selected));
            close();
          })}
        >
          <FormError error={remove.error} />
          <Button type="submit" variant="text" disabled={remove.busy || form.busy}>
            Remove route from draft
          </Button>
          {selected.service.routes.length === 1 && (
            <p className="muted">
              Removing the last route also removes its service. The upstream remains in the draft.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
