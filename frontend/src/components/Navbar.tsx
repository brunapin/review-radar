import { Activity, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { colors, fonts, fontSizes, radii, sizes } from '../tokens'
import { useAuth } from '../hooks/useAuth'

export function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header
      className="border-b sticky top-0 z-50"
      style={{
        backgroundColor: 'rgba(10,10,15,0.85)',
        borderColor: colors.border,
        backdropFilter: 'blur(12px)',
        fontFamily: fonts.sans,
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 font-bold transition-colors"
          style={{ color: colors.text, fontSize: fontSizes.base }}
        >
          <Activity size={sizes.icon.logo} style={{ color: colors.primaryText }} />
          <span>ReviewRadar</span>
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="font-medium transition-colors"
                style={{ color: colors.textMuted, fontSize: fontSizes.sm }}
              >
                Dashboard
              </Link>
              <span className="hidden sm:block" style={{ color: colors.textDim, fontSize: fontSizes.xs }}>
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 transition-colors"
                style={{ color: colors.textMuted, fontSize: fontSizes.sm }}
                onMouseEnter={e => (e.currentTarget.style.color = colors.negativeText)}
                onMouseLeave={e => (e.currentTarget.style.color = colors.textMuted)}
              >
                <LogOut size={sizes.icon.md} />
                <span className="hidden sm:block">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="font-medium transition-colors"
                style={{ color: colors.textMuted, fontSize: fontSizes.sm }}
                onMouseEnter={e => (e.currentTarget.style.color = colors.text)}
                onMouseLeave={e => (e.currentTarget.style.color = colors.textMuted)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="font-semibold px-4 py-1.5 text-white transition-colors"
                style={{ backgroundColor: colors.primary, borderRadius: radii.lg, fontSize: fontSizes.sm }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.primaryHover)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.primary)}
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
