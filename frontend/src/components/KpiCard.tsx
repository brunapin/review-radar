import type { ReactNode } from 'react'
import { colors, fonts, fontSizes, radii } from '../tokens'

type Accent = 'violet' | 'positive' | 'neutral' | 'negative'

interface Props {
  label: string
  value: string | number
  sub?: string
  icon: ReactNode
  accent?: Accent
  onClick?: () => void
  active?: boolean
}

const accentMap: Record<Accent, { iconBg: string; iconBorder: string; iconColor: string; activeBorder: string }> = {
  violet:   { iconBg: colors.primaryBg,   iconBorder: colors.primaryBorder,   iconColor: colors.primaryText,  activeBorder: colors.primaryBorderActive },
  positive: { iconBg: colors.positiveBg,  iconBorder: colors.positiveBorder,  iconColor: colors.positiveText, activeBorder: colors.positiveBorder },
  neutral:  { iconBg: colors.neutralBg,   iconBorder: colors.neutralBorder,   iconColor: colors.neutralText,  activeBorder: colors.neutralBorder },
  negative: { iconBg: colors.negativeBg,  iconBorder: colors.negativeBorder,  iconColor: colors.negativeText, activeBorder: colors.negativeBorder },
}

export function KpiCard({ label, value, sub, icon, accent = 'violet', onClick, active = false }: Props) {
  const a = accentMap[accent]
  const isClickable = Boolean(onClick)

  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? e => e.key === 'Enter' && onClick?.() : undefined}
      className="rounded-xl border p-5 flex items-start gap-4 transition-all"
      style={{
        backgroundColor: colors.surface,
        borderColor: active ? a.activeBorder : colors.border,
        cursor: isClickable ? 'pointer' : 'default',
        boxShadow: active ? `0 0 0 1px ${a.activeBorder}` : 'none',
        borderRadius: radii.xl,
        fontFamily: fonts.sans,
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: a.iconBg, border: `1px solid ${a.iconBorder}`, borderRadius: radii.lg }}
      >
        <span style={{ color: a.iconColor }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p
          className="font-medium uppercase mb-1"
          style={{ color: colors.textDim, fontSize: fontSizes.xs }}
        >
          {label}
        </p>
        <p className="font-bold leading-none" style={{ color: colors.text, fontSize: fontSizes['2xl'] }}>
          {value}
        </p>
        {sub && (
          <p className="mt-1" style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}
