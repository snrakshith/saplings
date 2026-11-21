import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@saplings/murphi-ui';

import {
  domains,
  type DomainId,
  type PreviewResult,
  type SetupDraft,
  type SetupField,
  type SetupValues,
  type TenantSetup,
} from '../onboarding.js';
import { type consoleApi, download } from './api.js';
import { Field, FormError, message, useForm, value } from './forms.js';

const groups: { title: string; areas: DomainId[] }[] = [
  { title: 'Application foundation', areas: ['workspace', 'flags', 'analytics', 'storage'] },
  { title: 'Payments and billing', areas: ['payments', 'billing'] },
  {
    title: 'Operations and governance',
    areas: ['notifications', 'workflows', 'audit', 'governance', 'operations'],
  },
];
const areas = groups.flatMap((group) => group.areas);

function SetupInput({ field, saved }: { field: SetupField; saved: SetupValues }) {
  const { key, type, label, hint } = field;
  const initial = saved[key] ?? field.initial;
  if (type === 'boolean') {
    return (
      <label className="check">
        <input type="checkbox" name={key} defaultChecked={initial === true} />
        {label}
      </label>
    );
  }
  return (
    <Field label={label} hint={hint}>
      {type === 'choice' ? (
        <select name={key} defaultValue={String(initial)}>
          {field.options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : type === 'number' ? (
        <input
          name={key}
          type="number"
          required
          min={field.min}
          max={field.max}
          defaultValue={Number(initial)}
        />
      ) : (
        <input
          name={key}
          type={type === 'url' ? 'url' : 'text'}
          required
          maxLength={type === 'url' ? 500 : 100}
          defaultValue={String(initial)}
        />
      )}
    </Field>
  );
}

function SetupEditor({
  api,
  path,
  id,
  draft,
  onSave,
  close,
  next,
}: {
  api: ReturnType<typeof consoleApi>;
  path: string;
  id: DomainId;
  draft?: SetupDraft;
  onSave: (next: SetupDraft) => void;
  close: () => void;
  next?: { title: string; open: () => void };
}) {
  const domain = domains[id];
  const form = useForm();
  const preview = useForm();
  const [result, setResult] = useState<PreviewResult>();
  const [notice, setNotice] = useState('');
  const endpoint = path + '/' + id;
  const saved = draft?.values ?? {};
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <section className="panel">
      <div className="section-head top">
        <h2 ref={heading} tabIndex={-1}>
          {domain.title}
        </h2>
        <Button variant="text" type="button" onClick={close}>
          Back to onboarding
        </Button>
      </div>
      <p>{domain.summary}</p>
      <form
        onSubmit={form.submit(async (fields) => {
          const values = Object.fromEntries(
            domain.fields.map((field) => {
              const text = value(fields, field.key);
              const input =
                field.type === 'number'
                  ? Number(text)
                  : field.type === 'boolean'
                    ? fields.has(field.key)
                    : text;
              return [field.key, input];
            }),
          );
          setNotice('');
          setResult(undefined);
          onSave(
            await api<SetupDraft>(endpoint, 'PUT', { revision: draft?.revision ?? 0, values }),
          );
          setNotice('Setup draft saved.');
        })}
      >
        <fieldset disabled={form.busy || preview.busy}>
          <div className="fields">
            {domain.fields.map((field) => (
              <SetupInput key={field.key} field={field} saved={saved} />
            ))}
          </div>
          <FormError error={form.error} />
          <Button type="submit">Save setup draft</Button>
          <p className="notice" role="status">
            {notice}
          </p>
        </fieldset>
      </form>
      <h3>Connect your staging application</h3>
      <ol className="instructions">
        {domain.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {draft && (
        <>
          <p>Example using the saved draft and your application’s verified tenant context.</p>
          <pre className="setup-example">
            <code>{domain.example(saved)}</code>
          </pre>
        </>
      )}
      {draft && (id === 'flags' || id === 'analytics') && (
        <form
          onSubmit={preview.submit(async () => {
            setResult(undefined);
            setResult(await api<PreviewResult>(endpoint + '/preview', 'POST', saved));
          })}
        >
          <p className="muted">The preview uses the saved inputs and a temporary SDK store.</p>
          <FormError error={preview.error} />
          <Button type="submit" variant="outlined" disabled={form.busy || preview.busy}>
            Run SDK preview
          </Button>
          {result && (
            <p className="notice" role="status">
              {'count' in result
                ? 'Events recorded in preview: ' + result.count
                : 'Preview decision: ' + (result.enabled ? 'enabled' : 'disabled')}
            </p>
          )}
        </form>
      )}
      {draft && next && (
        <div className="actions">
          <Button
            type="button"
            variant="outlined"
            onClick={next.open}
            disabled={form.busy || preview.busy}
          >
            Continue with {next.title}
          </Button>
        </div>
      )}
    </section>
  );
}

export function TenantOnboarding({
  api,
  path,
  projectId,
  tenantId,
  platforms,
}: {
  api: ReturnType<typeof consoleApi>;
  path: string;
  projectId: string;
  tenantId: string;
  platforms: ReactNode;
}) {
  const [drafts, setDrafts] = useState<TenantSetup>();
  const [selected, select] = useState<DomainId>();
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const url = path + '/setup';
  useEffect(() => {
    let active = true;
    api<TenantSetup>(url).then(
      (data) => {
        if (active) setDrafts(data);
      },
      (error) => {
        if (active) setError(message(error));
      },
    );
    return () => {
      active = false;
    };
  }, [api, url, reload]);
  const refresh = () => {
    select(undefined);
    setError('');
    setDrafts(undefined);
    setReload((count) => count + 1);
  };

  if (error)
    return (
      <section className="panel">
        <FormError error={error} />
        <Button type="button" variant="outlined" onClick={refresh}>
          Retry
        </Button>
      </section>
    );
  if (!drafts) return <p role="status">Loading the onboarding checklist…</p>;
  const savedCount = areas.filter((id) => drafts[id]).length;
  const next = areas.find((id) => id !== selected && !drafts[id]);
  if (selected)
    return (
      <SetupEditor
        key={selected}
        api={api}
        path={url}
        id={selected}
        draft={drafts[selected]}
        close={() => select(undefined)}
        next={next && { title: domains[next].title, open: () => select(next) }}
        onSave={(draft) => setDrafts((previous) => ({ ...previous, [selected]: draft }))}
      />
    );

  return (
    <>
      <section className="panel">
        <div className="section-head top">
          <h2>Tenant onboarding checklist</h2>
          {savedCount > 0 && (
            <Button
              type="button"
              variant="outlined"
              onClick={() =>
                download(projectId + '-' + tenantId + '.setup.json', {
                  version: 1,
                  project: projectId,
                  tenant: tenantId,
                  setup: drafts,
                })
              }
            >
              Download setup drafts
            </Button>
          )}
        </div>
        <p>Configure identity and routing, then work through every SDK area for this tenant.</p>
        <div className="setup-progress">
          <p role="status">
            <strong>
              {savedCount} of {areas.length} SDK setup drafts saved
            </strong>
          </p>
          <progress aria-label="SDK setup drafts saved" value={savedCount} max={areas.length} />
        </div>
        {next && (
          <Button type="button" onClick={() => select(next)}>
            Continue with {domains[next].title}
          </Button>
        )}
        {savedCount === areas.length && (
          <p>
            All drafts are saved. Apply the examples and verify the setup in your staging
            application.
          </p>
        )}
      </section>
      {platforms}
      {groups.map(({ title, areas }) => (
        <section key={title} className="panel" aria-label={title}>
          <h2>{title}</h2>
          <ul className="rows">
            {areas.map((id) => (
              <li key={id}>
                <div>
                  <strong>{domains[id].title}</strong>
                  <p>{domains[id].summary}</p>
                  <p>{drafts[id] ? 'Draft saved' : 'Setup needed'}</p>
                </div>
                <Button type="button" variant="outlined" onClick={() => select(id)}>
                  {drafts[id] ? 'Edit ' : 'Set up '}
                  {domains[id].title}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
