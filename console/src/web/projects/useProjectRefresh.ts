import { useEffect } from 'react';

import type { ProjectSummary } from '../../contracts.js';
import type { consoleApi } from '../api.js';

export function useProjectRefresh(
  api: ReturnType<typeof consoleApi>,
  update: (projects: ProjectSummary[]) => void,
) {
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(async () => {
        try {
          const projects = await api<ProjectSummary[]>('/projects');
          if (active) update(projects);
        } catch {
          // Keep the last project list while the development server is unavailable.
        }
        if (active) schedule();
      }, 2500);
    };
    schedule();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [api, update]);
}
