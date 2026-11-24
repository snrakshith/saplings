import React from 'react';
import { createRoot } from 'react-dom/client';
import { SaplingProfiler } from '@saplings/quality-browser-runtime/react';
import { startFrontendObservability } from '@saplings/quality-browser-runtime';

import { App } from './app/App.js';
import './style.css';

startFrontendObservability({ endpoint: import.meta.env.VITE_TELEMETRY_URL || undefined });
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SaplingProfiler id="app">
      <App />
    </SaplingProfiler>
  </React.StrictMode>,
);
