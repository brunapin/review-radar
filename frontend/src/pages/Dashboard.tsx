import { formatDistanceToNow } from 'date-fns'
import {
  MessageSquare, Minus, Plus,
  RefreshCw, Star, ThumbsDown, ThumbsUp, Trash2,
} from 'lucide-react'
import { useMemo, useState, useEffect, useRef } from 'react'
import { AddAppModal } from '../components/AddAppModal'
import { EmptyState } from '../components/EmptyState'
import { FilterBar } from '../components/FilterBar'
import type { SentimentFilter } from '../components/FilterBar'
import { KpiCard } from '../components/KpiCard'
import { Navbar } from '../components/Navbar'
import { ReviewCard } from '../components/ReviewCard'
import { Toast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { useApps, useReviews } from '../hooks/useReviews'
import { colors, fonts, fontSizes, radii, sizes } from '../tokens'
import type { Review } from '../types'

// ─── KPI computation ───────────────────────────────────────────────────────────

function computeKpis(reviews: Review[]) {
  const total = reviews.length
  if (total === 0) return { total, avg: 0, positiveRate: 0, neutralRate: 0, negativeRate: 0 }
  const sum      = reviews.reduce((acc, r) => acc + r.score, 0)
  const positive = reviews.filter(r => r.score >= 4).length
  const neutral  = reviews.filter(r => r.score === 3).length
  const negative = reviews.filter(r => r.score <= 2).length
  return {
    total,
    avg:          Math.round((sum / total) * 10) / 10,
    positiveRate: Math.round((positive / total) * 100),
    neutralRate:  Math.round((neutral  / total) * 100),
    negativeRate: Math.round((negative / total) * 100),
  }
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

const initialReviewRetryDelayMs = 1500
const initialReviewMaxAttempts = 8

export function Dashboard() {
  const { token } = useAuth()
  const { apps, loading: appsLoading, error: appsError, addApp, removeApp } = useApps(token)
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [lastRefresh, setLastRefresh]  = useState(new Date())
  const [toast, setToast]              = useState<string | null>(null)
  const [pendingReviewsAppId, setPendingReviewsAppId] = useState<string | null>(null)
  const [filterState, setFilterState]  = useState<{ appId: string | null; value: SentimentFilter }>({ appId: null, value: 'all' })

  const selectedApp = apps.find(a => a.appStoreId === (selectedId ?? apps[0]?.appStoreId))
  const activeId    = selectedApp?.appStoreId ?? null
  const filter       = filterState.appId === activeId ? filterState.value : 'all'

  const setFilter = (next: SentimentFilter | ((prev: SentimentFilter) => SentimentFilter)) => {
    setFilterState(prev => {
      const current = prev.appId === activeId ? prev.value : 'all'
      return { appId: activeId, value: typeof next === 'function' ? next(current) : next }
    })
  }

  const { reviews, loading: reviewsLoading, error: reviewsError, refetch, silentRefetch } = useReviews(token, activeId)

  // Always keep a ref to the latest callbacks so setTimeout doesn't use stale closures.
  const refetchRef = useRef(refetch)
  const silentRefetchRef = useRef(silentRefetch)
  const pendingReviewsTimeoutRef = useRef<number | null>(null)
  const activeIdRef = useRef(activeId)
  useEffect(() => { refetchRef.current = refetch }, [refetch])
  useEffect(() => { silentRefetchRef.current = silentRefetch }, [silentRefetch])
  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  useEffect(() => () => {
    if (pendingReviewsTimeoutRef.current !== null) {
      window.clearTimeout(pendingReviewsTimeoutRef.current)
    }
  }, [])

  const waitingForInitialReviews =
    pendingReviewsAppId === activeId && reviews.length === 0 && !reviewsError
  const reviewsPending = reviewsLoading || waitingForInitialReviews

  const kpis = computeKpis(reviews)

  const filteredReviews = useMemo(() => {
    if (filter === 'all')      return reviews
    if (filter === 'positive') return reviews.filter(r => r.score >= 4)
    if (filter === 'neutral')  return reviews.filter(r => r.score === 3)
    return reviews.filter(r => r.score <= 2)
  }, [reviews, filter])

  const counts: Record<SentimentFilter, number> = useMemo(() => ({
    all:      reviews.length,
    positive: reviews.filter(r => r.score >= 4).length,
    neutral:  reviews.filter(r => r.score === 3).length,
    negative: reviews.filter(r => r.score <= 2).length,
  }), [reviews])

  const handleRefresh = () => { refetch(); setLastRefresh(new Date()) }

  const clearPendingReviewsTimeout = () => {
    if (pendingReviewsTimeoutRef.current !== null) {
      window.clearTimeout(pendingReviewsTimeoutRef.current)
      pendingReviewsTimeoutRef.current = null
    }
  }

  const scheduleInitialReviewsRefetch = (appId: string, attempt = 1) => {
    clearPendingReviewsTimeout()
    pendingReviewsTimeoutRef.current = window.setTimeout(() => {
      void silentRefetchRef.current().then(data => {
        setLastRefresh(new Date())
        if (activeIdRef.current !== appId) return

        if (data.length > 0 || attempt >= initialReviewMaxAttempts) {
          setPendingReviewsAppId(null)
          pendingReviewsTimeoutRef.current = null
          return
        }

        scheduleInitialReviewsRefetch(appId, attempt + 1)
      })
    }, initialReviewRetryDelayMs)
  }

  const handleRemoveApp = async () => {
    if (!selectedApp) return
    clearPendingReviewsTimeout()
    await removeApp(selectedApp.appStoreId)
    setSelectedId(null)
    setPendingReviewsAppId(null)
  }

  const handleModalClose = (newId?: string) => {
    setShowAddModal(false)
    if (newId) {
      clearPendingReviewsTimeout()
      setSelectedId(newId)
      setFilterState({ appId: newId, value: 'all' })
      setPendingReviewsAppId(newId)
      setToast('App added successfully! Fetching reviews…')
      scheduleInitialReviewsRefetch(newId)
    }
  }

  // Clicking a KPI filter card toggles the filter
  const handleKpiFilterClick = (sentiment: SentimentFilter) => {
    setFilter(prev => prev === sentiment ? 'all' : sentiment)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg, fontFamily: fonts.sans }}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-bold" style={{ color: colors.text, fontSize: fontSizes['2xl'] }}>Review Dashboard - Apple Store</h1>
            <p className="mt-1" style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Last 48 hours · newest first</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 font-semibold text-white transition-all flex-shrink-0"
            style={{ backgroundColor: colors.primary, borderRadius: radii.lg, fontSize: fontSizes.sm }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.primaryHover)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.primary)}
          >
            <Plus size={sizes.icon.md} />
            Add App
          </button>
        </div>

        {/* App selector */}
        {appsLoading ? (
          <div className="h-10 w-64 rounded-lg animate-pulse mb-8" style={{ backgroundColor: colors.surface, borderRadius: radii.lg }} />
        ) : appsError ? (
          <p className="mb-8" style={{ color: colors.negativeText, fontSize: fontSizes.sm }}>{appsError}</p>
        ) : apps.length === 0 ? (
          <div className="text-center py-24">
            <MessageSquare size={sizes.icon.empty} className="mx-auto mb-4" style={{ color: colors.textDim }} />
            <p className="mb-4" style={{ color: colors.textMuted }}>No apps added yet.</p>
            <button onClick={() => setShowAddModal(true)}
              className="font-medium transition-colors"
              style={{ color: colors.primaryText, fontSize: fontSizes.sm }}
            >
              + Add your first app
            </button>
          </div>
        ) : (
          <>
            {/* Select + remove + refresh row */}
            <div className="flex items-center gap-3 mb-8">
              <div className="relative">
                <select
                  value={activeId ?? ''}
                  onChange={e => { setSelectedId(e.target.value); setFilter('all') }}
                  className="appearance-none pl-4 pr-9 py-2.5 font-medium outline-none cursor-pointer"
                  style={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.borderInput}`,
                    color: colors.text,
                    minWidth: '180px',
                    borderRadius: radii.lg,
                    fontSize: fontSizes.sm,
                  }}
                >
                  {apps.map(app => (
                    <option key={app.appStoreId} value={app.appStoreId}>{app.name}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                  width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4l4 4 4-4" stroke={colors.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {selectedApp && (
                <button
                  onClick={handleRemoveApp}
                  className="flex items-center gap-1.5 px-3 py-2.5 font-medium transition-all"
                  style={{ color: colors.textMuted, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, borderRadius: radii.lg, fontSize: fontSizes.xs }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = colors.negativeText
                    e.currentTarget.style.borderColor = colors.negativeBorderHover
                    e.currentTarget.style.backgroundColor = colors.negativeBgHover
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = colors.textMuted
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.backgroundColor = colors.surface
                  }}
                >
                  <Trash2 size={sizes.icon.xs} /> Remove
                </button>
              )}

              <div className="flex-1" />

              <div className="flex items-center gap-3" style={{ color: colors.textDim, fontSize: fontSizes.xs }}>
                <span>Refreshed {formatDistanceToNow(lastRefresh, { addSuffix: true })}</span>
                <button
                  onClick={handleRefresh} disabled={reviewsPending}
                  className="p-2 transition-colors disabled:opacity-50"
                  style={{ color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: radii.md }}
                  onMouseEnter={e => (e.currentTarget.style.color = colors.primaryText)}
                  onMouseLeave={e => (e.currentTarget.style.color = colors.textMuted)}
                  title="Refresh reviews"
                >
                  <RefreshCw size={sizes.icon.sm} className={reviewsPending ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* KPI cards */}
            {!reviewsPending && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                <KpiCard
                  label="Average Rating"
                  value={kpis.total > 0 ? `${kpis.avg} ★` : '—'}
                  sub={`${kpis.total} ${kpis.total === 1 ? 'review' : 'reviews'}`}
                  icon={<Star size={sizes.icon.xl} />}
                  accent="violet"
                />
                <KpiCard
                  label="Total Reviews"
                  value={kpis.total}
                  sub="last 48 hours"
                  icon={<MessageSquare size={sizes.icon.xl} />}
                  accent="violet"
                />
                <KpiCard
                  label="Positive Rate"
                  value={kpis.total > 0 ? `${kpis.positiveRate}%` : '—'}
                  sub="rated 4–5 stars"
                  icon={<ThumbsUp size={sizes.icon.xl} />}
                  accent="positive"
                  onClick={() => handleKpiFilterClick('positive')}
                  active={filter === 'positive'}
                />
                <KpiCard
                  label="Neutral Rate"
                  value={kpis.total > 0 ? `${kpis.neutralRate}%` : '—'}
                  sub="rated 3 stars"
                  icon={<Minus size={sizes.icon.xl} />}
                  accent="neutral"
                  onClick={() => handleKpiFilterClick('neutral')}
                  active={filter === 'neutral'}
                />
                <KpiCard
                  label="Negative Rate"
                  value={kpis.total > 0 ? `${kpis.negativeRate}%` : '—'}
                  sub="rated 1–2 stars"
                  icon={<ThumbsDown size={sizes.icon.xl} />}
                  accent="negative"
                  onClick={() => handleKpiFilterClick('negative')}
                  active={filter === 'negative'}
                />
              </div>
            )}

            {/* Review list */}
            {reviewsPending ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div
                  className="w-10 h-10 rounded-full animate-spin"
                  style={{
                    border: `3px solid ${colors.border}`,
                    borderTopColor: colors.primary,
                  }}
                />
                <p style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Loading reviews…</p>
              </div>
            ) : reviewsError ? (
              <p style={{ color: colors.negativeText, fontSize: fontSizes.sm }}>{reviewsError}</p>
            ) : filteredReviews.length === 0 ? (
              selectedApp && <EmptyState appName={selectedApp.name} filtered={filter !== 'all'} />
            ) : (
              <>
                <FilterBar value={filter} onChange={setFilter} counts={counts} />
                <div className="space-y-3">
                  {filteredReviews.map(review => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {showAddModal && <AddAppModal onClose={handleModalClose} onAdd={addApp} />}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
