import { useEffect, useState } from 'react';
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

const ids = Object.keys(domains) as DomainId[];

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
}: {
  api: ReturnType<typeof consoleApi>;
  path: string;
  id: DomainId;
  draft?: SetupDraft;
  onSave: (next: SetupDraft) => void;
  close: () => void;
}) {
  const domain = domains[id];
  const form = useForm();
  const preview = useForm();
  const [result, setResult] = useState<PreviewResult>();
  const [notice, setNotice] = useState('');
  const endpoint = path + '/' + id;
  const saved = draft?.values ?? {};
  return (
    <section className="panel">
      <div className="section-head top">
        <h2>{domain.title}</h2>
        <Button variant="text" type="button" onClick={close}>
          All setup areas
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
    </section>
  );
}

export function Setup({
  api,
  path,
  projectId,
  tenantId,
}: {
  api: ReturnType<typeof consoleApi>;
  path: string;
  projectId: string;
  tenantId: string;
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
  if (!drafts) return <p role="status">Loading SDK setup…</p>;
  if (selected)
    return (
      <>
        <SetupEditor
          key={selected}
          api={api}
          path={url}
          id={selected}
          draft={drafts[selected]}
          close={() => select(undefined)}
          onSave={(draft) => setDrafts((previous) => ({ ...previous, [selected]: draft }))}
        />
        <Button type="button" variant="text" onClick={refresh}>
          Reload saved setup
        </Button>
      </>
    );

  return (
    <section className="panel">
      <div className="section-head top">
        <h2>SDK setup</h2>
        {Object.keys(drafts).length > 0 && (
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
      <p>
        Set up the capabilities your app uses. Apply the examples in staging with your SDK and
        provider credentials.
      </p>
      <ul className="rows">
        {ids.map((id) => (
          <li key={id}>
            <div>
              <strong>{domains[id].title}</strong>
              <p>{domains[id].summary}</p>
              {drafts[id] && <p>Draft saved</p>}
            </div>
            <Button type="button" variant="outlined" onClick={() => select(id)}>
              {drafts[id] ? 'Edit ' : 'Set up '}
              {domains[id].title}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
