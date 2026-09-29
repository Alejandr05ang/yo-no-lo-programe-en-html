// Harness manual: solo accesible en servidor DEV, fuera de la entrada/product build.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext, type AuthContextValue } from '../../src/features/auth/authContext'
import { createApiClient } from '../../src/lib/http'
import type { BackendSession } from '../../src/lib/backendTypes'
import { MiSitioPage } from '../../src/features/publicacion/MiSitioPage'
import { GaleriaPage } from '../../src/features/publicacion/GaleriaPage'
import { SitioPublicadoPage } from '../../src/features/publicacion/SitioPublicadoPage'
import { SesionPage } from '../../src/features/mapa/SesionPage'
import { MapaReal } from '../../src/features/mapa/MapaReal'
import { VistaEstudiante } from '../../src/features/estudiante/VistaEstudiante'
import '../../src/styles/design-system.css'
import '../../src/index.css'

if (!import.meta.env.DEV || !['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('Solo QA local')
const api = createApiClient({ baseUrl: 'http://127.0.0.1:8765/api', browserOrigin: location.origin,
  development: true, getSessionKey: () => 'stu', getIdToken: async () => 'alumno' })
const session = await api.request<BackendSession>('/auth/bootstrap', { method: 'POST' })
const noop = async () => {}
const auth: AuthContextValue = {
  user: { uid: 'stu', emailVerified: true } as AuthContextValue['user'], session, api,
  initialized: true, loading: false, configurationError: null, sessionError: null, verificationError: null,
  refresh: noop, retrySession: noop, signIn: noop, signOut: noop, linkGoogle: noop, sendVerification: noop,
  resetPassword: noop, getIdToken: async () => 'alumno', signUp: async () => ({ isNewUser: false }), signInGoogle: async () => ({ isNewUser: false }),
}
createRoot(document.getElementById('root')!).render(<AuthContext.Provider value={auth}>
  <QueryClientProvider client={new QueryClient()}><HashRouter><Routes>
    <Route path="/mi-sitio" element={<MiSitioPage />} />
    <Route path="/galeria" element={<GaleriaPage />} />
    <Route path="/p/:slug" element={<SitioPublicadoPage />} />
    <Route path="/sesiones/:codigo" element={<SesionPage />} />
    <Route path="/mapa" element={<MapaReal />} />
    <Route path="/portafolio" element={<VistaEstudiante />} />
    <Route path="*" element={<Navigate to="/mi-sitio" replace />} />
  </Routes></HashRouter></QueryClientProvider>
</AuthContext.Provider>)
