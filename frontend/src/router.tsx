import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { AccountPage, AuthPage, PreparationPage, RecoveryPage, RouteErrorPage, VerificationPage } from './features/auth/AuthPages'
import { RequireAuth, RequireOnboarding, RequireRole } from './features/auth/guards'
import { FixtureLayout } from './features/auth/FixtureLayout'
import { MapaReal } from './features/mapa/MapaReal'

const applicationRoutes: RouteObject[] = [
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <AuthPage key="login" /> },
  { path: '/registro', element: <AuthPage key="registro" register /> },
  { path: '/recuperar', element: <RecoveryPage /> },
  { element: <RequireAuth />, children: [
    { path: '/verificar-email', element: <VerificationPage /> },
    { path: '/cuenta', element: <AccountPage /> },
    { path: '/onboarding/perfil', element: <AccountPage stage="profile" /> },
    { path: '/onboarding/clase', element: <AccountPage stage="class" /> },
    { path: '/inicio', element: <Navigate to="/cuenta" replace /> },
    { path: '/entrar', element: <Navigate to="/cuenta" replace /> },
    { element: <RequireRole roles={['admin']} />, children: [
      { path: '/admin', lazy: async () => ({ Component: (await import('./features/admin/AdminDashboard')).AdminDashboard }) },
    ] },
    { element: <RequireRole roles={['instructor', 'admin']} />, children: [
      { path: '/instructor', lazy: async () => ({ Component: (await import('./features/instructor/InstructorDashboard')).InstructorDashboard }) },
      { path: '/bitacora', element: <Navigate to="/instructor" replace /> },
    ] },
    { element: <RequireOnboarding />, children: [
      { path: '/mapa', element: <MapaReal /> },
      { path: '/portafolio', lazy: async () => ({ Component: (await import('./features/estudiante/VistaEstudiante')).VistaEstudiante }) },
    ] },
  ] },
  { path: '*', element: <Navigate to="/login" replace /> },
]

// Vite removes this branch and its dynamic imports from production builds.
// The local curriculum and local grader must never become a production fallback.
const routes: RouteObject[] = import.meta.env.DEV && import.meta.env.VITE_ENABLE_LOCAL_EXERCISES === 'true'
  ? [{ element: <FixtureLayout />, children: [
    { path: '/', element: <Navigate to="/inicio" replace /> },
    { path: '/inicio', lazy: async () => ({ Component: (await import('./features/entrada/Inicio')).Inicio }) },
    { path: '/entrar', lazy: async () => ({ Component: (await import('./features/entrada/Entrada')).Entrada }) },
    { path: '/portafolio', lazy: async () => ({ Component: (await import('./features/estudiante/VistaEstudiante')).VistaEstudiante }) },
    { path: '/mapa', lazy: async () => ({ Component: (await import('./features/mapa/Mapa')).Mapa }) },
    { path: '/bitacora', lazy: async () => ({ Component: (await import('./features/instructor/Bitacora')).Bitacora }) },
    { path: '*', element: <Navigate to="/inicio" replace /> },
  ] }]
  : applicationRoutes

export const router = createBrowserRouter([{ errorElement: <RouteErrorPage />, children: routes }])
