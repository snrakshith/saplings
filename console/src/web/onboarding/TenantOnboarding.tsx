import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@saplings/murphi-ui';
import { domains, type DomainId, type TenantSetup } from '../../onboarding.js';
import { type consoleApi, message } from '../api.js';
import { FormError } from '../forms/FormError.js';
import { areas } from './sections.js';
import { SetupChecklist } from './SetupChecklist.js';
import { SetupEditor } from './SetupEditor.js';

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
    <SetupChecklist
      drafts={drafts}
      next={next}
      select={select}
      projectId={projectId}
      tenantId={tenantId}
      platforms={platforms}
    />
  );
}
