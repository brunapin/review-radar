import { format } from 'date-fns'
import { useState } from 'react'
import { colors, fonts, fontSizes, radii, sizes } from '../tokens'
import type { Review } from '../types'
import { StarRating } from './StarRating'

interface Props {
  review: Review
}

type Sentiment = 'positive' | 'neutral' | 'negative'

function getSentiment(score: number): Sentiment {
  if (score >= 4) return 'positive'
  if (score === 3) return 'neutral'
  return 'negative'
}

const sentimentStyles: Record<Sentiment, { label: string; color: string; bg: string; border: string; bar: string }> = {
  positive: { label: 'Positive', color: colors.positiveText, bg: colors.positiveBg,  border: colors.positiveBorder, bar: colors.positive },
  neutral:  { label: 'Neutral',  color: colors.neutralText,  bg: colors.neutralBg,   border: colors.neutralBorder,  bar: colors.neutral  },
  negative: { label: 'Negative', color: colors.negativeText, bg: colors.negativeBg,  border: colors.negativeBorder, bar: colors.negative },
}

export function ReviewCard({ review }: Props) {
  const [expanded, setExpanded] = useState(false)
  const isLong = review.content.length > 280
  const displayContent = !expanded && isLong ? review.content.slice(0, 280) + '…' : review.content

  const s = sentimentStyles[getSentiment(review.score)]
  const publishedDate = format(new Date(review.updatedAt), 'MMM d, yyyy')
  const publishedTime = format(new Date(review.updatedAt), 'HH:mm')

  return (
    <div
      className="flex rounded-xl border overflow-hidden transition-colors hover:border-violet-500/20"
      style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl, fontFamily: fonts.sans }}
    >
      {/* Score accent bar */}
      <div className="w-1 flex-shrink-0" style={{ backgroundColor: s.bar }} />

      {/* Main content + metadata */}
      <div className="flex flex-1 min-w-0" style={{ borderColor: colors.border }}>
        {/* Review body */}
        <div className="flex-1 min-w-0 p-5">
          <div className="mb-2">
            <StarRating score={review.score} size={sizes.rating.md} />
          </div>
          {review.title && (
            <h3 className="font-semibold leading-snug mb-1.5" style={{ color: colors.text, fontSize: fontSizes.sm }}>
              {review.title}
            </h3>
          )}
          <p className="leading-relaxed" style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            {displayContent}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="mt-2 font-medium transition-colors"
              style={{ color: colors.primaryText, fontSize: fontSizes.xs }}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {/* Metadata sidebar */}
        <div
          className="w-44 flex-shrink-0 p-4 space-y-3 border-l"
          style={{ backgroundColor: colors.surfaceAlt, borderColor: colors.border, fontSize: fontSizes.xs }}
        >
          <div>
            <p className="font-medium mb-0.5" style={{ color: colors.textDim }}>Published</p>
            <p style={{ color: colors.textMuted }}>{publishedDate}</p>
            <p style={{ color: colors.textDim }}>{publishedTime}</p>
          </div>
          <div>
            <p className="font-medium mb-0.5" style={{ color: colors.textDim }}>Author</p>
            <p className="truncate" title={review.author} style={{ color: colors.textMuted }}>
              {review.author}
            </p>
          </div>
          {review.version && (
            <div>
              <p className="font-medium mb-0.5" style={{ color: colors.textDim }}>Version</p>
              <p style={{ color: colors.textMuted }}>{review.version}</p>
            </div>
          )}
          <div>
            <p className="font-medium mb-1" style={{ color: colors.textDim }}>Sentiment</p>
            <span
              className="inline-flex px-2 py-0.5 rounded-full border font-semibold"
              style={{ backgroundColor: s.bg, borderColor: s.border, color: s.color, borderRadius: radii.full, fontSize: fontSizes.xs }}
            >
              {s.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
