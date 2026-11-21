import type { ReactNode } from 'react';
import {
  createTheme,
  getSemanticColors,
  spacingPx,
  type ColorMode,
  type Density,
} from '@saplings/ui-core';

export function storyTheme(globals: Record<string, unknown>): {
  mode: ColorMode;
  density: Density;
} {
  return {
    mode: globals.colorMode === 'dark' ? 'dark' : 'light',
    density: globals.density === 'compact' ? 'compact' : 'comfortable',
  };
}

export function StoryCanvas({
  mode,
  density,
  children,
}: {
  mode: ColorMode;
  density: Density;
  children: ReactNode;
}) {
  const theme = createTheme(mode, { density });
  const tokens = getSemanticColors(theme);
  return (
    <div
      style={{
        background: tokens.background,
        color: tokens.text,
        fontFamily: theme.typography.fontFamily,
        padding: spacingPx(3, density),
        borderRadius: theme.shape.borderRadius,
      }}
    >
      {children}
    </div>
  );
}
