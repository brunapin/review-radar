import type { App, AuthResponse, Review } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

async function parseResponseBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return undefined

  try {
    return JSON.parse(text)
  } catch {
    if (!res.ok) return { error: text }
    throw new Error('The server returned an invalid JSON response')
  }
}

function getErrorMessage(data: unknown) {
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    return data.error
  }
  return 'Request failed'
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  } catch {
    throw new Error(
      'We were unable to connect to the server. Please check if the backend is running on http://localhost:8080',
    )
  }

  const data = await parseResponseBody(res)

  if (!res.ok) {
    throw new Error(getErrorMessage(data))
  }
  return data as T
}

export const api = {
  register: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getApps: (token: string) => request<App[]>('/api/apps', {}, token),

  addApp: (token: string, name: string, appStoreId: string) =>
    request<App>('/api/apps', {
      method: 'POST',
      body: JSON.stringify({ name, appStoreId }),
    }, token),

  deleteApp: (token: string, appStoreId: string) =>
    request<void>(`/api/apps/${appStoreId}`, { method: 'DELETE' }, token),

  getReviews: (token: string, appStoreId: string) =>
    request<Review[]>(`/api/apps/${appStoreId}/reviews`, {}, token),
}
