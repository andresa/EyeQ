/**
 * Single source of truth for application colors.
 * Green palette used throughout the app (buttons, inputs, spinners, etc.)
 */

import type { ThemeConfig } from 'antd'

// Green palette: lightest (50) to darkest (900)
export const greenPalette = [
  '#f0fdf4',
  '#dcfce7',
  '#bbf7d0',
  '#86efac',
  '#4ade80',
  '#22c55e',
  '#16a34a',
  '#15803d',
  '#166534',
  '#14532d',
] as const

// Link colors (teal for cohesive green theme)
export const linkColors = {
  default: '#0d9488',
  hover: '#14b8a6',
  active: '#0f766e',
} as const

export const themeColors = {
  primary: '#15803d',
  primaryLight: greenPalette[6],
  primaryDark: greenPalette[8],
  primaryBg: greenPalette[1],
  primaryBorder: greenPalette[3],
  // Header (dark green)
  headerBg: '#14532d',
  headerText: greenPalette[2],
  headerTextMuted: greenPalette[3],
  // Success (align with palette)
  success: greenPalette[5],
  successBg: greenPalette[1],
  successBorder: greenPalette[3],
} as const

/** Ant Design theme config for ConfigProvider */
export const antdColourTheme: ThemeConfig = {
  token: {
    colorPrimary: themeColors.primary,
    colorPrimaryBg: themeColors.primaryBg,
    colorPrimaryBgHover: greenPalette[2],
    colorPrimaryBorder: themeColors.primaryBorder,
    colorPrimaryBorderHover: greenPalette[4],
    colorPrimaryHover: themeColors.primaryLight,
    colorBgSolidHover: greenPalette[2],
    colorPrimaryActive: themeColors.primaryDark,
    colorPrimaryTextHover: themeColors.primaryLight,
    colorPrimaryText: themeColors.primary,
    colorPrimaryTextActive: themeColors.primaryDark,
    colorSuccess: themeColors.success,
    colorSuccessBg: themeColors.successBg,
    colorSuccessBgHover: greenPalette[2],
    colorSuccessBorder: themeColors.successBorder,
    colorSuccessBorderHover: greenPalette[4],
    colorInfo: themeColors.primary,
    colorInfoBg: themeColors.primaryBg,
    colorInfoBgHover: greenPalette[2],
    colorInfoBorder: themeColors.primaryBorder,
    colorInfoBorderHover: greenPalette[4],
    colorLink: linkColors.default,
    colorLinkHover: linkColors.hover,
    colorLinkActive: linkColors.active,
    fontSize: 16,
  },
}

/** Returns CSS variables string for injection into :root */
export function getCssVariables(): string {
  return `
:root {
  --color-primary: ${themeColors.primary};
  --color-primary-light: ${themeColors.primaryLight};
  --color-primary-dark: ${themeColors.primaryDark};
  --color-primary-bg: ${themeColors.primaryBg};
  --color-primary-border: ${themeColors.primaryBorder};
  --color-header-bg: ${themeColors.headerBg};
  --color-header-text: ${themeColors.headerText};
  --color-header-text-muted: ${themeColors.headerTextMuted};
  --color-success: ${themeColors.success};
  --color-success-bg: ${themeColors.successBg};
  --color-success-border: ${themeColors.successBorder};
}
`.trim()
}
