import { Identity } from '../features/auth/Identity.js';
import { Catalog } from '../features/catalog/Catalog.js';
import { Capabilities } from '../features/dashboard/Capabilities.js';
import { Home } from '../features/home/Home.js';
import { Services } from '../features/products/Services.js';
import { Providers } from '../features/providers/Providers.js';
import { SettingsPage } from '../features/settings/pages/SettingsPage.js';
import { ActivityPage } from '../features/activity/pages/ActivityPage.js';

export const routes = [
  { path: '/', label: 'Home', Page: Home },
  { path: '/dashboard', label: 'Capabilities', Page: Capabilities },
  { path: '/services', label: 'Services', Page: Services },
  { path: '/providers', label: 'Providers', Page: Providers },
  { path: '/catalog', label: 'SDK catalog', Page: Catalog },
  { path: '/activity', label: 'Activity', Page: ActivityPage },
  { path: '/settings', label: 'Settings', Page: SettingsPage },
  { path: '/login', label: 'Identity', Page: Identity },
];
