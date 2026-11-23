import React from 'react';
import { createRoot } from 'react-dom/client';
import { MurphiThemeProvider } from '@saplings/murphi-ui';
import { createTheme, cssVariables, primaryColors } from '@saplings/ui-core';
import { SaplingProfiler } from '@saplings/quality-browser-runtime/react';
import { startFrontendObservability } from '@saplings/quality-browser-runtime';

import { Catalog } from './starter/Catalog.js';
import { Capabilities } from './starter/Capabilities.js';
import { Services } from './starter/Services.js';
import { Identity } from './starter/Identity.js';
import { Home } from './starter/Home.js';
import './style.css';

startFrontendObservability({ endpoint: import.meta.env.VITE_TELEMETRY_URL || undefined });
const overrides = { primary: primaryColors[700] };
const tokens = cssVariables(createTheme('light', overrides)) as React.CSSProperties;
const path = location.pathname;

function App() {
  return (
    <MurphiThemeProvider overrides={overrides}>
      <div className="app" style={tokens}>
        <header className="site-header">
          <a className="brand" href="/">
            Saplings Starter
          </a>
          <nav aria-label="Main navigation">
            <a href="/" aria-current={path === '/' ? 'page' : undefined}>
              Home
            </a>
            <a href="/login" aria-current={path === '/login' ? 'page' : undefined}>
              Identity
            </a>
            <a href="/dashboard" aria-current={path === '/dashboard' ? 'page' : undefined}>
              Capabilities
            </a>
            <a href="/services" aria-current={path === '/services' ? 'page' : undefined}>
              Services
            </a>
            <a href="/catalog" aria-current={path === '/catalog' ? 'page' : undefined}>
              SDK catalog
            </a>
          </nav>
        </header>
        <main>
          {path === '/dashboard' ? (
            <Capabilities />
          ) : path === '/services' ? (
            <Services />
          ) : path === '/catalog' ? (
            <Catalog />
          ) : path === '/login' ? (
            <Identity />
          ) : (
            <Home />
          )}
        </main>
      </div>
    </MurphiThemeProvider>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SaplingProfiler id="app">
      <App />
    </SaplingProfiler>
  </React.StrictMode>,
);
