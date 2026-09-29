import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Role } from '../../lib/backendTypes'
import { useAuth } from './authContext'
import { AccountPage, ForbiddenPage, LoadingPage } from './AuthPages'
import { accessDecision, destinoCompartido, onboardingPath } from './session'

export function RequireAuth() {
  const { initialized, user } = useAuth()
  const location = useLocation()
  const destination = destinoCompartido(location.pathname)
  switch (accessDecision(initialized, user)) {
    case 'pending': return <LoadingPage />
    case 'granted': return <Outlet />
    default: return <Navigate to={destination ? `/login?next=${encodeURIComponent(destination)}` : '/login'} replace />
  }
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const { loading, session } = useAuth()
  if (loading) return <LoadingPage />
  if (!session) return <AccountPage />
  return roles.includes(session.user.role) ? <Outlet /> : <ForbiddenPage />
}

export function RequireOnboarding() {
  const { loading, session } = useAuth()
  if (loading) return <LoadingPage />
  if (!session) return <AccountPage />
  return session.onboarding.state === 'READY' ? <Outlet /> : <Navigate to={onboardingPath(session.onboarding.state)} replace />
}
