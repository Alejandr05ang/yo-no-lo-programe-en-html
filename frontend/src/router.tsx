import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Entrada } from './features/entrada/Entrada'
import { Inicio } from './features/entrada/Inicio'
import { VistaEstudiante } from './features/estudiante/VistaEstudiante'
import { Bitacora } from './features/instructor/Bitacora'
import { Mapa } from './features/mapa/Mapa'

// Rutas de la plataforma. Falta: portafolio público (1g), retos platino.
// /bitacora (dashboard del instructor, 1d) es exclusiva de instructores; sin control de rol
// todavía — en producción va detrás de un rol `instructor`.
//
// Flujo de entrada: / → /inicio (página de entrada, según estado lleva a /entrar o /portafolio).
// /entrar (1f, diagnóstico) solo se ve una vez.
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/inicio" replace /> },
  { path: '/inicio', element: <Inicio /> },
  { path: '/entrar', element: <Entrada /> },
  { path: '/portafolio', element: <VistaEstudiante /> },
  { path: '/mapa', element: <Mapa /> },
  { path: '/bitacora', element: <Bitacora /> },
  { path: '*', element: <Navigate to="/inicio" replace /> },
])
