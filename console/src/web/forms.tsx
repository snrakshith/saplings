import { cloneElement, useId, useState, type FormEvent, type ReactElement } from 'react';
import { Button } from '@saplings/murphi-ui';

import type { Tenant } from '../contracts.js';
import { parseJson } from './api.js';

export function message(error: unknown) {
  return error instanceof Error ? error.message : 'The console could not complete this request.';
}

export function useForm() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return {
    busy,
    error,
    submit(action: (fields: FormData) => Promise<unknown>) {
      return async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        setBusy(true);
        setError('');
        try {
          await action(fields);
        } catch (error) {
          setError(message(error));
        } finally {
          setBusy(false);
        }
      };
    },
  };
}

export function FormError({ error }: { error: string }) {
  return error ? (
    <p className="error" role="alert">
      {error}
    </p>
  ) : null;
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactElement<{ id?: string; 'aria-describedby'?: string }>;
  hint?: string;
}) {
  const id = useId();
  const description = hint ? id + '-description' : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id, 'aria-describedby': description })}
      {hint && <small id={description}>{hint}</small>}
    </div>
  );
}

export function KeyFields() {
  return (
    <div className="fields">
      <Field label="Name">
        <input name="name" required maxLength={100} placeholder="Customer Portal" />
      </Field>
      <Field label="Key" hint="Lowercase letters, numbers and hyphens.">
        <input
          name="id"
          required
          maxLength={40}
          placeholder="customer-portal"
          pattern="[a-z0-9]([a-z0-9\-]{0,38}[a-z0-9])?"
        />
      </Field>
    </div>
  );
}

export function value(fields: FormData, key: string) {
  return String(fields.get(key) ?? '').trim();
}

export function lines(fields: FormData, key: string) {
  return value(fields, key)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function JsonField({
  label,
  name,
  initial = '',
  yaml = false,
  bundle = false,
}: {
  label: string;
  name: string;
  initial?: string;
  yaml?: boolean;
  bundle?: boolean;
}) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState('');
  return (
    <div className="json-field">
      <Field label={label}>
        <textarea
          name={name}
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          wrap="off"
          required
          rows={12}
        />
      </Field>
      <Field label={'Load ' + label + ' from file'}>
        <input
          type="file"
          accept={yaml ? '.json,.yml,.yaml' : '.json,application/json'}
          onChange={async (event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            input.value = '';
            if (!file) return;
            setError('');
            try {
              const maxMB = bundle ? 4 : 2;
              if (file.size > maxMB * 1_000_000)
                throw new Error('Use a file up to ' + maxMB + ' MB.');
              setText(await file.text());
            } catch (error) {
              setError(message(error));
            }
          }}
        />
      </Field>
      <FormError error={error} />
    </div>
  );
}

export function ProjectForm({
  create,
  close,
}: {
  create: (project: { id: string; name: string }) => Promise<void>;
  close: () => void;
}) {
  const form = useForm();
  return (
    <section className="panel">
      <h2>Create a project</h2>
      <p>Group the Kingsman and Harbor configurations for a new or existing application.</p>
      <form
        onSubmit={form.submit((fields) =>
          create({ id: value(fields, 'id'), name: value(fields, 'name') }),
        )}
      >
        <fieldset disabled={form.busy}>
          <KeyFields />
          <FormError error={form.error} />
          <div className="actions">
            <Button type="submit">Create project</Button>
            <Button type="button" variant="outlined" onClick={close}>
              Cancel
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}

export function TenantForm({
  create,
  close,
}: {
  create: (payload: unknown) => Promise<Tenant>;
  close: () => void;
}) {
  const [mode, setMode] = useState('new');
  const [format, setFormat] = useState('pair');
  const form = useForm();
  return (
    <section className="panel">
      <h2>Onboard a tenant</h2>
      <p>
        Create a realm and gateway draft for a tenant, or import the configurations your application
        uses today.
      </p>
      <form
        onSubmit={form.submit(async (fields) => {
          const tenant = { id: value(fields, 'id'), name: value(fields, 'name'), mode };
          if (mode === 'new') {
            await create({ ...tenant, issuerBase: value(fields, 'issuerBase') });
            return;
          }
          const config =
            format === 'bundle'
              ? parseJson(value(fields, 'bundle'), 'Bundle')
              : {
                  kingsman: parseJson(value(fields, 'kingsman'), 'Kingsman configuration'),
                  harbor: value(fields, 'harbor'),
                };
          await create({ ...tenant, config });
        })}
      >
        <fieldset disabled={form.busy}>
          <KeyFields />
          <Field label="Onboarding mode">
            <select value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="new">Generate starter configuration</option>
              <option value="import">Import existing configuration</option>
            </select>
          </Field>
          {mode === 'new' ? (
            <Field
              label="Kingsman issuer base URL"
              hint="The console appends /realms/ followed by the project and tenant keys."
            >
              <input
                name="issuerBase"
                type="url"
                placeholder="https://auth.example.com"
                required
                maxLength={500}
              />
            </Field>
          ) : (
            <>
              <Field label="Import format">
                <select value={format} onChange={(event) => setFormat(event.target.value)}>
                  <option value="pair">Separate Kingsman and Harbor documents</option>
                  <option value="bundle">Console bundle</option>
                </select>
              </Field>
              <p className="muted">Use secret references in configuration files.</p>
              {format === 'bundle' ? (
                <JsonField label="Console bundle" name="bundle" bundle />
              ) : (
                <div className="fields">
                  <JsonField label="Kingsman RealmConfig" name="kingsman" />
                  <JsonField label="Harbor GatewayConfig (JSON or YAML)" name="harbor" yaml />
                </div>
              )}
            </>
          )}
          <FormError error={form.error} />
          <div className="actions">
            <Button type="submit">
              {mode === 'new' ? 'Create tenant draft' : 'Validate and import'}
            </Button>
            <Button type="button" variant="outlined" onClick={close}>
              Cancel
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
