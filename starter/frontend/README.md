# Starter frontend

Start the frontend and API together with `pnpm dev` from the parent Starter directory.

| Path under `src/` | Responsibility |
| --- | --- |
| `main.tsx` | Mounts React and starts browser observability. |
| `app/App.tsx`, `app/routes.ts` | Mount the Murphi theme, resolve page URLs and titles, and handle unknown paths. |
| `app/layouts/` | Shared header, sidebar navigation, main content landmark, and footer. |
| `features/` | Identity, capabilities, services, providers, catalog, settings, and activity. A page can reuse feature components such as the workspace profile form. |
| `lib/api.ts` | Shared request helpers and Saplings Hooks integration. |

To add a page, create its component in `features/<feature>/pages/` and register its path, navigation label, and component in `app/routes.ts`. The sidebar uses that same registry. Both Vite and the deployed Nginx configuration support direct page loads. The browser journeys in `test/` cover navigation, profile and theme persistence, activity permissions, and SDK workflows.

See the [Starter guide](../README.md) for the local and durable profiles.
