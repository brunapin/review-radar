// Single source of truth for all design tokens.
// No component should hardcode a color, font or size — import from here instead.

export const colors = {
  // ── Backgrounds ──────────────────────────────────────────────
  bg:         '#0a0a0f',
  surface:    '#111118',
  surfaceAlt: '#0e0e15',
  input:      '#18181f',

  // ── Borders ──────────────────────────────────────────────────
  border:      '#1e1e2e',
  borderInput: '#2e2e3e',

  // ── Text ─────────────────────────────────────────────────────
  text:      '#e2e8f0',
  textMuted: '#94a3b8',
  textDim:   '#64748b',

  // ── Brand (violet) ───────────────────────────────────────────
  primary:             '#7c3aed',
  primaryHover:        '#6d28d9',
  primaryBg:           'rgba(124,58,237,0.10)',
  primaryBgHover:      'rgba(124,58,237,0.15)',
  primaryBorder:       'rgba(124,58,237,0.30)',
  primaryBorderActive: 'rgba(124,58,237,0.50)',
  primaryText:         '#a78bfa',

  // ── Positive (green) ─────────────────────────────────────────
  positive:       '#22c55e',
  positiveBg:     'rgba(34,197,94,0.10)',
  positiveBorder: 'rgba(34,197,94,0.25)',
  positiveText:   '#4ade80',

  // ── Neutral (amber) ──────────────────────────────────────────
  neutral:       '#f59e0b',
  neutralBg:     'rgba(245,158,11,0.10)',
  neutralBorder: 'rgba(245,158,11,0.25)',
  neutralText:   '#fbbf24',

  // ── Negative (red) ───────────────────────────────────────────
  negative:           '#ef4444',
  negativeBg:         'rgba(239,68,68,0.10)',
  negativeBorder:     'rgba(239,68,68,0.25)',
  negativeBgHover:    'rgba(239,68,68,0.05)',
  negativeBorderHover:'rgba(239,68,68,0.30)',
  negativeText:       '#f87171',
} as const

export const fonts = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const

export const radii = {
  sm:  '6px',
  md:  '8px',
  lg:  '12px',
  xl:  '16px',
  xxl: '20px',
  full: '9999px',
} as const

export const fontSizes = {
  xs:   '11px',
  sm:   '13px',
  base: '14px',
  md:   '16px',
  lg:   '18px',
  xl:   '20px',
  '2xl':'24px',
  '3xl':'30px',
  '5xl':'48px',
} as const

export const sizes = {
  icon: {
    xs:      13,
    sm:      14,
    md:      15,
    lg:      16,
    xl:      18,
    logo:    20,
    feature: 22,
    brand:   24,
    empty:   40,
  },
  rating: {
    sm: 12,
    md: 14,
  },
} as const
