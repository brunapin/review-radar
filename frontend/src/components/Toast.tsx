import { useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { colors, fonts, fontSizes, radii, sizes } from '../tokens'

interface ToastProps {
  message: string
  onDismiss: () => void
}

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg"
      style={{ backgroundColor: colors.surface, borderColor: colors.positiveBorder, borderRadius: radii.xl, fontFamily: fonts.sans }}
    >
      <CheckCircle2 size={sizes.icon.xl} style={{ color: colors.positiveText, flexShrink: 0 }} />
      <span style={{ color: colors.text, fontSize: fontSizes.sm }}>{message}</span>
      <button
        onClick={onDismiss}
        className="ml-1 transition-colors"
        style={{ color: colors.textDim }}
        onMouseEnter={e => (e.currentTarget.style.color = colors.textMuted)}
        onMouseLeave={e => (e.currentTarget.style.color = colors.textDim)}
      >
        <X size={sizes.icon.sm} />
      </button>
    </div>
  )
}
