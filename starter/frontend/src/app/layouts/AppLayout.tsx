import type { CSSProperties, ReactNode } from 'react';
import { useTheme } from '@saplings/murphi-ui';
import { cssVariables } from '@saplings/ui-core';
import { Header } from './Header.js';
import { Sidebar } from './Sidebar.js';
import { Footer } from './Footer.js';

export function AppLayout({ currentPath, children }: { currentPath: string; children: ReactNode }) {
  const { theme, mode } = useTheme();
  return (
    <div
      className="app"
      style={{ ...cssVariables(theme), colorScheme: mode } as CSSProperties}
      data-theme={mode}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header />
      <div className="workspace">
        <Sidebar currentPath={currentPath} />
        <div className="content">
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
