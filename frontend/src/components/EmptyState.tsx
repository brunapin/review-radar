import { MessageSquare } from 'lucide-react'
import { colors, fonts, fontSizes, sizes } from '../tokens'

interface EmptyStateProps {
  appName: string
  filtered: boolean
}

export function EmptyState({ appName, filtered }: EmptyStateProps) {
  return (
    <div className="text-center py-20" style={{ fontFamily: fonts.sans }}>
      <MessageSquare size={sizes.icon.empty} className="mx-auto mb-4" style={{ color: colors.textDim }} />
      <h3 className="font-semibold mb-2" style={{ color: colors.text, fontSize: fontSizes.lg }}>No reviews found</h3>
      <p className="max-w-xs mx-auto" style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
        {filtered
          ? 'No reviews match the selected filter.'
          : <>No reviews for <span style={{ color: colors.text, fontWeight: 600 }}>{appName}</span> in the last 48 hours.</>
        }
      </p>
    </div>
  )
}
