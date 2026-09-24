// Monta la pantalla REAL del estudiante (VistaEstudiante) con el mismo árbol de proveedores que
// en producción —autenticación, React Query, router— y el cliente HTTP real contra el servidor
// falso. Devuelve lo que ve y puede hacer un estudiante.
import { ventana } from './entorno.ts'
import type { ServidorFalso } from './servidorFalso.ts'

const { act, createElement, useCallback, useEffect, useMemo, useState } = await import('react')
const { createRoot } = await import('react-dom/client')
const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
const { Link, MemoryRouter, Route, Routes, useLocation, useNavigate, useParams } = await import('react-router-dom')
const { AuthContext } = await import('../../src/features/auth/authContext.ts')
const { createApiClient } = await import('../../src/lib/http.ts')
const { VistaEstudiante } = await import('../../src/features/estudiante/VistaEstudiante.tsx')

export const esperar = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)))

/** Espera (dejando correr React y los temporizadores) hasta que `cond` se cumpla. */
export async function hasta(cond: () => boolean, que: string, ms = 8000): Promise<void> {
  const limite = Date.now() + ms
  while (!cond()) {
    if (Date.now() > limite) throw new Error(`No pasó a tiempo: ${que}`)
    await esperar(25)
  }
}

function usuarioDelServidor(servidor: ServidorFalso, uid: string) {
  const p = servidor.perfil
  return {
    id: uid,
    email: 'ana@ejemplo.com',
    full_name: p.full_name,
    display_name: p.display_name,
    description: p.description,
    hobbies: p.hobbies,
    avatar_path: null,
    github_url: p.github_url,
    linkedin_url: p.linkedin_url,
    website_url: p.website_url,
    role: 'student' as const,
    email_verified: true,
    profile_completed_at: '2026-09-01T00:00:00Z',
    is_active: true,
  }
}

export interface Pantalla {
  contenedor: HTMLElement
  /** Ruta actual (pathname + search). */
  ubicacion: () => string
  /** Navega como lo haría un enlace de la app (o el botón Atrás). */
  ir: (ruta: string) => Promise<void>
  /** Pulsa un enlace (<a>) por su texto. */
  enlace: (texto: string | RegExp) => Promise<void>
  /** El editor de portafolio.js (null si la pantalla no lo muestra). */
  editor: () => HTMLTextAreaElement | null
  escribir: (texto: string) => Promise<void>
  sello: () => string
  boton: (texto: string | RegExp) => HTMLButtonElement | null
  pulsar: (texto: string | RegExp) => Promise<void>
  pestana: (nombre: string) => Promise<void>
  texto: () => string
  desmontar: () => Promise<void>
}

export async function montar(servidor: ServidorFalso, ruta = '/portafolio?e=4', uid = 'alumno-1'): Promise<Pantalla> {
  const contenedor = ventana.document.createElement('div')
  ventana.document.body.appendChild(contenedor)
  const raiz = createRoot(contenedor)
  const router = { ubicacion: '', navegar: (ruta: string) => { void ruta } }

  function Ubicacion() {
    const l = useLocation()
    const navegar = useNavigate()
    useEffect(() => {
      router.ubicacion = `${l.pathname}${l.search}`
      router.navegar = navegar
    })
    return null
  }
  function Sesion() {
    return createElement('h1', null, `Sesión ${useParams().codigo}`)
  }
  function ConAuth() {
    const [session, setSession] = useState(() => ({ user: usuarioDelServidor(servidor, uid), onboarding: { state: 'READY' as const } }))
    const api = useMemo(() => createApiClient({
      baseUrl: '/api',
      browserOrigin: 'https://tutoriasdeverano.netlify.app',
      development: false,
      getSessionKey: () => uid,
      getIdToken: async () => 'token-de-prueba',
      fetcher: servidor.fetch,
    }), [])
    // Como AuthProvider.refresh({ silencioso: true }): vuelve a leer la sesión sin vaciarla.
    const refresh = useCallback(async () => {
      setSession({ user: usuarioDelServidor(servidor, uid), onboarding: { state: 'READY' } })
    }, [])
    const valor = useMemo(() => ({
      user: { uid } as never,
      session,
      initialized: true,
      loading: false,
      configurationError: null,
      sessionError: null,
      verificationError: null,
      api,
      refresh,
      signIn: async () => {}, signUp: async () => ({ isNewUser: false }), signInGoogle: async () => ({ isNewUser: false }),
      signOut: async () => {}, linkGoogle: async () => {}, sendVerification: async () => {}, resetPassword: async () => {},
      retrySession: async () => {}, getIdToken: async () => 'token-de-prueba',
    }), [session, api, refresh])
    return createElement(AuthContext.Provider, { value: valor },
      createElement(MemoryRouter, { initialEntries: [ruta] },
        createElement(Ubicacion),
        createElement(Routes, null,
          createElement(Route, { path: '/portafolio', element: createElement(VistaEstudiante) }),
          createElement(Route, { path: '/sesiones/:codigo', element: createElement(Sesion) }),
          createElement(Route, { path: '/mapa', element: createElement('div', null, createElement('h1', null, 'Mapa'), createElement(Link, { to: '/portafolio?e=7' }, 'Abrir E7')) }),
        )))
  }

  // Los mismos valores por defecto que src/main.tsx. gcTime infinito solo para que, al terminar,
  // no quede un temporizador de limpieza de 5 minutos manteniendo vivo el proceso de pruebas.
  const cliente = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, gcTime: Infinity } } })
  await act(async () => {
    raiz.render(createElement(QueryClientProvider, { client: cliente }, createElement(ConAuth)))
  })

  const editor = () => contenedor.querySelector<HTMLTextAreaElement>('textarea[data-editor="portafolio.js"]')
  const boton = (texto: string | RegExp) => [...contenedor.querySelectorAll('button')].find((b) =>
    typeof texto === 'string' ? (b.textContent ?? '').trim().startsWith(texto) : texto.test(b.textContent ?? '')) ?? null
  return {
    contenedor,
    ubicacion: () => router.ubicacion,
    async ir(ruta) {
      await act(async () => { router.navegar(ruta) })
    },
    async enlace(texto) {
      const a = [...contenedor.querySelectorAll('a')].find((x) =>
        typeof texto === 'string' ? (x.textContent ?? '').trim() === texto : texto.test(x.textContent ?? ''))
      if (!a) throw new Error(`no hay enlace ${texto}`)
      await act(async () => { a.dispatchEvent(new ventana.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })) })
    },
    editor,
    async escribir(texto) {
      const e = editor()
      if (!e) throw new Error('no hay editor')
      if (e.readOnly) throw new Error('el editor está en solo lectura')
      await act(async () => {
        Object.getOwnPropertyDescriptor(ventana.HTMLTextAreaElement.prototype, 'value')!.set!.call(e, texto)
        e.dispatchEvent(new ventana.Event('input', { bubbles: true }))
      })
    },
    sello: () => (contenedor.querySelector('.ed-sello')?.textContent ?? '').trim(),
    boton,
    async pulsar(texto) {
      const b = boton(texto)
      if (!b) throw new Error(`no hay botón ${texto}`)
      await act(async () => { b.click() })
    },
    async pestana(nombre) {
      const b = [...contenedor.querySelectorAll('[role="tab"]')].find((t) => (t.textContent ?? '').startsWith(nombre)) as HTMLElement | undefined
      if (!b) throw new Error(`no hay pestaña ${nombre}`)
      await act(async () => { b.click() })
    },
    texto: () => contenedor.textContent ?? '',
    async desmontar() {
      await act(async () => { raiz.unmount() })
      contenedor.remove()
      cliente.clear()
    },
  }
}
