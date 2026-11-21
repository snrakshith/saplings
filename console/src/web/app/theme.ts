import type { CSSProperties } from 'react';
import { createTheme, cssVariables, primaryColors, radius } from '@saplings/ui-core';

export const themeOverrides = { primary: primaryColors[700] };
const theme = createTheme('light', themeOverrides);
export const tokens = {
  ...cssVariables(theme),
  '--corner': radius.lg + 'px',
  '--font': theme.typography.fontFamily,
} as CSSProperties;
