import { Activity, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { colors, fonts, fontSizes, radii, sizes } from '../tokens'
import { useAuth } from '../hooks/useAuth'

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim())        { setError('Email is required'); return }
    if (!password)            { setError('Password is required'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await register(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
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
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ backgroundColor: colors.bg, fontFamily: fonts.sans }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-bold" style={{ color: colors.text, fontSize: fontSizes.xl }}>
            <Activity size={sizes.icon.brand} style={{ color: colors.primaryText }} />
            ReviewRadar
          </Link>
          <h1 className="font-bold mt-6 mb-1" style={{ color: colors.text, fontSize: fontSizes['2xl'] }}>Create account</h1>
          <p style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Start monitoring iOS reviews today</p>
        </div>

        <div className="rounded-2xl border p-8" style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xxl }}>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {error && (
              <div
                className="px-4 py-3 rounded-lg border"
                style={{ backgroundColor: colors.negativeBg, borderColor: colors.negativeBorder, color: colors.negativeText, borderRadius: radii.lg, fontSize: fontSizes.sm }}
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="register-email" className="block font-medium mb-1.5" style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Email</label>
              <div className="relative">
                <Mail size={sizes.icon.lg} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textDim }} />
                <input
                  id="register-email"
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg outline-none"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = colors.primary)}
                  onBlur={e => (e.currentTarget.style.borderColor = colors.borderInput)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-password" className="block font-medium mb-1.5" style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Password</label>
              <div className="relative">
                <Lock size={sizes.icon.lg} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textDim }} />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg outline-none"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = colors.primary)}
                  onBlur={e => (e.currentTarget.style.borderColor = colors.borderInput)}
                />
                <button
                  type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: colors.textDim }}
                  onMouseEnter={e => (e.currentTarget.style.color = colors.textMuted)}
                  onMouseLeave={e => (e.currentTarget.style.color = colors.textDim)}
                >
                  {showPassword ? <EyeOff size={sizes.icon.md} /> : <Eye size={sizes.icon.md} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="register-confirm" className="block font-medium mb-1.5" style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Confirm Password</label>
              <div className="relative">
                <Lock size={sizes.icon.lg} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textDim }} />
                <input
                  id="register-confirm"
                  type={showPassword ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg outline-none"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = colors.primary)}
                  onBlur={e => (e.currentTarget.style.borderColor = colors.borderInput)}
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: colors.primary, borderRadius: radii.lg, fontSize: fontSizes.base }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = colors.primaryHover }}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.primary)}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6" style={{ color: colors.textDim, fontSize: fontSizes.sm }}>
          Already have an account?{' '}
          <Link to="/login" className="font-medium transition-colors" style={{ color: colors.primaryText }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
