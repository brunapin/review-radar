import { Activity, BarChart3, Bell, ChevronRight, Clock, RefreshCw, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StarRating } from '../components/StarRating'
import { colors, fonts, fontSizes, radii, sizes } from '../tokens'

const MOCK_REVIEWS = [
  { id: '1', author: 'Sarah K.', title: 'Changed my life', content: 'I have been using this app for 3 months and my anxiety has decreased significantly.', score: 5, version: '6.5' },
  { id: '2', author: 'Mike T.', title: 'Pretty good overall', content: 'Nice features and clean UI. Would love offline mode though.', score: 4, version: '6.4' },
  { id: '3', author: 'Alex R.', title: 'Needs improvements', content: 'App crashes sometimes on my device. Hope they fix it soon.', score: 2, version: '6.3' },
]

const scoreStyle = (score: number): React.CSSProperties => {
  if (score >= 4) return { backgroundColor: colors.positiveBg, color: colors.positiveText, borderColor: colors.positiveBorder }
  if (score === 3) return { backgroundColor: colors.neutralBg,   color: colors.neutralText,   borderColor: colors.neutralBorder }
  return               { backgroundColor: colors.negativeBg,  color: colors.negativeText,  borderColor: colors.negativeBorder }
}

const features = [
  {
    icon: <RefreshCw size={sizes.icon.feature} style={{ color: colors.primaryText }} />,
    title: 'Refresh on Demand',
    description: 'Refresh reviews whenever you want and check the latest App Store feedback on your schedule.',
  },
  {
    icon: <Clock size={sizes.icon.feature} style={{ color: colors.primaryText }} />,
    title: '48-Hour Window',
    description: 'Always see only the freshest reviews from the last 2 days, sorted newest first.',
  },
  {
    icon: <Smartphone size={sizes.icon.feature} style={{ color: colors.primaryText }} />,
    title: 'Multi-App Support',
    description: 'Monitor as many iOS apps as you need. Add any App Store ID instantly.',
  },
  {
    icon: <BarChart3 size={sizes.icon.feature} style={{ color: colors.primaryText }} />,
    title: 'Score Tracking',
    description: 'See star ratings at a glance with color-coded indicators for quick triage.',
  },
  {
    icon: <Bell size={sizes.icon.feature} style={{ color: colors.primaryText }} />,
    title: 'Persistent Storage',
    description: 'Your apps and reviews stay saved between sessions, ready when you come back.',
  },
  {
    icon: <Activity size={sizes.icon.feature} style={{ color: colors.primaryText }} />,
    title: 'Review Details',
    description: 'Author, score, version, and timestamp for every review in one place.',
  },
]

const steps = [
  { num: '01', title: 'Create an account', desc: 'Sign up with your email in seconds.' },
  { num: '02', title: 'Add an iOS app', desc: 'Paste any App Store ID to start monitoring.' },
  { num: '03', title: 'Refresh anytime', desc: 'Open the dashboard and fetch the latest reviews when you need them.' },
]

export function Landing() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg, fontFamily: fonts.sans }}>
      {/* Hero */}
      <section className="pt-24 pb-20 px-6 text-center max-w-5xl mx-auto">
        <div
          className="inline-flex items-center gap-2 font-semibold px-3 py-1.5 rounded-full border mb-6"
          style={{ backgroundColor: colors.primaryBg, borderColor: colors.primaryBorder, color: colors.primaryText, fontSize: fontSizes.xs }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: colors.primaryText }} />
          On-demand review monitoring
        </div>

        <h1 className="font-bold mb-6" style={{ color: colors.text, fontSize: fontSizes['5xl'] }}>
          Monitor iOS Reviews{' '}
          <span
            className="block"
            style={{
              background: `linear-gradient(135deg, ${colors.primaryText}, ${colors.primary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            on Your Schedule
          </span>
        </h1>

        <p className="max-w-2xl mx-auto mb-10" style={{ color: colors.textMuted, fontSize: fontSizes.lg }}>
          Track what customers are saying about your iOS apps. Refresh App Store reviews whenever
          you need the latest customer feedback.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 font-semibold text-white transition-all hover:scale-105"
            style={{ backgroundColor: colors.primary, borderRadius: radii.xl, fontSize: fontSizes.base }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.primaryHover)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.primary)}
          >
            Get Started Free
            <ChevronRight size={sizes.icon.lg} />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 font-semibold transition-all"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: radii.xl, fontSize: fontSizes.base }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = colors.primaryBorderActive)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = colors.border)}
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Mock review cards */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-4">
          {MOCK_REVIEWS.map(r => (
            <div
              key={r.id}
              className="rounded-xl border p-4"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium" style={{ color: colors.text, fontSize: fontSizes.sm }}>{r.author}</span>
                <span
                  className="font-semibold px-2 py-0.5 rounded-full border"
                  style={{ ...scoreStyle(r.score), fontSize: fontSizes.xs }}
                >
                  {r.score}/5
                </span>
              </div>
              <StarRating score={r.score} size={sizes.rating.sm} />
              <p className="font-semibold mt-2 mb-1" style={{ color: colors.text, fontSize: fontSizes.xs }}>{r.title}</p>
              <p className="leading-relaxed" style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{r.content}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-bold mb-3" style={{ color: colors.text, fontSize: fontSizes['3xl'] }}>Everything you need</h2>
          <p style={{ color: colors.textMuted, fontSize: fontSizes.base }}>A focused tool that does exactly what it says.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(f => (
            <div
              key={f.title}
              className="rounded-xl border p-5"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: colors.primaryBg }}
              >
                {f.icon}
              </div>
              <h3 className="font-semibold mb-1.5" style={{ color: colors.text, fontSize: fontSizes.base }}>{f.title}</h3>
              <p className="leading-relaxed" style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-bold mb-3" style={{ color: colors.text, fontSize: fontSizes['3xl'] }}>Up and running in 60 seconds</h2>
          <p style={{ color: colors.textMuted, fontSize: fontSizes.base }}>No config. No SDK. Just your App Store ID.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {steps.map(s => (
            <div key={s.num} className="text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold mx-auto mb-4"
                style={{ backgroundColor: colors.primaryBgHover, color: colors.primaryText, fontSize: fontSizes.lg }}
              >
                {s.num}
              </div>
              <h3 className="font-semibold mb-2" style={{ color: colors.text, fontSize: fontSizes.base }}>{s.title}</h3>
              <p style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        className="mx-6 mb-24 rounded-2xl border p-12 text-center max-w-5xl mx-auto"
        style={{
          background: `linear-gradient(135deg, ${colors.primaryBgHover}, transparent)`,
          borderColor: colors.primaryBorder,
        }}
      >
        <h2 className="font-bold mb-3" style={{ color: colors.text, fontSize: fontSizes['3xl'] }}>Start monitoring now</h2>
        <p className="mb-8" style={{ color: colors.textMuted, fontSize: fontSizes.base }}>
          Free to use. Add any App Store ID to get started.
        </p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-8 py-3 font-semibold text-white transition-all hover:scale-105"
          style={{ backgroundColor: colors.primary, borderRadius: radii.xl, fontSize: fontSizes.base }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.primaryHover)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.primary)}
        >
          Create free account
          <ChevronRight size={sizes.icon.lg} />
        </Link>
      </section>

      {/* Footer */}
      <footer
        className="border-t py-8 text-center"
        style={{ borderColor: colors.border, color: colors.textDim, fontSize: fontSizes.sm }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Activity size={sizes.icon.lg} style={{ color: colors.primary }} />
          <span className="font-semibold" style={{ color: colors.textMuted, fontSize: fontSizes.base }}>ReviewRadar</span>
        </div>
        <p>Built for iOS app teams who care about what users think.</p>
      </footer>
    </div>
  )
}
