import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { register } from 'node:module'
import { ventana } from '../vista/entorno.ts'
import { ServidorFalso, esGuardado, esLectura } from '../vista/servidorFalso.ts'
import type { ApiClient } from '../../src/lib/http'

register('./firebaseIsolationLoader.mjs', import.meta.url)
const firebase = await import('./firebaseIsolation.mjs')
const { act, createElement, useEffect } = await import('react')
const { createRoot } = await import('react-dom/client')
const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
const { MemoryRouter, Routes, Route, useNavigate, useLocation } = await import('react-router-dom')
const { AuthProvider } = await import('../../src/features/auth/AuthProvider.tsx')
const { useAuth } = await import('../../src/features/auth/authContext.ts')
const { RequireAuth, RequireOnboarding } = await import('../../src/features/auth/guards.tsx')
const { VistaEstudiante } = await import('../../src/features/estudiante/VistaEstudiante.tsx')
const { MiSitioPage } = await import('../../src/features/publicacion/MiSitioPage.tsx')
const { crearDocumentoJu1Inicial, serializarDocumentoJu1 } = await import('../../src/lib/estructuraDePagina.ts')

const disposers: (() => Promise<void>)[] = []
const realFetch = globalThis.fetch
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); firebase.setAccount(null) })
afterEach(async () => {
  for (const dispose of disposers.splice(0)) await dispose()
  globalThis.fetch = realFetch
  firebase.setAccount(null)
})
const wait = (ms = 25) => act(() => new Promise<void>((r) => setTimeout(r, ms)))
async function until(check: () => boolean, description: string) {
  for (let attempt = 0; attempt < 250; attempt++) { if (check()) return; await wait() }
  assert.fail(description)
}

function session(server: ServidorFalso, uid: string) {
  return { user: { ...server.perfil, id: uid, email: `${uid}@example.test`, avatar_path: null, role: 'student', email_verified: true, profile_completed_at: '2026-09-29T12:00:00Z', is_active: true }, onboarding: { state: 'READY' } }
}

async function mount(servers: Record<string, ServidorFalso>, route = '/portafolio?e=4', account = 'alumno-a') {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  const query = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: 30_000 } } })
  const publication = new Map<string, { title: string; html: string; fingerprint: string }>()
  const expireNext = new Set<string>()
  let go: (path: string) => void = () => {}
  let currentApi: ApiClient | null = null
  let location = ''
  function Navigation() {
    const navigate = useNavigate()
    const current = useLocation()
    const auth = useAuth()
    currentApi = auth.api
    useEffect(() => { go = navigate; location = current.pathname + current.search }, [navigate, current])
    return createElement('button', { onClick: () => void auth.signOut(), id: 'test-signout' }, 'Salir de prueba')
  }
  globalThis.fetch = async (url, init) => {
    const uid = new Headers(init?.headers).get('Authorization')?.replace('Bearer ', '') ?? ''
    const server = servers[uid]
    assert.ok(server, `la petición debe estar autenticada como una cuenta de prueba: ${uid}`)
    const path = new URL(String(url)).pathname
    if (expireNext.delete(path)) return Response.json({ error: { code: 'AUTH_REQUIRED' } }, { status: 401 })
    if (path === '/api/auth/bootstrap') return Response.json(session(server, uid))
    if (path === '/api/portfolio/publication') {
      const published = publication.get(uid)
      return Response.json({ publication: published ? { slug: uid, title: published.title, snapshot_html: published.html, source_challenge_key: 'e13', source_fingerprint: published.fingerprint, visibility: 'cohort', is_published: true, revision: 1, published_at: '2026-09-29T12:00:00Z', updated_at: '2026-09-29T12:00:00Z' } : null, sources: [{ challenge_key: 'e13', title: 'Mi diseño', session_code: 'Ju1', last_saved_at: '2026-09-29T12:00:00Z' }], source: { challenge_key: 'e13', draft_code: server.progreso.get('e13')?.draft_code ?? 'mostrar(crearTitulo(datos.nombre))', datos: { nombre: server.perfil.display_name, redes: [], hobbies: [], proyectos: [], skills: [] }, source_fingerprint: `fuente-${uid}` }, has_unpublished_changes: false, can_publish: true, publish_block_reason: null })
    }
    if (path === '/api/portfolio/publication/preview') {
      const body = JSON.parse(String(init?.body))
      return Response.json({ snapshot_html: body.snapshot_html, source_fingerprint: body.source_fingerprint })
    }
    return server.fetch(url, init)
  }
  firebase.setAccount(account)
  await act(async () => root.render(createElement(QueryClientProvider, { client: query }, createElement(AuthProvider, null,
    createElement(MemoryRouter, { initialEntries: [route] }, createElement(Navigation), createElement(Routes, null,
      createElement(Route, { path: '/login', element: createElement('h1', null, 'Inicio de sesión') }),
      createElement(Route, { element: createElement(RequireAuth) },
        createElement(Route, { path: '/mi-sitio', element: createElement(MiSitioPage) }),
        createElement(Route, { element: createElement(RequireOnboarding) },
          createElement(Route, { path: '/portafolio', element: createElement(VistaEstudiante) })))))))))
  disposers.push(async () => { await act(() => root.unmount()); query.clear(); host.remove() })
  const editor = (name = 'portafolio.js') => host.querySelector<HTMLTextAreaElement>(`textarea[data-editor="${name}"]`)
  return {
    host, query, publication, editor, expireNext,
    api: () => currentApi!,
    location: () => location,
    async go(path: string) { await act(async () => go(path)) },
    async account(uid: string) { await act(async () => firebase.setAccount(uid)) },
    async logout() { await act(async () => (host.querySelector('#test-signout') as HTMLButtonElement).click()) },
    async write(text: string) {
      const field = editor()
      assert.ok(field && !field.readOnly)
      await act(async () => {
        Object.getOwnPropertyDescriptor(ventana.HTMLTextAreaElement.prototype, 'value')!.set!.call(field, text)
        field.dispatchEvent(new ventana.Event('input', { bubbles: true }))
      })
    },
    async click(text: string) {
      const button = [...host.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(text))
      assert.ok(button, `botón ${text}`)
      await act(async () => button.click())
    },
    async tab(name: string) {
      const tab = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find((b) => b.textContent?.startsWith(name))
      assert.ok(tab, `pestaña ${name}`)
      await act(async () => tab.click())
    },
  }
}

function accounts() {
  const a = new ServidorFalso({ Ju1: 'open', V1: 'open' })
  const b = new ServidorFalso({ Ju1: 'open', V1: 'open' })
  a.perfil = { ...a.perfil, full_name: 'Cuenta A', display_name: 'Solo A', description: 'Descripción privada A', hobbies: ['Hobby privado A'] }
  b.perfil = { ...b.perfil, full_name: 'Cuenta B', display_name: 'Solo B' }
  a.borrador('e4', 'mostrar(crearTitulo("Código privado A"))', 'accepted')
  b.borrador('e4', 'mostrar(crearTitulo("Código privado B"))')
  return { a, b, servers: { 'alumno-a': a, 'alumno-b': b } }
}

test('A sale con guardados en cola: al entrar B no se envía código ni navegación de A con la sesión de B', async () => {
  const { a, b, servers } = accounts()
  const ui = await mount(servers)
  await until(() => !!ui.editor() && !ui.editor()!.readOnly, 'editor A listo')
  const slow = a.retener(esGuardado('e4'))
  await ui.write('const privado = "A en vuelo"')
  await until(() => a.guardados('e4').length === 0 && ui.host.textContent!.includes('guardando'), 'envío A en curso')
  await slow.llegada
  await ui.write('const privado = "A en cola"')
  await ui.click('Siguiente actividad')
  await ui.logout()
  assert.equal(ui.editor(), null)
  assert.equal(ui.query.getQueryCache().getAll().length, 0, 'logout limpia React Query')
  await ui.account('alumno-b')
  await ui.go('/portafolio?e=4')
  await until(() => ui.editor()?.value.includes('Código privado B') === true, 'editor B listo')
  await act(async () => slow.soltar())
  await wait(150)
  assert.equal(b.progreso.get('e4')?.draft_code, 'mostrar(crearTitulo("Código privado B"))')
  assert.equal(b.guardados('e4').length, 0, 'ningún guardado pendiente de A pertenece a B')
  assert.equal(ui.location(), '/portafolio?e=4', 'una navegación de la cuenta anterior no se aplica a B')
})

test('un ve:perfil heredado sin propietario no se importa en la cuenta B ni sustituye sus datos', async () => {
  const { b, servers } = accounts()
  const legacy = JSON.stringify({ nombre: 'Otra persona', sobreMi: 'Descripción privada heredada A', hobbies: ['Hobby heredado A'], redes: { github: 'https://github.com/privado-a', correo: 'a@example.test' } })
  localStorage.setItem('ve:perfil', legacy)
  const ui = await mount(servers, '/portafolio?e=4', 'alumno-b')
  await until(() => !!ui.editor() && !ui.editor()!.readOnly, 'editor B listo')
  await ui.tab('datos.js')
  assert.equal(b.perfil.description, '')
  assert.deepEqual(b.perfil.hobbies, [])
  assert.equal(b.llamadas.some((l) => l.ruta === '/api/profile' && l.metodo === 'PUT'), false)
  assert.doesNotMatch(ui.editor('datos.js')?.value ?? '', /privad|heredad/)
  assert.equal(localStorage.getItem('ve:perfil'), legacy, 'se conserva la copia sin atribuirla a otra persona')
})

test('volver a entrar con el mismo uid no revive respuestas ni escrituras de la sesión A anterior', async () => {
  const { a, servers } = accounts()
  const ui = await mount(servers)
  await until(() => !!ui.editor() && !ui.editor()!.readOnly, 'A inicial')
  const previousApi = ui.api()
  const slow = a.retener(esLectura('e4'))
  const response = previousApi.request('/challenges/e4/progress').then(() => 'incorrectamente aceptada', (error) => error.code)
  await slow.llegada
  await ui.logout()
  await ui.account('alumno-b')
  await ui.go('/portafolio?e=4')
  await until(() => ui.editor()?.value.includes('Código privado B') === true, 'B')
  await ui.logout()
  await ui.account('alumno-a')
  await ui.go('/portafolio?e=4')
  await until(() => ui.editor()?.value.includes('Código privado A') === true, 'A nueva sesión')
  await act(async () => slow.soltar())
  assert.equal(await response, 'SESSION_CHANGED')
  const writesBefore = a.guardados('e4').length
  await assert.rejects(previousApi.request('/challenges/e4/progress', { method: 'PUT', json: { draft_code: 'A OBSOLETO', status: 'in_progress' } }), { code: 'SESSION_CHANGED' })
  assert.equal(a.guardados('e4').length, writesBefore, 'una cola antigua no transmite nada aunque coincida el uid')
  assert.equal(a.progreso.get('e4')?.draft_code, 'mostrar(crearTitulo("Código privado A"))')
})

test('renovar el token del mismo objeto Firebase conserva el editor, su cliente y el autoguardado, incluso tras un 401', async () => {
  const { a, servers } = accounts()
  const ui = await mount(servers)
  await until(() => !!ui.editor() && !ui.editor()!.readOnly, 'A inicial')
  const beforeApi = ui.api()
  const beforeEditor = ui.editor()
  await ui.write('mostrar(crearTitulo("A sigue escribiendo"))')
  await act(async () => firebase.refreshCurrentUser())
  assert.equal(ui.api(), beforeApi)
  assert.equal(ui.editor(), beforeEditor)
  assert.match(ui.editor()!.value, /A sigue escribiendo/)
  ui.expireNext.add('/api/challenges/e4/progress')
  let progress!: { status: string }
  await act(async () => { progress = await ui.api().request<{ status: string }>('/challenges/e4/progress') })
  assert.equal(progress.status, 'accepted', 'el reintento tras 401 completa la petición autenticada')
  await wait()
  assert.equal(ui.api(), beforeApi)
  assert.equal(ui.editor(), beforeEditor)
  await until(() => a.progreso.get('e4')?.draft_code.includes('A sigue escribiendo') === true, 'autoguardado después de renovar')
  assert.equal(a.progreso.get('e4')?.status, 'accepted')
})

test('el avatar y la etiqueta de vista previa muestran la cuenta autenticada, sin identidad de ejemplo', async () => {
  const { servers } = accounts()
  const ui = await mount(servers)
  await until(() => !!ui.editor() && !ui.editor()!.readOnly, 'editor A listo')
  assert.equal(ui.host.querySelector('.ve-avatar')?.textContent, 'SA')
  assert.match(ui.host.querySelector('.pv-url-campo')?.textContent ?? '', /Solo A/)
  assert.doesNotMatch(ui.host.textContent ?? '', /ana-rivas\.taller\.dev/)
  await ui.logout()
  await ui.account('alumno-b')
  await ui.go('/portafolio?e=4')
  await until(() => !!ui.editor() && !ui.editor()!.readOnly, 'editor B listo')
  assert.equal(ui.host.querySelector('.ve-avatar')?.textContent, 'SB')
  assert.match(ui.host.querySelector('.pv-url-campo')?.textContent ?? '', /Solo B/)
})

test('A → salir → B → salir → A conserva borrador y aceptado propios e ignora ve:* sin uid', async () => {
  const { a, servers } = accounts()
  sessionStorage.setItem('ve:borradores', JSON.stringify({ 4: 'SECRETO LEGADO SIN DUEÑO' }))
  sessionStorage.setItem('ve:soluciones', JSON.stringify({ 4: 'SOLUCIÓN LEGADA SIN DUEÑO' }))
  const ui = await mount(servers)
  await until(() => ui.editor()?.value.includes('Código privado A') === true, 'borrador A')
  assert.match(ui.host.textContent ?? '', /encargo aceptado/)
  await ui.write('mostrar(crearTitulo("Último A sin red"))')
  a.fallar(esGuardado('e4'), 100)
  await until(() => ui.host.textContent!.includes('error al guardar'), 'copia A pendiente')
  await ui.logout()
  await ui.account('alumno-b')
  await ui.go('/portafolio?e=4')
  await until(() => ui.editor()?.value.includes('Código privado B') === true, 'borrador B')
  assert.doesNotMatch(ui.host.textContent ?? '', /encargo aceptado/)
  await ui.tab('datos.js')
  assert.match(ui.editor('datos.js')?.value ?? '', /Solo B/)
  assert.doesNotMatch(ui.editor('datos.js')?.value ?? '', /privada A|privado A|Solo A|LEGAD/)
  assert.ok(localStorage.getItem('tutorias:draft:alumno-a:e4')?.includes('Último A'))
  assert.equal(localStorage.getItem('tutorias:draft:alumno-b:e4'), null)
  await ui.logout()
  a.restablecerRed()
  await ui.account('alumno-a')
  await ui.go('/portafolio?e=4')
  await until(() => ui.editor()?.value.includes('Último A sin red') === true, 'se recupera exclusivamente la copia A')
  assert.match(ui.host.textContent ?? '', /encargo aceptado/)
  await until(() => a.progreso.get('e4')?.draft_code.includes('Último A sin red') === true, 'A recuperado llega al servidor')
})

test('E12/E13 y la publicación restablecen su fuente, título y consentimiento al cambiar de cuenta', async () => {
  const { a, b, servers } = accounts()
  const doc = crearDocumentoJu1Inicial()
  a.borrador('e12', serializarDocumentoJu1({ ...doc, main: 'mostrar(crearTitulo("Diseño privado A"))' }))
  b.borrador('e12', serializarDocumentoJu1({ ...doc, main: 'mostrar(crearTitulo("Diseño privado B"))' }))
  const ui = await mount(servers, '/portafolio?e=13')
  await until(() => ui.editor()?.value.includes('Diseño privado A') === true, 'E13 hereda E12 de A')
  await ui.logout()
  await ui.account('alumno-b')
  await ui.go('/portafolio?e=13')
  await until(() => ui.editor()?.value.includes('Diseño privado B') === true, 'E13 hereda E12 de B')
  assert.doesNotMatch(ui.editor()!.value, /privado A/)
  await ui.logout()
  await ui.account('alumno-a')
  ui.publication.set('alumno-a', { title: 'Publicación privada A', html: '<h1>Publicado A</h1>', fingerprint: 'anterior-a' })
  await ui.go('/mi-sitio')
  await until(() => !!ui.host.querySelector('a[href="/p/alumno-a"]'), 'publicación A')
  await ui.click('Preparar vista previa')
  await until(() => !!ui.host.querySelector('input[type="checkbox"]'), 'preview A preparada')
  await act(async () => (ui.host.querySelector('input[type="checkbox"]') as HTMLInputElement).click())
  await ui.logout()
  await ui.account('alumno-b')
  await ui.go('/mi-sitio')
  await until(() => !!ui.host.querySelector('#sitio-title'), 'publicación B')
  assert.equal((ui.host.querySelector('#sitio-title') as HTMLInputElement).value, 'Mi portafolio')
  assert.equal(ui.host.querySelector('input[type="checkbox"]'), null)
  assert.equal(ui.host.querySelector('iframe'), null)
  assert.equal(ui.host.querySelector('a[href="/p/alumno-a"]'), null)
  assert.doesNotMatch(ui.host.textContent ?? '', /Publicación privada A|Publicado A/)
})
