import { useEffect, useState } from 'react';
import type { Project, Tenant } from '../../contracts.js';
import { type consoleApi, message, tenantPath } from '../api.js';
import { FormError } from '../forms/FormError.js';
import { TenantWorkspace } from './TenantWorkspace.js';

export function TenantLoader({
  api,
  project,
  tenantId,
}: {
  api: ReturnType<typeof consoleApi>;
  project: Project;
  tenantId: string;
}) {
  const [tenant, setTenant] = useState<Tenant>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api<Tenant>(tenantPath(project.id, tenantId)).then(
      (result) => {
        if (active) setTenant(result);
      },
      (error) => {
        if (active) setError(message(error));
      },
    );
    return () => {
      active = false;
    };
  }, [api, project.id, tenantId]);

  if (error) return <FormError error={error} />;
  if (!tenant) return <p role="status">Loading the tenant draft…</p>;
  return <TenantWorkspace api={api} project={project} initial={tenant} />;
}
