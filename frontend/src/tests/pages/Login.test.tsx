import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../hooks/authContext'
import type { AuthContextValue } from '../../hooks/authContext'
import { Login } from '../../pages/Login'

function renderLogin(overrides: Partial<AuthContextValue> = {}) {
  const auth: AuthContextValue = {
    user: null,
    token: null,
    loading: false,
    login: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    ...overrides,
  }

  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </AuthContext.Provider>,
  )

  return auth
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates required email before submitting', async () => {
    const auth = renderLogin()

    await userEvent.type(screen.getByLabelText(/password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('submits credentials through the auth context', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    renderLogin({ login })

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('user@example.com', 'secret')
    })
  })

  it('renders auth errors returned by the context', async () => {
    const login = vi.fn().mockRejectedValue(new Error('invalid email or password'))
    renderLogin({ login })

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('invalid email or password')).toBeInTheDocument()
  })
})
