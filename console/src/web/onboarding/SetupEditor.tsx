import { useEffect, useRef, useState } from 'react';
import { Button } from '@saplings/murphi-ui';
import { domains, type DomainId, type PreviewResult, type SetupDraft } from '../../onboarding.js';
import type { consoleApi } from '../api.js';
import { FormError } from '../forms/FormError.js';
import { useForm } from '../forms/useForm.js';
import { value } from '../forms/values.js';
import { SetupInput } from './SetupInput.js';

export function SetupEditor({
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
