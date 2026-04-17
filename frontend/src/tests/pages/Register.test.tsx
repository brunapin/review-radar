import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../hooks/authContext'
import type { AuthContextValue } from '../../hooks/authContext'
import { Register } from '../../pages/Register'

function renderRegister(overrides: Partial<AuthContextValue> = {}) {
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
        <Register />
      </MemoryRouter>
    </AuthContext.Provider>,
  )

  return auth
}

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates required email before submitting', async () => {
    const auth = renderRegister()

    await userEvent.type(screen.getByLabelText(/^password$/i), 'secret')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(auth.register).not.toHaveBeenCalled()
  })

  it('validates matching passwords before submitting', async () => {
    const auth = renderRegister()

    await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'secret1')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'secret2')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    expect(auth.register).not.toHaveBeenCalled()
  })

  it('validates minimum password length before submitting', async () => {
    const auth = renderRegister()

    await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'short')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'short')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument()
    expect(auth.register).not.toHaveBeenCalled()
  })

  it('submits credentials through the auth context', async () => {
    const register = vi.fn().mockResolvedValue(undefined)
    renderRegister({ register })

    await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'secret')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith('new@example.com', 'secret')
    })
  })

  it('renders auth errors returned by the context', async () => {
    const register = vi.fn().mockRejectedValue(new Error('email already registered'))
    renderRegister({ register })

    await userEvent.type(screen.getByLabelText(/email/i), 'taken@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'secret')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('email already registered')).toBeInTheDocument()
  })
})
