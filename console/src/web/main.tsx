import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MurphiThemeProvider } from '@saplings/murphi-ui';
import { App } from './app/App.js';
import { themeOverrides } from './app/theme.js';
import './style.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MurphiThemeProvider overrides={themeOverrides}>
      <App />
    </MurphiThemeProvider>
  </StrictMode>,
);
