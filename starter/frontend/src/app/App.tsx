import { useEffect } from 'react';
import { MurphiThemeProvider } from '@saplings/murphi-ui';
import { primaryColors } from '@saplings/ui-core';
import { AppLayout } from './layouts/AppLayout.js';
import { routes } from './routes.js';
import { readColorMode } from '../features/settings/appearance.js';

const overrides = { primary: primaryColors[700] };

export function App() {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const route = routes.find((item) => item.path === path);
  useEffect(() => {
    document.title = (route?.label ?? 'Page not found') + ' · Saplings Starter';
  }, [route]);
  return (
    <MurphiThemeProvider defaultMode={readColorMode()} overrides={overrides}>
      <AppLayout currentPath={path}>
        {route ? (
          <route.Page />
        ) : (
          <>
            <h1>Page not found</h1>
            <a href="/">Return home</a>
          </>
        )}
      </AppLayout>
    </MurphiThemeProvider>
  );
}
