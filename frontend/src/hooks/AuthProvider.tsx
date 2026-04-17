import { useState, type ReactNode } from 'react'
import { api } from '../services/api'
import type { User } from '../types'
import { AuthContext, TOKEN_KEY, USER_KEY } from './authContext'

interface AuthState {
  user: User | null
  token: string | null
}

function readStoredAuth(): AuthState {
  const storedToken = localStorage.getItem(TOKEN_KEY)
  const storedUser = localStorage.getItem(USER_KEY)

  if (!storedToken || !storedUser) {
    return { user: null, token: null }
  }

  try {
    return { user: JSON.parse(storedUser), token: storedToken }
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    return { user: null, token: null }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ user, token }, setAuth] = useState<AuthState>(readStoredAuth)
  const loading = false

  const persist = (nextToken: string, nextUser: User) => {
    localStorage.setItem(TOKEN_KEY, nextToken)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setAuth({ user: nextUser, token: nextToken })
  }

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password)
    persist(res.token, res.user)
  }

  const register = async (email: string, password: string) => {
    const res = await api.register(email, password)
    persist(res.token, res.user)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setAuth({ user: null, token: null })
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
