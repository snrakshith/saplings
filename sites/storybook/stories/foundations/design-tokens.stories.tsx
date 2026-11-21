import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  breakpoints,
  buttonAppearance,
  colors,
  controlMetrics,
  createTheme,
  cssVariables,
  elevations,
  getSemanticColors,
  radius,
  resolveResponsive,
  spacingPx,
  toNativeTypography,
  type ButtonVariant,
  type ComponentSize,
  type ThemeTypography,
  type XloxTheme,
} from '@saplings/ui-core';
import { storyTheme } from '../../.storybook/story-theme.tsx';

function tokenTheme(globals: Record<string, unknown>) {
  const { mode, density } = storyTheme(globals);
  return createTheme(mode, { density });
}

function TokenTable({
  title,
  theme,
  columns,
  rows,
}: {
  title: string;
  theme: XloxTheme;
  columns: string[];
  rows: ReactNode[][];
}) {
  const { border, surface } = getSemanticColors(theme);
  const cell = { padding: spacingPx(1, theme.density), borderBottom: `1px solid ${border}` };
  return (
    <div style={{ overflowX: 'auto', marginBottom: spacingPx(3, theme.density) }}>
      <table style={{ width: '100%', textAlign: 'start', borderCollapse: 'collapse' }}>
        <caption style={{ textAlign: 'start', fontWeight: 600, padding: cell.padding }}>
          {title}
        </caption>
        <thead style={{ background: surface }}>
          <tr>
            {columns.map((name) => (
              <th key={name} scope="col" style={cell}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, ...values]) => (
            <tr key={String(name)}>
              <th scope="row" style={{ ...cell, fontWeight: 500 }}>
                <code>{name}</code>
              </th>
              {values.map((value, index) => (
                <td key={columns[index + 1]} style={cell}>
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Swatch({ value, border }: { value: string; border: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span
        aria-hidden="true"
        style={{
          width: 24,
          height: 20,
          background: value,
          border: `1px solid ${border}`,
          borderRadius: radius.sm,
        }}
      />
      <code>{value}</code>
    </span>
  );
}

const meta = {
  tags: ['autodocs'],
  title: 'Foundations/Design tokens',
  parameters: {
    docs: {
      description: {
        component: [
          'Both UI packages use the design language in `@saplings/ui-core`. The tables read the same exports used by the components. Use the Theme and Density toolbars to compare values.',
          'Create a theme with `createTheme(mode, overrides)`. Apply `cssVariables(theme)` to web surfaces and use `getSemanticColors(theme)`, `spacingPx(units, density)`, and `toNativeTypography(variant)` for numeric native styles. `theme.spacing(units)` returns a CSS pixel string on the base scale.',
          'For responsive styles, use the same `breakpoints.values` on both platforms. Use `breakpoints.up` to build a CSS query and `resolveResponsive` to resolve a value for a measured width.',
          'Set brand colors, radius, density, or direction through the platform provider’s `overrides` prop. Components that use density-aware spacing or control metrics respond to density changes.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const SemanticColors: Story = {
  render: (_args, { globals }) => {
    const theme = tokenTheme(globals);
    const { border } = getSemanticColors(theme);
    return (
      <TokenTable
        title="Semantic colors and CSS variables"
        theme={theme}
        columns={['CSS variable', 'Resolved color']}
        rows={Object.entries(cssVariables(theme)).map(([name, value]) => [
          name,
          <Swatch value={value} border={border} />,
        ])}
      />
    );
  },
};

export const Palettes: Story = {
  render: (_args, { globals }) => {
    const theme = tokenTheme(globals);
    const { border } = getSemanticColors(theme);
    const { background, text, ...ramps } = theme.colors;
    return (
      <>
        <TokenTable
          title="Themed palettes"
          theme={theme}
          columns={['Role and shade', 'Color']}
          rows={[
            ...Object.entries(ramps).flatMap(([role, shades]) =>
              Object.entries(shades).map(([shade, value]) => [
                `${role}.${shade}`,
                <Swatch value={value} border={border} />,
              ]),
            ),
            ...Object.entries(background).map(([role, value]) => [
              `background.${role}`,
              <Swatch value={value} border={border} />,
            ]),
            ...Object.entries(text).map(([role, value]) => [
              `text.${role}`,
              <Swatch value={value} border={border} />,
            ]),
          ]}
        />
        <TokenTable
          title="Raw color families"
          theme={theme}
          columns={['Family and shade', 'Color']}
          rows={Object.entries(colors).flatMap(([family, shades]) =>
            Object.entries(shades).map(([shade, value]) => [
              `${family}.${shade}`,
              <Swatch value={value} border={border} />,
            ]),
          )}
        />
      </>
    );
  },
};

export const Typography: Story = {
  render: (_args, { globals }) => {
    const theme = tokenTheme(globals);
    const { fontFamily, ...variants } = theme.typography;
    return (
      <>
        <p>
          Font stack <code>{fontFamily}</code>
        </p>
        <TokenTable
          title="Type scale"
          theme={theme}
          columns={[
            'Variant',
            'Sample',
            'Web size and line height',
            'Native size and line height',
            'Weight',
          ]}
          rows={Object.entries(variants).map(([name, variant]) => {
            const native = toNativeTypography(name as keyof Omit<ThemeTypography, 'fontFamily'>);
            return [
              name,
              <span style={variant}>Workspace</span>,
              `${variant.fontSize} / ${variant.lineHeight}`,
              `${native.fontSize} / ${Number(native.lineHeight.toFixed(2))}`,
              variant.fontWeight,
            ];
          })}
        />
      </>
    );
  },
};

export const Layout: Story = {
  render: (_args, { globals }) => {
    const theme = tokenTheme(globals);
    const { primary, surface, border } = getSemanticColors(theme);
    return (
      <>
        <TokenTable
          title="Spacing"
          theme={theme}
          columns={['Design units', 'Current spacingPx', 'Base CSS spacing', 'Scale']}
          rows={[0, 0.5, 1, 1.5, 2, 3, 4, 6, 8].map((units) => {
            const width = spacingPx(units, theme.density);
            return [
              units,
              `${width}px`,
              theme.spacing(units),
              <span
                aria-hidden="true"
                style={{ display: 'block', width, height: 12, background: primary }}
              />,
            ];
          })}
        />
        <TokenTable
          title="Responsive breakpoints"
          theme={theme}
          columns={['Breakpoint', 'Minimum width', 'Example resolved columns']}
          rows={Object.entries(breakpoints.values).map(([name, width]) => [
            name,
            `${width}px`,
            resolveResponsive({ xs: 1, md: 2, xl: 3 }, width),
          ])}
        />
        <TokenTable
          title="Shape and depth"
          theme={theme}
          columns={['Token', 'Value', 'Sample']}
          rows={[
            ...Object.entries(radius).map(([name, value]) => [
              `radius.${name}`,
              `${value}px`,
              <span
                aria-hidden="true"
                style={{
                  display: 'block',
                  width: 40,
                  height: 24,
                  background: primary,
                  borderRadius: value,
                }}
              />,
            ]),
            [
              'theme.shape.borderRadius',
              `${theme.shape.borderRadius}px`,
              'Default component radius',
            ],
            ...Object.entries(elevations).map(([name, value]) => [
              `elevations.${name}`,
              value,
              'Numeric elevation',
            ]),
            ...theme.shadows.map((shadow, index) => [
              `theme.shadows[${index}]`,
              <code>{shadow}</code>,
              <span
                aria-hidden="true"
                style={{
                  display: 'block',
                  width: 40,
                  height: 24,
                  background: surface,
                  border: `1px solid ${border}`,
                  boxShadow: shadow,
                }}
              />,
            ]),
            ['theme.direction', theme.direction, 'Text direction'],
          ]}
        />
      </>
    );
  },
};

export const Controls: Story = {
  render: (_args, { globals }) => {
    const theme = tokenTheme(globals);
    const sizes: ComponentSize[] = ['small', 'medium', 'large'];
    const variants: ButtonVariant[] = ['primary', 'secondary', 'outlined', 'text'];
    return (
      <>
        <TokenTable
          title="Control metrics"
          theme={theme}
          columns={['Size', 'Minimum height', 'Horizontal padding', 'Content gap']}
          rows={sizes.map((size) => {
            const { minHeight, paddingHorizontal, gap } = controlMetrics(size, theme.density);
            return [size, `${minHeight}px`, `${paddingHorizontal}px`, `${gap}px`];
          })}
        />
        <TokenTable
          title="Button appearance"
          theme={theme}
          columns={['Variant', 'Foreground', 'Background', 'Border', 'Hover background']}
          rows={variants.map((variant) => {
            const appearance = buttonAppearance(theme, variant);
            return [
              variant,
              appearance.color,
              appearance.backgroundColor,
              `${appearance.borderWidth}px ${appearance.borderColor}`,
              appearance.hoverColor,
            ];
          })}
        />
      </>
    );
  },
};
