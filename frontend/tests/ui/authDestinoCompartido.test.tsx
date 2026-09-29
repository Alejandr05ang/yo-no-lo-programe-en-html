import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import '../vista/entorno.ts'

const { act, createElement } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter, Route, Routes, useLocation } = await import('react-router-dom')
const { AuthContext } = await import('../../src/features/auth/authContext.ts')
const { AuthPage } = await import('../../src/features/auth/AuthPages.tsx')
const { RequireAuth, RequireOnboarding } = await import('../../src/features/auth/guards.tsx')
import type { AuthContextValue } from '../../src/features/auth/authContext'

const disposers: (() => Promise<void>)[] = []
beforeEach(() => sessionStorage.clear())
afterEach(async () => { for (const dispose of disposers.splice(0)) await dispose() })

async function mount(path: string) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  const session = {
    user: { id: 'ana', email: 'ana@example.test', full_name: 'Ana', display_name: 'Ana', description: '', hobbies: [], avatar_path: null, github_url: null, linkedin_url: null, website_url: null, role: 'student', email_verified: true, profile_completed_at: '2026-09-28T12:00:00Z', is_active: true },
    onboarding: { state: 'READY' },
  } as AuthContextValue['session']
  let auth: AuthContextValue = {
    user: null, session: null, initialized: true, loading: false, configurationError: null, sessionError: null, verificationError: null, api: null,
    signIn: async () => {}, signUp: async () => ({ isNewUser: false }), signInGoogle: async () => ({ isNewUser: false }), signOut: async () => {}, linkGoogle: async () => {}, sendVerification: async () => {}, resetPassword: async () => {}, refresh: async () => {}, retrySession: async () => {}, getIdToken: async () => null,
  }
  function Location() { const location = useLocation(); return createElement('output', { id: 'route' }, location.pathname + location.search) }
  const render = () => root.render(createElement(AuthContext.Provider, { value: auth }, createElement(MemoryRouter, { initialEntries: [path] },
    createElement(Location),
    createElement(Routes, null,
      createElement(Route, { path: '/login', element: createElement(AuthPage) }),
      createElement(Route, { path: '/registro', element: createElement(AuthPage, { register: true }) }),
      createElement(Route, { path: '/cuenta', element: createElement('h1', null, 'Cuenta') }),
      createElement(Route, { path: '/onboarding/clase', element: createElement('h1', null, 'Unirse a clase') }),
      createElement(Route, { element: createElement(RequireAuth) },
        createElement(Route, { path: '/mi-sitio', element: createElement('h1', null, 'Mi sitio privado') }),
        createElement(Route, { element: createElement(RequireOnboarding) }, createElement(Route, { path: '/p/:slug', element: createElement('h1', null, 'Publicación compartida') }))),
    ))))
  await act(async () => render())
  disposers.push(async () => { await act(() => root.unmount()); host.remove() })
  return {
    host,
    route: () => host.querySelector('#route')?.textContent ?? '',
    async signedIn(loading = false, ready = true) {
      auth = { ...auth, user: { uid: 'ana', emailVerified: true } as never, loading, session: loading ? null : { ...session!, onboarding: { state: ready ? 'READY' : 'JOIN_CLASS_REQUIRED' } } }
      await act(async () => render())
    },
  }
}

test('un enlace compartido anónimo vuelve a la publicación después de verificar la sesión del backend', async () => {
  const p = await mount('/p/p-abc123')
  assert.equal(p.route(), '/login?next=%2Fp%2Fp-abc123')
  assert.equal(p.host.querySelector('a[href="/registro?next=%2Fp%2Fp-abc123"]')?.textContent, 'Crea tu cuenta')
  await p.signedIn(true)
  assert.equal(p.route(), '/login?next=%2Fp%2Fp-abc123', 'Firebase todavía no confirma la cohorte')
  assert.match(p.host.textContent ?? '', /Comprobando tu sesión/)
  await p.signedIn()
  assert.equal(p.route(), '/p/p-abc123')
  assert.match(p.host.textContent ?? '', /Publicación compartida/)
})

test('el propietario sin membresía puede volver a Mi sitio tras iniciar sesión', async () => {
  const p = await mount('/mi-sitio')
  assert.equal(p.route(), '/login?next=%2Fmi-sitio')
  await p.signedIn(false, false)
  assert.equal(p.route(), '/mi-sitio')
})

test('el destino compartido no evita el requisito de pertenecer a una cohorte', async () => {
  const p = await mount('/login?next=%2Fp%2Fp-abc123')
  await p.signedIn(false, false)
  assert.equal(p.route(), '/onboarding/clase')
})

test('destinos externos, rutas ajenas y valores codificados maliciosos se ignoran tras iniciar sesión', async () => {
  for (const next of ['https://evil.example', '//evil.example/p/a', '/\\evil.example', '/admin', '/p/../admin', '/p/%2f%2fevil.example', '/p/a?next=https://evil.example', '/mi-sitio/extra', '/p/a#fragment', '/p/a\n', '/p/a\u2028', 'javascript:alert(1)']) {
    const p = await mount(`/login?next=${encodeURIComponent(next)}`)
    await p.signedIn()
    assert.equal(p.route(), '/cuenta', `destino rechazado: ${next}`)
  }
})
