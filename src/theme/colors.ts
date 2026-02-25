import type { ThemeConfig } from 'antd'
import palette from './palette.json'

const neutralShades = Object.values(palette.neutral) as readonly string[]
const accentShades = Object.values(palette.accent) as readonly string[]

export const neutralPalette = neutralShades
export const accentPalette = accentShades

export const linkColors = {
  default: palette.accent['700'],
  hover: palette.accent['500'],
  active: palette.accent['800'],
} as const

export const themeColors = {
  primary: palette.neutral['900'],
  primaryLight: palette.neutral['700'],
  primaryLighter: palette.neutral['500'],
  primaryLightest: palette.neutral['300'],
  primaryDark: '#000000',
  primaryBg: palette.neutral['50'],
  primaryBgDark: palette.neutral['200'],
  primaryBorder: palette.neutral['300'],
  accent: palette.accent['700'],
  accentLight: palette.accent['500'],
  accentDark: palette.accent['800'],
  accentBg: palette.accent['50'],
  accentBorder: palette.accent['200'],
  headerBg: palette.accent['700'],
  headerText: '#FFFFFF',
  headerTextMuted: palette.accent['200'],
  success: '#22c55e',
  successBg: '#dcfce7',
  successBorder: '#86efac',
} as const

/** Ant Design theme config for ConfigProvider */
export const antdColourTheme: ThemeConfig = {
  token: {
    colorPrimary: themeColors.primary,
    colorPrimaryBg: themeColors.primaryBg,
    colorPrimaryBgHover: palette.neutral['100'],
    colorPrimaryBorder: themeColors.primaryBorder,
    colorPrimaryBorderHover: palette.neutral['400'],
    colorPrimaryHover: themeColors.primaryLight,
    colorBgSolidHover: palette.neutral['700'],
    colorPrimaryActive: themeColors.primaryDark,
    colorPrimaryTextHover: themeColors.primaryLight,
    colorPrimaryText: themeColors.primary,
    colorPrimaryTextActive: themeColors.primaryDark,
    colorInfo: themeColors.accent,
    colorInfoBg: themeColors.accentBg,
    colorInfoBgHover: palette.accent['100'],
    colorInfoBorder: themeColors.accentBorder,
    colorInfoBorderHover: palette.accent['300'],
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
  --color-accent: ${themeColors.accent};
  --color-accent-light: ${themeColors.accentLight};
  --color-accent-dark: ${themeColors.accentDark};
  --color-accent-bg: ${themeColors.accentBg};
  --color-accent-border: ${themeColors.accentBorder};
  --color-header-bg: ${themeColors.headerBg};
  --color-header-text: ${themeColors.headerText};
  --color-header-text-muted: ${themeColors.headerTextMuted};
  --color-success: ${themeColors.success};
  --color-success-bg: ${themeColors.successBg};
  --color-success-border: ${themeColors.successBorder};
}
`.trim()
}
