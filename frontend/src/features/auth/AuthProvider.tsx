import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  createUserWithEmailAndPassword, GoogleAuthProvider, linkWithPopup, onIdTokenChanged,
  reload, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword,
  signInWithPopup, signOut as firebaseSignOut, type User, getAdditionalUserInfo,
} from 'firebase/auth'
import { configureFirebaseAuth } from '../../lib/firebase'
import { parseSession, type BackendSession } from '../../lib/backendTypes'
import { ApiError, createApiClient } from '../../lib/http'
import { friendlyAuthError, SessionRequests } from './session'
import { AuthContext, type AuthContextValue } from './authContext'

function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [firebase] = useState(configureFirebaseAuth)
  const auth = firebase.auth
  const [connection] = useState(() => {
    try {
      return { api: createApiClient({
        baseUrl: import.meta.env.VITE_API_URL,
        browserOrigin: window.location.origin,
        development: import.meta.env.DEV,
        getSessionKey: () => auth?.currentUser?.uid ?? null,
        getIdToken: async (force) => auth?.currentUser?.getIdToken(force) ?? null,
      }), error: null }
    } catch (error) {
      return { api: null, error: friendlyAuthError(error) }
    }
  })
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<BackendSession | null>(null)
  const [initialized, setInitialized] = useState(!auth)
  const [loading, setLoading] = useState(Boolean(auth))
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const requests = useRef(new SessionRequests())
  const lastUid = useRef<string | null>(null)
  const inFlight = useRef(false)
  const refreshing = useRef(false)

  const clearPrivateState = useCallback(() => {
    requests.current.cancel()
    inFlight.current = false
    void queryClient.cancelQueries()
    queryClient.clear()
    setSession(null)
    setSessionError(null)
    setVerificationError(null)
  }, [queryClient])

  const bootstrap = useCallback(async (current: User) => {
    const ticket = requests.current.begin(current.uid)
    inFlight.current = true
    setLoading(true)
    setSession(null)
    setSessionError(null)
    try {
      if (!connection.api) throw new ApiError('INVALID_API_URL')
      const response = await connection.api.request<unknown>('/auth/bootstrap', { method: 'POST', signal: ticket.signal })
      const resolved = parseSession(response)
      if (requests.current.isCurrent(ticket, auth?.currentUser?.uid ?? null)) setSession(resolved)
    } catch (error) {
      if (requests.current.isCurrent(ticket, auth?.currentUser?.uid ?? null)) setSessionError(friendlyAuthError(error))
    } finally {
      if (requests.current.isCurrent(ticket, auth?.currentUser?.uid ?? null)) {
        inFlight.current = false
        setLoading(false)
      }
    }
  }, [auth, connection.api])

  useEffect(() => {
    if (!auth) return
    const sessionRequests = requests.current
    const unsubscribe = onIdTokenChanged(auth, (current) => {
      const changed = current?.uid !== lastUid.current
      if (changed) clearPrivateState()
      lastUid.current = current?.uid ?? null
      setUser(current)
      setInitialized(true)
      if (!current) {
        clearPrivateState()
        setLoading(false)
        return
      }
      // A forced refresh inside a 401 retry also emits this event. Do not restart
      // the same bootstrap and create a retry loop while that request is running.
      if (!changed && (inFlight.current || refreshing.current)) return
      void bootstrap(current)
    }, () => {
      clearPrivateState()
      setUser(null)
      setInitialized(true)
      setLoading(false)
      setSessionError('No se pudo recuperar tu sesión. Vuelve a iniciar sesión.')
    })
    return () => {
      unsubscribe()
      sessionRequests.cancel()
      inFlight.current = false
    }
  }, [auth, bootstrap, clearPrivateState])

  const requireFirebase = () => {
    if (!auth) throw new ApiError('SERVICE_UNAVAILABLE')
    return auth
  }
  const requireUser = () => {
    const current = requireFirebase().currentUser
    if (!current) throw new ApiError('AUTH_REQUIRED', 401)
    return current
  }
  const refresh = async () => {
    const current = requireUser()
    refreshing.current = true
    try {
      await reload(current)
      await current.getIdToken(true)
      if (auth?.currentUser?.uid !== current.uid) throw new ApiError('SESSION_CHANGED')
      setUser(current)
      await bootstrap(current)
    } finally {
      refreshing.current = false
    }
  }
  const sendVerification = async (current = requireUser()) => {
    setVerificationError(null)
    try {
      await sendEmailVerification(current)
    } catch (error) {
      if (auth?.currentUser?.uid === current.uid) setVerificationError(friendlyAuthError(error))
      throw error
    }
  }

  const value: AuthContextValue = {
    user, session, initialized, loading, api: connection.api,
    configurationError: firebase.error ?? connection.error, sessionError, verificationError,
    signIn: async (email, password) => { await signInWithEmailAndPassword(requireFirebase(), email.trim(), password) },
    signUp: async (email, password) => {
      const result = await createUserWithEmailAndPassword(requireFirebase(), email.trim(), password)
      await sendVerification(result.user)
      return { isNewUser: true }
    },
    signInGoogle: async () => { 
      const result = await signInWithPopup(requireFirebase(), googleProvider())
      const additional = getAdditionalUserInfo(result)
      return { isNewUser: additional?.isNewUser ?? false }
    },
    signOut: async () => {
      clearPrivateState()
      await firebaseSignOut(requireFirebase())
      setUser(null)
      setLoading(false)
    },
    linkGoogle: async () => {
      const current = requireUser()
      await linkWithPopup(current, googleProvider())
      if (auth?.currentUser?.uid !== current.uid) throw new ApiError('SESSION_CHANGED')
      await refresh()
    },
    sendVerification: async () => { await sendVerification() },
    resetPassword: async (email) => {
      try {
        await sendPasswordResetEmail(requireFirebase(), email.trim())
      } catch (error) {
        // Preserve the neutral recovery result even when enumeration protection
        // is not yet enabled in the Firebase project.
        if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'auth/user-not-found')) throw error
      }
    },
    refresh,
    retrySession: async () => { await bootstrap(requireUser()) },
    getIdToken: async (force = false) => auth?.currentUser?.getIdToken(force) ?? null,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
