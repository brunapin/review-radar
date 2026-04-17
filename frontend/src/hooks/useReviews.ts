import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { api } from '../services/api'
import type { App, Review } from '../types'

export function useApps(token: string | null) {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchApps = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getApps(token)
      setApps(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load apps')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchApps() }, [fetchApps])

  const addApp = async (name: string, appStoreId: string): Promise<string> => {
    if (!token) throw new Error('Not authenticated')
    const app = await api.addApp(token, name, appStoreId)
    await fetchApps()
    return app.appStoreId
  }

  const removeApp = async (appStoreId: string) => {
    if (!token) return
    await api.deleteApp(token, appStoreId)
    setApps(prev => prev.filter(a => a.appStoreId !== appStoreId))
  }

  return { apps, loading, error, refetch: fetchApps, addApp, removeApp }
}

export function useReviews(token: string | null, appStoreId: string | null) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReviews = useCallback(async () => {
    if (!token || !appStoreId) return []
    setLoading(true)
    setError(null)
    try {
      const data = await api.getReviews(token, appStoreId)
      setReviews(data)
      return data
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reviews')
      return []
    } finally {
      setLoading(false)
    }
  }, [token, appStoreId])

  useLayoutEffect(() => {
    if (token && appStoreId) {
      setLoading(true)
      setReviews([])
      setError(null)
    }
  }, [token, appStoreId])

  const silentRefetch = useCallback(async () => {
    if (!token || !appStoreId) return []
    try {
      const data = await api.getReviews(token, appStoreId)
      setReviews(data)
      return data
    } catch {
      return []
      // silently ignore — keeps current reviews visible
    }
  }, [token, appStoreId])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  return { reviews, loading, error, refetch: fetchReviews, silentRefetch }
}
