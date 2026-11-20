import type { XloxTheme } from './types.js';
import type { ButtonVariant, ComponentSize } from './design-system.js';
import { spacingPx } from './design-system.js';
/** Shared visual/behavioral contract for web and native button implementations. */
export interface ButtonAppearance {
  backgroundColor: string;
  color: string;
  borderColor: string;
  borderWidth: 0 | 1;
  hoverColor: string;
}
export function buttonAppearance(
  theme: XloxTheme,
  variant: ButtonVariant = 'primary',
): ButtonAppearance {
  const primary = theme.colors.primary,
    secondary = theme.colors.secondary;
  switch (variant) {
    case 'secondary':
      return {
        backgroundColor: secondary[500],
        color: '#ffffff',
        borderColor: secondary[500],
        borderWidth: 0,
        hoverColor: secondary[600],
      };
    case 'outlined':
      return {
        backgroundColor: 'transparent',
        color: primary[500],
        borderColor: primary[500],
        borderWidth: 1,
        hoverColor: primary[50],
      };
    case 'text':
      return {
        backgroundColor: 'transparent',
        color: primary[500],
        borderColor: 'transparent',
        borderWidth: 0,
        hoverColor: primary[50],
      };
    case 'primary':
      return {
        backgroundColor: primary[500],
        color: '#ffffff',
        borderColor: primary[500],
        borderWidth: 0,
        hoverColor: primary[600],
      };
  }
  throw new Error('Unsupported button variant');
}
export function controlMetrics(
  size: ComponentSize = 'medium',
  density: 'comfortable' | 'compact' = 'comfortable',
) {
  const heights = { small: 36, medium: 44, large: 52 };
  const padding = { small: 12, medium: 16, large: 24 };
  if (!Object.hasOwn(heights, size)) throw new Error('Invalid control size');
  return {
    minHeight: heights[size] * (density === 'compact' ? 0.875 : 1),
    paddingHorizontal: padding[size],
    gap: spacingPx(0.75, density),
  };
}
export function clampProgress(value: number, max = 100) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0)
    throw new Error('Invalid progress');
  return {
    now: Math.max(0, Math.min(max, value)),
    max,
    percent: Math.max(0, Math.min(100, (value / max) * 100)),
  };
}
