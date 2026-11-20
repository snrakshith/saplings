import { lightPalette, darkPalette } from './palette.js';
import { typography } from './typography.js';
import { spacing } from './spacing.js';
import { breakpoints } from './breakpoints.js';
import type { XloxTheme, ThemeColors, ThemeTypography } from './types.js';
export type ColorMode = 'light' | 'dark';
export type Density = 'comfortable' | 'compact';
export type ComponentSize = 'small' | 'medium' | 'large';
export type ButtonVariant = 'primary' | 'secondary' | 'outlined' | 'text';
export type SemanticTone =
  'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
export interface DesignOverrides {
  primary?: string;
  secondary?: string;
  radius?: number;
  density?: Density;
  direction?: 'ltr' | 'rtl';
}
const shadow = [
  'none',
  '0 1px 2px rgb(0 0 0 / 0.05)',
  '0 1px 3px rgb(0 0 0 / 0.1)',
  '0 4px 6px rgb(0 0 0 / 0.12)',
  '0 10px 15px rgb(0 0 0 / 0.12)',
  '0 20px 25px rgb(0 0 0 / 0.15)',
  '0 25px 50px rgb(0 0 0 / 0.25)',
];
function hex(value: string) {
  if (!/^#[a-fA-F0-9]{6}$/.test(value)) throw new Error('Expected #RRGGBB design color');
  return value.toLowerCase();
}
function scale(base: ThemeColors['primary'], brand?: string) {
  return brand ? { ...base, 500: hex(brand) } : base;
}
/** Shared, deterministic design language used by Emotion web and native StyleSheet components. */
export function createTheme(mode: ColorMode = 'light', overrides: DesignOverrides = {}): XloxTheme {
  if (!['light', 'dark'].includes(mode)) throw new Error('Invalid color mode');
  const p = mode === 'light' ? lightPalette : darkPalette;
  const radius = overrides.radius ?? 8;
  if (!Number.isFinite(radius) || radius < 0 || radius > 64)
    throw new Error('Invalid border radius');
  const density = overrides.density ?? 'comfortable';
  if (!['compact', 'comfortable'].includes(density)) throw new Error('Invalid density');
  const direction = overrides.direction ?? 'ltr';
  if (!['ltr', 'rtl'].includes(direction)) throw new Error('Invalid direction');
  return {
    colors: {
      ...p,
      primary: scale(p.primary, overrides.primary),
      secondary: scale(p.secondary, overrides.secondary),
    },
    typography,
    spacing,
    breakpoints,
    shadows: [...shadow],
    shape: { borderRadius: radius },
    direction,
    density,
  };
}
export const colorRoles = {
  brand: 'primary',
  accent: 'secondary',
  positive: 'success',
  caution: 'warning',
  negative: 'error',
  informational: 'info',
} as const;
export function spacingPx(units: number, density: Density = 'comfortable') {
  if (!Number.isFinite(units) || units < 0 || units > 100)
    throw new RangeError('Invalid spacing units');
  return units * 8 * (density === 'compact' ? 0.75 : 1);
}
export const radius = { none: 0, sm: 4, md: 8, lg: 12, xl: 16, pill: 9999 } as const;
export const elevations = { none: 0, low: 2, medium: 4, high: 8 } as const;
export function toNativeTypography(v: keyof Omit<ThemeTypography, 'fontFamily'>) {
  const token = typography[v];
  const size = Number.parseFloat(token.fontSize) * (token.fontSize.endsWith('rem') ? 16 : 1);
  return {
    fontSize: size,
    fontWeight: String(token.fontWeight) as '400' | '500' | '600' | '700',
    lineHeight: size * Number(token.lineHeight),
  };
}
export function getSemanticColors(theme: XloxTheme) {
  return {
    background: theme.colors.background.default,
    surface: theme.colors.background.paper,
    text: theme.colors.text.primary,
    textMuted: theme.colors.text.secondary,
    border: theme.colors.neutral[300],
    primary: theme.colors.primary[500],
    onPrimary: '#ffffff',
    secondary: theme.colors.secondary[500],
    success: theme.colors.success[500],
    warning: theme.colors.warning[500],
    error: theme.colors.error[500],
    info: theme.colors.info[500],
  } as const;
}
export function cssVariables(theme: XloxTheme): Record<string, string> {
  const c = getSemanticColors(theme);
  return Object.fromEntries(
    Object.entries(c).map(([key, value]) => [
      `--sapling-${key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}`,
      value,
    ]),
  );
}
export function cssVariableText(theme: XloxTheme, selector = ':root') {
  if (!/^(:root|\[data-sapling-theme=(?:"light"|"dark")\])$/.test(selector))
    throw new Error('Unsafe selector');
  return (
    selector +
    '{' +
    Object.entries(cssVariables(theme))
      .map(([key, value]) => `${key}:${value};`)
      .join('') +
    '}'
  );
}
