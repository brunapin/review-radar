import { createContext } from 'react'
import type { User } from '../types'

export interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const TOKEN_KEY = 'auth_token'
export const USER_KEY = 'auth_user'

export const AuthContext = createContext<AuthContextValue | null>(null)
