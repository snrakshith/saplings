import type { ColorMode } from '@saplings/ui-core';

const key = 'saplings-starter.appearance';

export function readColorMode(): ColorMode {
  try {
    return localStorage.getItem(key) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveColorMode(mode: ColorMode) {
  try {
    localStorage.setItem(key, mode);
  } catch {
    // The theme still applies to this page when browser storage is unavailable.
  }
}
