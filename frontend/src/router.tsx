import { createBrowserRouter, Navigate } from 'react-router-dom'
import { VistaEstudiante } from './features/estudiante/VistaEstudiante'

// Rutas de la plataforma. Por ahora solo la vista principal del estudiante (pantalla 1a
// del handoff). El resto — mapa (1e), dashboard del instructor (1d), onboarding (1f),
// portafolio público (1g) — se irá agregando aquí.
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/portafolio" replace /> },
  { path: '/portafolio', element: <VistaEstudiante /> },
  { path: '*', element: <Navigate to="/portafolio" replace /> },
])
