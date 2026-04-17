import type { ReactNode } from 'react'
import { Minus, Star, ThumbsDown, ThumbsUp } from 'lucide-react'
import { colors, fonts, fontSizes, radii, sizes } from '../tokens'

export type SentimentFilter = 'all' | 'positive' | 'neutral' | 'negative'

interface FilterBarProps {
  value: SentimentFilter
  onChange: (value: SentimentFilter) => void
  counts: Record<SentimentFilter, number>
}

const FILTER_OPTIONS: { value: SentimentFilter; label: string; icon: ReactNode }[] = [
  { value: 'all',      label: 'All',      icon: <Star size={sizes.icon.xs} /> },
  { value: 'positive', label: 'Positive', icon: <ThumbsUp size={sizes.icon.xs} /> },
  { value: 'neutral',  label: 'Neutral',  icon: <Minus size={sizes.icon.xs} /> },
  { value: 'negative', label: 'Negative', icon: <ThumbsDown size={sizes.icon.xs} /> },
]

const filterAccent: Record<SentimentFilter, { active: string; border: string }> = {
  all:      { active: colors.primaryBg,  border: colors.primaryBorder },
  positive: { active: colors.positiveBg, border: colors.positiveBorder },
  neutral:  { active: colors.neutralBg,  border: colors.neutralBorder },
  negative: { active: colors.negativeBg, border: colors.negativeBorder },
}

const filterTextActive: Record<SentimentFilter, string> = {
  all:      colors.primaryText,
  positive: colors.positiveText,
  neutral:  colors.neutralText,
  negative: colors.negativeText,
}

export function FilterBar({ value, onChange, counts }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-5" style={{ fontFamily: fonts.sans }}>
      {FILTER_OPTIONS.map(opt => {
        const isActive = value === opt.value
        const a = filterAccent[opt.value]
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: isActive ? a.active : colors.surface,
              border: `1px solid ${isActive ? a.border : colors.border}`,
              color: isActive ? filterTextActive[opt.value] : colors.textMuted,
              borderRadius: radii.lg,
              fontSize: fontSizes.sm,
            }}
          >
            {opt.icon}
            {opt.label}
            <span
              className="px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : colors.input,
                color: isActive ? filterTextActive[opt.value] : colors.textDim,
                fontSize: fontSizes.xs,
              }}
            >
              {counts[opt.value]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
