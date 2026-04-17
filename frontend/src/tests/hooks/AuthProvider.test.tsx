import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import { AuthProvider } from '../../hooks/AuthProvider'
import { TOKEN_KEY, USER_KEY } from '../../hooks/authContext'
import { useAuth } from '../../hooks/useAuth'

vi.mock('../../services/api', () => ({
  api: {
    login: vi.fn(),
    register: vi.fn(),
  },
}))

function AuthProbe() {
  const { user, token, loading, login, register, logout } = useAuth()

  return (
    <div>
      <p data-testid="loading">{String(loading)}</p>
      <p data-testid="email">{user?.email ?? 'none'}</p>
      <p data-testid="token">{token ?? 'none'}</p>
      <button onClick={() => void login('user@example.com', 'secret')}>Log in</button>
      <button onClick={() => void register('new@example.com', 'secret')}>Register</button>
      <button onClick={logout}>Log out</button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(api.login).mockReset()
    vi.mocked(api.register).mockReset()
  })

  it('hydrates auth state from localStorage', () => {
    localStorage.setItem(TOKEN_KEY, 'stored-token')
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 'user-1', email: 'stored@example.com' }))

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('false')
    expect(screen.getByTestId('email')).toHaveTextContent('stored@example.com')
    expect(screen.getByTestId('token')).toHaveTextContent('stored-token')
  })

  it('clears invalid stored auth data', () => {
    localStorage.setItem(TOKEN_KEY, 'stored-token')
    localStorage.setItem(USER_KEY, '{bad json')

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    expect(screen.getByTestId('email')).toHaveTextContent('none')
    expect(screen.getByTestId('token')).toHaveTextContent('none')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(USER_KEY)).toBeNull()
  })

  it('logs in and persists returned credentials', async () => {
    vi.mocked(api.login).mockResolvedValue({
      token: 'login-token',
      user: { id: 'user-1', email: 'user@example.com' },
    })

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(screen.getByTestId('email')).toHaveTextContent('user@example.com')
    })
    expect(screen.getByTestId('token')).toHaveTextContent('login-token')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('login-token')
    expect(localStorage.getItem(USER_KEY)).toBe(JSON.stringify({ id: 'user-1', email: 'user@example.com' }))
    expect(api.login).toHaveBeenCalledWith('user@example.com', 'secret')
  })

  it('registers and persists returned credentials', async () => {
    vi.mocked(api.register).mockResolvedValue({
      token: 'register-token',
      user: { id: 'user-2', email: 'new@example.com' },
    })

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByTestId('email')).toHaveTextContent('new@example.com')
    })
    expect(screen.getByTestId('token')).toHaveTextContent('register-token')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('register-token')
    expect(localStorage.getItem(USER_KEY)).toBe(JSON.stringify({ id: 'user-2', email: 'new@example.com' }))
    expect(api.register).toHaveBeenCalledWith('new@example.com', 'secret')
  })

  it('logs out and clears persisted credentials', async () => {
    localStorage.setItem(TOKEN_KEY, 'stored-token')
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 'user-1', email: 'stored@example.com' }))

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: /log out/i }))

    expect(screen.getByTestId('email')).toHaveTextContent('none')
    expect(screen.getByTestId('token')).toHaveTextContent('none')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(USER_KEY)).toBeNull()
  })
})
