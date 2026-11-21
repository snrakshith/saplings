import { StrictMode, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, MurphiThemeProvider } from '@saplings/murphi-ui';
import { createTheme, cssVariables, primaryColors, radius } from '@saplings/ui-core';

import type { Project, ProjectSummary, Tenant } from '../contracts.js';
import { consoleApi, tenantPath } from './api.js';
import { Field, FormError, ProjectForm, TenantForm, message, useForm, value } from './forms.js';
import { TenantWorkspace } from './tenant.js';
import './style.css';

const themeOverrides = { primary: primaryColors[700] };
const theme = createTheme('light', themeOverrides);
const tokens = {
  ...cssVariables(theme),
  '--corner': radius.lg + 'px',
  '--font': theme.typography.fontFamily,
} as CSSProperties;

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        S
      </span>
      <div>
        <strong>Saplings</strong>
        <span>Developer Console</span>
      </div>
    </div>
  );
}

function TenantLoader({
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

type Selection = { projectId: string; tenantId?: string };
type Screen = 'project' | 'tenant' | 'workspace';

function Console({
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
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Projects" className="projects">
          <div className="sidebar-heading">
            <h2>Projects</h2>
            <Button type="button" variant="outlined" onClick={() => setScreen('project')}>
              New project
            </Button>
          </div>
          {projects.length === 0 && <p className="muted">No projects yet</p>}
          <ul>
            {projects.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="project-link"
                  onClick={() => open(item.id, item.tenants[0]?.id)}
                  aria-current={
                    project?.id === item.id && screen !== 'project' ? 'true' : undefined
                  }
                >
                  <strong>{item.name}</strong>
                  <span>
                    {item.tenants.length} {item.tenants.length === 1 ? 'tenant' : 'tenants'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        {project && screen !== 'project' && (
          <nav className="projects tenants" aria-label="Tenants">
            <div className="sidebar-heading">
              <h2>Tenants</h2>
              <Button type="button" variant="outlined" onClick={() => setScreen('tenant')}>
                Add tenant
              </Button>
            </div>
            <ul>
              {project.tenants.map((tenant) => (
                <li key={tenant.id}>
                  <button
                    type="button"
                    className="tenant-link"
                    aria-current={
                      selection.tenantId === tenant.id && screen === 'workspace'
                        ? 'page'
                        : undefined
                    }
                    onClick={() => open(project.id, tenant.id)}
                  >
                    {tenant.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <footer className="sidebar-footer">
          <span>Local workspace</span>
          <Button type="button" variant="text" onClick={lock}>
            Lock console
          </Button>
        </footer>
      </aside>
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

function App() {
  const [session, setSession] = useState<{ token: string; projects: ProjectSummary[] }>();
  const form = useForm();
  return (
    <div style={tokens}>
      {session ? (
        <Console
          token={session.token}
          initial={session.projects}
          lock={() => setSession(undefined)}
        />
      ) : (
        <main className="unlock">
          <section className="panel">
            <Brand />
            <h1>Open your workspace</h1>
            <p>Manage project onboarding, Kingsman identity, and Harbor routes.</p>
            <form
              onSubmit={form.submit(async (fields) => {
                const token = value(fields, 'token');
                const projects = await consoleApi(token)<ProjectSummary[]>('/projects');
                setSession({ token, projects });
              })}
            >
              <fieldset disabled={form.busy}>
                <Field
                  label="Console access token"
                  hint="Copy the token from the console server terminal or your local configuration."
                >
                  <input name="token" type="password" required autoComplete="off" />
                </Field>
                <FormError error={form.error} />
                <Button type="submit">Unlock console</Button>
              </fieldset>
            </form>
          </section>
        </main>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MurphiThemeProvider overrides={themeOverrides}>
      <App />
    </MurphiThemeProvider>
  </StrictMode>,
);
