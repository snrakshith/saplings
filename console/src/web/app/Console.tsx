import { useMemo, useState } from 'react';
import { Button } from '@saplings/murphi-ui';
import type { Project, ProjectSummary, Tenant } from '../../contracts.js';
import { consoleApi } from '../api.js';
import { ProjectForm } from '../projects/ProjectForm.js';
import { TenantForm } from '../tenants/TenantForm.js';
import { TenantLoader } from '../tenants/TenantLoader.js';
import { Sidebar } from './Sidebar.js';

type Selection = { projectId: string; tenantId?: string };
type Screen = 'project' | 'tenant' | 'workspace';

export function Console({
  token,
  initial,
  lock,
}: {
  token: string;
  initial: ProjectSummary[];
  lock: () => void;
}) {
  const api = useMemo(() => consoleApi(token), [token]);
  const [projects, setProjects] = useState(initial);
  const [selection, select] = useState<Selection>(() => ({
    projectId: initial[0]?.id ?? '',
    tenantId: initial[0]?.tenants[0]?.id,
  }));
  const [screen, setScreen] = useState<Screen>('workspace');
  const project = projects.find((item) => item.id === selection.projectId);
  const open = (projectId: string, tenantId?: string) => {
    select({ projectId, tenantId });
    setScreen('workspace');
  };
  return (
    <div className="console-layout">
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <Sidebar
        projects={projects}
        project={screen === 'project' ? undefined : project}
        activeTenantId={screen === 'workspace' ? selection.tenantId : undefined}
        open={open}
        newProject={() => setScreen('project')}
        newTenant={() => setScreen('tenant')}
        lock={lock}
      />
      <main className="workspace" id="workspace" tabIndex={-1}>
        {screen === 'project' ? (
          <>
            <header className="page-heading">
              <h1>Project onboarding</h1>
            </header>
            <ProjectForm
              close={() => setScreen('workspace')}
              create={async (input) => {
                const result = await api<Project>('/projects', 'POST', input);
                setProjects((list) => [...list, { ...result, tenants: [] }]);
                select({ projectId: result.id });
                setScreen('tenant');
              }}
            />
          </>
        ) : project && screen === 'tenant' ? (
          <>
            <header className="page-heading">
              <h1>{project.name}</h1>
            </header>
            <TenantForm
              key={project.id}
              close={() => setScreen('workspace')}
              create={async (payload) => {
                const result = await api<Tenant>(
                  '/projects/' + encodeURIComponent(project.id) + '/tenants',
                  'POST',
                  payload,
                );
                setProjects((list) =>
                  list.map((item) =>
                    item.id === project.id
                      ? {
                          ...item,
                          tenants: [...item.tenants, { id: result.id, name: result.name }],
                        }
                      : item,
                  ),
                );
                open(project.id, result.id);
                return result;
              }}
            />
          </>
        ) : project && selection.tenantId ? (
          <TenantLoader
            key={project.id + '/' + selection.tenantId}
            api={api}
            project={project}
            tenantId={selection.tenantId}
          />
        ) : (
          <>
            <header className="page-heading">
              <h1>{project?.name ?? 'Project onboarding'}</h1>
            </header>
            <section className="panel empty">
              <h2>{project ? 'Onboard your first tenant' : 'Create your first project'}</h2>
              <p>
                {project
                  ? 'Give the tenant its own Kingsman realm and Harbor route configuration. Start from a template or import existing files.'
                  : 'Bring a new or existing application into Saplings by setting up tenants, OIDC clients, and gateway routes.'}
              </p>
              <Button type="button" onClick={() => setScreen(project ? 'tenant' : 'project')}>
                {project ? 'Add tenant' : 'Create project'}
              </Button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
