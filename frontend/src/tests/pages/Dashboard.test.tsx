import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { App, Review } from '../../types'
import { Dashboard } from '../../pages/Dashboard'
import { useAuth } from '../../hooks/useAuth'
import { useApps, useReviews } from '../../hooks/useReviews'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../hooks/useReviews', () => ({
  useApps: vi.fn(),
  useReviews: vi.fn(),
}))

const apps: App[] = [
  {
    id: 'app-1',
    name: 'ReviewRadar iOS',
    appStoreId: '123',
    createdAt: '2026-04-17T10:00:00Z',
  },
]

const newApp: App = {
  id: 'app-2',
  name: 'Instagram',
  appStoreId: '456',
  createdAt: '2026-04-17T10:05:00Z',
}

const reviews: Review[] = [
  {
    id: 'review-1',
    appStoreId: '123',
    author: 'Ana',
    title: 'Love it',
    content: 'The dashboard is quick and useful.',
    score: 5,
    version: '2.0',
    updatedAt: '2026-04-17T09:00:00Z',
    fetchedAt: '2026-04-17T10:00:00Z',
  },
  {
    id: 'review-2',
    appStoreId: '123',
    author: 'Bruno',
    title: 'Okay',
    content: 'It works, but could be smoother.',
    score: 3,
    version: '2.0',
    updatedAt: '2026-04-17T08:00:00Z',
    fetchedAt: '2026-04-17T10:00:00Z',
  },
  {
    id: 'review-3',
    appStoreId: '123',
    author: 'Carla',
    title: 'Bad',
    content: 'Notifications are late.',
    score: 1,
    version: '1.9',
    updatedAt: '2026-04-17T07:00:00Z',
    fetchedAt: '2026-04-17T10:00:00Z',
  },
]

type AddAppFn = (name: string, appStoreId: string) => Promise<string>
type RemoveAppFn = (appStoreId: string) => Promise<void>
type AsyncVoidFn = () => Promise<void>
type AsyncReviewsFn = () => Promise<Review[]>

function renderDashboard({
  appList = apps,
  reviewList = reviews,
  appsLoading = false,
  reviewsLoading = false,
  appsError = null,
  reviewsError = null,
  addApp = vi.fn<AddAppFn>().mockResolvedValue('456'),
  removeApp = vi.fn<RemoveAppFn>().mockResolvedValue(undefined),
  refetch = vi.fn<AsyncReviewsFn>().mockResolvedValue(reviewList),
  silentRefetch = vi.fn<AsyncReviewsFn>().mockResolvedValue(reviewList),
}: {
  appList?: App[]
  reviewList?: Review[]
  appsLoading?: boolean
  reviewsLoading?: boolean
  appsError?: string | null
  reviewsError?: string | null
  addApp?: AddAppFn
  removeApp?: RemoveAppFn
  refetch?: AsyncReviewsFn
  silentRefetch?: AsyncReviewsFn
} = {}) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'user-1', email: 'user@example.com' },
    token: 'token-1',
    loading: false,
    login: vi.fn<(email: string, password: string) => Promise<void>>().mockResolvedValue(undefined),
    register: vi.fn<(email: string, password: string) => Promise<void>>().mockResolvedValue(undefined),
    logout: vi.fn<() => void>(),
  })

  vi.mocked(useApps).mockReturnValue({
    apps: appList,
    loading: appsLoading,
    error: appsError,
    refetch: vi.fn<AsyncVoidFn>().mockResolvedValue(undefined),
    addApp,
    removeApp,
  })

  vi.mocked(useReviews).mockReturnValue({
    reviews: reviewList,
    loading: reviewsLoading,
    error: reviewsError,
    refetch,
    silentRefetch,
  })

  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )

  return { addApp, removeApp, refetch, silentRefetch }
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders review KPIs and the review list', () => {
    renderDashboard()

    expect(screen.getByRole('heading', { name: /review dashboard - apple store/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('123')
    expect(screen.getByText('3 ★')).toBeInTheDocument()
    expect(screen.getByText('Total Reviews')).toBeInTheDocument()
    expect(screen.getByText('Love it')).toBeInTheDocument()
    expect(screen.getByText('Okay')).toBeInTheDocument()
    expect(screen.getByText('Bad')).toBeInTheDocument()
  })

  it('filters reviews when a KPI sentiment card is clicked', async () => {
    renderDashboard()

    await userEvent.click(screen.getByRole('button', { name: /positive rate/i }))

    expect(screen.getByText('Love it')).toBeInTheDocument()
    expect(screen.queryByText('Okay')).not.toBeInTheDocument()
    expect(screen.queryByText('Bad')).not.toBeInTheDocument()
  })

  it('opens the add app modal from the empty app state', async () => {
    renderDashboard({ appList: [], reviewList: [] })

    expect(screen.getByText('No apps added yet.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /\+ add your first app/i }))

    expect(screen.getByRole('heading', { name: /add ios app/i })).toBeInTheDocument()
  })

  it('submits a new app through the add app modal', async () => {
    const addApp = vi.fn<AddAppFn>().mockResolvedValue('456')
    renderDashboard({ appList: [], reviewList: [], addApp })

    await userEvent.click(screen.getByRole('button', { name: /\+ add your first app/i }))
    await userEvent.type(screen.getByLabelText(/app name/i), 'New App')
    await userEvent.type(screen.getByLabelText(/app store id/i), '456')
    await userEvent.click(screen.getAllByRole('button', { name: /^add app$/i })[1])

    await waitFor(() => {
      expect(addApp).toHaveBeenCalledWith('New App', '456')
    })
  })

  it('shows a loading state while a newly added app is fetching reviews', async () => {
    const addApp = vi.fn<AddAppFn>().mockResolvedValue('456')
    renderDashboard({ appList: [...apps, newApp], reviewList: [], addApp })

    await userEvent.click(screen.getByRole('button', { name: /^add app$/i }))
    await userEvent.type(screen.getByLabelText(/app name/i), 'Instagram')
    await userEvent.type(screen.getByLabelText(/app store id/i), '456')
    await userEvent.click(screen.getAllByRole('button', { name: /^add app$/i })[1])

    await waitFor(() => {
      expect(addApp).toHaveBeenCalledWith('Instagram', '456')
    })

    expect(screen.getByRole('combobox')).toHaveValue('456')
    expect(screen.getByText(/loading reviews/i)).toBeInTheDocument()
    expect(screen.queryByText(/no reviews found/i)).not.toBeInTheDocument()
  })

  it('calls refetch when the refresh button is clicked', async () => {
    const refetch = vi.fn<AsyncReviewsFn>().mockResolvedValue(reviews)
    renderDashboard({ refetch })

    await userEvent.click(screen.getByTitle('Refresh reviews'))

    expect(refetch).toHaveBeenCalled()
  })
})
