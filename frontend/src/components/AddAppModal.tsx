import { useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { colors, fonts, fontSizes, radii, sizes } from '../tokens'

interface AddAppModalProps {
  onClose: (newId?: string) => void
  onAdd: (name: string, appStoreId: string) => Promise<string>
}

export function AddAppModal({ onClose, onAdd }: AddAppModalProps) {
  const [name, setName] = useState('')
  const [appStoreId, setAppStoreId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const newId = await onAdd(name.trim(), appStoreId.trim())
      onClose(newId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add app')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    backgroundColor: colors.input,
    border: `1px solid ${colors.borderInput}`,
    color: colors.text,
    borderRadius: radii.lg,
    fontSize: fontSizes.sm,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl border p-6"
        style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xxl, fontFamily: fonts.sans }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold" style={{ color: colors.text, fontSize: fontSizes.lg }}>Add iOS App</h2>
          <button onClick={() => onClose()} style={{ color: colors.textDim }}
            onMouseEnter={e => (e.currentTarget.style.color = colors.textMuted)}
            onMouseLeave={e => (e.currentTarget.style.color = colors.textDim)}
          >
            <X size={sizes.icon.xl} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-lg border"
              style={{ backgroundColor: colors.negativeBg, borderColor: colors.negativeBorder, color: colors.negativeText, borderRadius: radii.lg, fontSize: fontSizes.sm }}
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="add-app-name" className="block font-medium mb-1.5" style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>App Name</label>
            <input id="add-app-name" type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="e.g. Spotify" className="w-full px-3 py-2.5 outline-none"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = colors.primary)}
              onBlur={e => (e.currentTarget.style.borderColor = colors.borderInput)}
            />
          </div>

          <div>
            <label htmlFor="add-app-store-id" className="block font-medium mb-1.5" style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>App Store ID</label>
            <input id="add-app-store-id" type="text" value={appStoreId} onChange={e => setAppStoreId(e.target.value)} required
              placeholder="e.g. 324684580" className="w-full px-3 py-2.5 outline-none"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = colors.primary)}
              onBlur={e => (e.currentTarget.style.borderColor = colors.borderInput)}
            />
            <p className="mt-1.5" style={{ color: colors.textDim, fontSize: fontSizes.xs }}>
              Find it in the App Store URL: apps.apple.com/…/id<u>XXXXXXXX</u>
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => onClose()}
              className="flex-1 py-2.5 font-medium transition-colors"
              style={{ backgroundColor: colors.input, border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: radii.lg, fontSize: fontSizes.sm }}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 font-semibold text-white transition-all disabled:opacity-60"
              style={{ backgroundColor: colors.primary, borderRadius: radii.lg, fontSize: fontSizes.sm }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = colors.primaryHover }}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.primary)}
            >
              {loading ? 'Adding…' : 'Add App'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
