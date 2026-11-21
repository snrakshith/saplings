import { Button } from '@saplings/murphi-ui';
import type { ProjectSummary } from '../../contracts.js';
import { Brand } from './Brand.js';

export function Sidebar({
  projects,
  project,
  activeTenantId,
  open,
  newProject,
  newTenant,
  lock,
}: {
  projects: ProjectSummary[];
  project?: ProjectSummary;
  activeTenantId?: string;
  open: (projectId: string, tenantId?: string) => void;
  newProject: () => void;
  newTenant: () => void;
  lock: () => void;
}) {
  return (
    <aside className="sidebar">
      <Brand />
      <nav aria-label="Projects" className="projects">
        <div className="sidebar-heading">
          <h2>Projects</h2>
          <Button type="button" variant="outlined" onClick={newProject}>
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
                aria-current={project?.id === item.id ? 'true' : undefined}
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
      {project && (
        <nav className="projects tenants" aria-label="Tenants">
          <div className="sidebar-heading">
            <h2>Tenants</h2>
            <Button type="button" variant="outlined" onClick={newTenant}>
              Add tenant
            </Button>
          </div>
          <ul>
            {project.tenants.map((tenant) => (
              <li key={tenant.id}>
                <button
                  type="button"
                  className="tenant-link"
                  aria-current={activeTenantId === tenant.id ? 'page' : undefined}
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
  );
}
