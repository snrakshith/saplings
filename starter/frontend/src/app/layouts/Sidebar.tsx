import { routes } from '../routes.js';

export function Sidebar({ currentPath }: { currentPath: string }) {
  return (
    <aside className="sidebar">
      <nav aria-label="Main navigation">
        {routes.map(({ path, label }) => (
          <a key={path} href={path} aria-current={currentPath === path ? 'page' : undefined}>
            {label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
