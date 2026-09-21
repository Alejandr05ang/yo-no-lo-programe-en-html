import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import type { BackendSession } from '../../lib/backendTypes'
import type { ApiClient } from '../../lib/http'

export interface AuthContextValue {
  user: User | null
  session: BackendSession | null
  initialized: boolean
  loading: boolean
  configurationError: string | null
  sessionError: string | null
  verificationError: string | null
  api: ApiClient | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInGoogle: () => Promise<void>
  signOut: () => Promise<void>
  linkGoogle: () => Promise<void>
  sendVerification: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refresh: () => Promise<void>
  retrySession: () => Promise<void>
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is required')
  return context
}
