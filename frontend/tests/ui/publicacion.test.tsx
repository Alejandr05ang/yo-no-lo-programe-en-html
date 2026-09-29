import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { ventana } from '../vista/entorno.ts'

const { act, createElement, useEffect } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter, Routes, Route, useNavigate } = await import('react-router-dom')
const { AuthContext } = await import('../../src/features/auth/authContext.ts')
const { createApiClient } = await import('../../src/lib/http.ts')

const disposers: (() => Promise<void>)[] = []
afterEach(async () => { for (const dispose of disposers.splice(0)) await dispose() })
const delay = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)))
async function until(check: () => boolean) {
  for (let i = 0; i < 150; i++) { if (check()) return; await delay() }
  assert.fail('La pantalla no llegó al estado esperado')
}

const source = { challenge_key: 'e13', draft_code: 'mostrar(crearTitulo(datos.nombre)); mostrar(crearEnlace("Wiki", "wikipedia.com"));', datos: { nombre: 'Ana', redes: [], hobbies: [], proyectos: [], skills: [] }, source_fingerprint: 'fingerprint-13' }
const state = () => ({ publication: null, sources: [{ challenge_key: 'e13', title: 'Mi diseño', session_code: 'Ju1', last_saved_at: '2026-09-28T12:00:00Z' }, { challenge_key: 'e7', title: 'Mi bio', session_code: 'V1', last_saved_at: '2026-09-28T12:00:00Z' }], source, has_unpublished_changes: false, can_publish: true, publish_block_reason: null })

async function mount(component: React.ComponentType, route: string, fetcher: typeof fetch, path = route) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  let navigate: (url: string) => void = () => {}
  function Navigation() { const go = useNavigate(); useEffect(() => { navigate = go }, [go]); return null }
  const api = createApiClient({ baseUrl: '/api', browserOrigin: 'https://tutoriasdeverano.netlify.app', development: false, getSessionKey: () => 'ana', getIdToken: async () => 'token', fetcher })
  const user = { uid: 'ana' }
  const auth = { user, api, session: { user: { id: 'ana', email: 'private@example.com', role: 'student' }, onboarding: { state: 'READY' } }, signOut: async () => {} } as never
  await act(async () => { root.render(createElement(AuthContext.Provider, { value: auth }, createElement(MemoryRouter, { initialEntries: [route] }, createElement(Navigation), createElement(Routes, null, createElement(Route, { path, element: createElement(component) }))))) })
  disposers.push(async () => { await act(() => root.unmount()); host.remove() })
  return {
    host,
    async go(url: string) { await act(() => navigate(url)) },
    text: () => host.textContent ?? '',
    button: (label: RegExp) => [...host.querySelectorAll('button')].find((node) => label.test(node.textContent ?? '')),
    async click(label: RegExp) { const node = this.button(label); assert.ok(node, `botón ${label}`); await act(async () => { node.click(); await Promise.resolve() }) },
    async input(value: string) { const node = host.querySelector('input[type="text"]')!; await act(() => { Object.getOwnPropertyDescriptor(ventana.HTMLInputElement.prototype, 'value')!.set!.call(node, value); node.dispatchEvent(new ventana.Event('input', { bubbles: true })) }) },
  }
}

test('Ju2 y V2 ofrecen su flujo propio aunque no tengan retos DOM', async () => {
  const { SesionPage } = await import('../../src/features/mapa/SesionPage.tsx')
  for (const [code, target] of [['Ju2', '/mi-sitio'], ['V2', '/galeria']]) {
    const p = await mount(SesionPage, `/sesiones/${code}`, async () => Response.json({ id: code, code, day_number: code === 'Ju2' ? 9 : 10, title: code, challenges: [], preview: false }), '/sesiones/:codigo')
    await until(() => !p.text().includes('Cargando'))
    assert.ok(p.host.querySelector(`a[href="${target}"]`), `${code} debe ofrecer una acción real`)
    assert.doesNotMatch(p.text(), /No hay actividades asignadas/)
  }
})

test('cambiar de fuente durante una previsualización descarta la respuesta vieja y deja preparar la nueva', async () => {
  const { MiSitioPage } = await import('../../src/features/publicacion/MiSitioPage.tsx')
  let finish!: (response: Response) => void
  const delayed = new Promise<Response>((resolve) => { finish = resolve })
  let previewRequested = false
  const p = await mount(MiSitioPage, '/mi-sitio', async (url) => {
    const parsed = new URL(String(url))
    if (parsed.pathname.endsWith('/preview')) { previewRequested = true; return delayed }
    return Response.json({ ...state(), source: parsed.searchParams.get('challenge_key') === 'e7' ? { ...source, challenge_key: 'e7', source_fingerprint: 'fingerprint-7' } : source })
  })
  await until(() => !!p.button(/Preparar vista previa/))
  await p.click(/Preparar vista previa/)
  await until(() => previewRequested)
  await p.go('/mi-sitio?challenge_key=e7')
  await until(() => p.host.querySelector('select')?.value === 'e7')
  const ready = !!p.button(/Preparar vista previa/)
  await act(async () => finish(Response.json({ snapshot_html: '<h1>FUENTE VIEJA</h1>', source_fingerprint: 'fingerprint-13' })))
  await delay()
  assert.ok(ready, 'la nueva fuente no debe quedar atascada por la petición vieja')
  assert.equal(!!p.host.querySelector('iframe'), false, 'una respuesta vieja no debe reaparecer como vista previa')
  assert.equal(p.button(/^Publicar para mi cohorte$/)?.disabled, true)
})

test('una huella rechazada no permite publicar y retirar conserva el enlace al editor', async () => {
  const { MiSitioPage } = await import('../../src/features/publicacion/MiSitioPage.tsx')
  let retired = false
  let publishes = 0
  const publication = { slug: 'ana-site', title: 'Mi web', snapshot_html: '<h1>Anterior</h1>', source_challenge_key: 'e13', source_fingerprint: 'old', visibility: 'cohort', is_published: true, revision: 1, published_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:00Z' }
  const p = await mount(MiSitioPage, '/mi-sitio', async (url) => {
    if (String(url).endsWith('/preview')) return Response.json({ error: { code: 'SOURCE_CHANGED' } }, { status: 409 })
    if (String(url).endsWith('/publish')) publishes++
    if (String(url).endsWith('/unpublish')) retired = true
    return Response.json({ ...state(), publication: { ...publication, is_published: !retired }, has_unpublished_changes: true })
  })
  await until(() => !!p.button(/Preparar vista previa/))
  assert.match(p.text(), /Cambios sin publicar/)
  await p.click(/Preparar vista previa/)
  await until(() => !!p.host.querySelector('[role="alert"]'))
  assert.match(p.text(), /Tu código o tus datos cambiaron/)
  assert.equal(p.button(/Actualizar publicación/)?.disabled, true)
  assert.equal(publishes, 0)
  await p.click(/Retirar publicación/)
  await until(() => !p.host.querySelector('a[href="/p/ana-site"]'))
  assert.ok(p.host.querySelector('a[href="/portafolio?e=13"]'), 'retirar nunca elimina la fuente editable')
})

test('la captura reconoce un documento grid heredado en cualquier encargo y usa los datos del servidor', async () => {
  const { capturarFuente } = await import('../../src/lib/publicacion.ts')
  const grid = { version: 1, estructura: { filas: 1, columnas: 1, celdas: [{ id: 'a', fila: 0, columna: 0, expandeFilas: 1, expandeColumnas: 1, seccion: 'bio' }] }, secciones: [{ nombre: 'bio', contenido: 'mostrar(crearTitulo(datos.nombre))' }], main: 'mostrar(bio)' }
  const html = await capturarFuente({ ...source, challenge_key: 'e7', draft_code: JSON.stringify(grid) })
  assert.match(html, /<h1>Ana<\/h1>/)
  assert.match(html, /display:\s*grid/)
  assert.doesNotMatch(html, /private@example.com/)
})

test('publicar exige vista previa saneada y consentimiento; cambiar título invalida esa vista previa', async () => {
  const module = await import('../../src/features/publicacion/MiSitioPage.tsx').catch(() => null)
  assert.ok(module?.MiSitioPage, 'falta la pantalla Mi sitio')
  const calls: { path: string; body: Record<string, unknown> }[] = []
  const p = await mount(module.MiSitioPage, '/mi-sitio', async (url, init) => {
    const path = new URL(String(url)).pathname
    const body = JSON.parse(String(init?.body ?? '{}'))
    calls.push({ path, body })
    if (path.endsWith('/preview')) return Response.json({ snapshot_html: '<h1>Ana saneada</h1><a href="https://wikipedia.com">Wiki</a>', source_fingerprint: 'fingerprint-13' })
    if (path.endsWith('/publish')) return Response.json({ ...state(), publication: { slug: 'ana-site', title: body.title, snapshot_html: body.snapshot_html, source_challenge_key: 'e13', source_fingerprint: 'fingerprint-13', visibility: 'cohort', is_published: true, revision: 1, published_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:00Z' } })
    return Response.json(state())
  })
  await until(() => !!p.button(/Preparar vista previa/))
  assert.equal(p.button(/^Publicar para mi cohorte$/)?.disabled, true)
  await p.click(/Preparar vista previa/)
  await until(() => !!p.host.querySelector('iframe'))
  const iframe = p.host.querySelector('iframe')!
  assert.match(iframe.srcdoc, /Ana saneada/)
  assert.doesNotMatch(iframe.srcdoc, /private@example.com|<script|@import/i)
  assert.equal(iframe.getAttribute('sandbox'), 'allow-scripts')
  assert.match(iframe.srcdoc, /script-src 'none'/)
  assert.equal(p.button(/^Publicar para mi cohorte$/)?.disabled, true)
  const preview = calls.find((call) => call.path.endsWith('/preview'))!
  assert.match(String(preview.body.snapshot_html), /<h1>Ana<\/h1>/)
  assert.equal(preview.body.source_fingerprint, 'fingerprint-13')
  await act(() => p.host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click())
  assert.equal(p.button(/^Publicar para mi cohorte$/)?.disabled, false)
  await p.input('Título cambiado')
  assert.equal(p.button(/^Publicar para mi cohorte$/)?.disabled, true, 'otro título requiere revisar otra versión')
  await p.click(/Preparar vista previa/)
  await until(() => !!p.host.querySelector('iframe'))
  await act(() => p.host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click())
  await p.click(/^Publicar para mi cohorte$/)
  await until(() => !!p.host.querySelector('a[href="/p/ana-site"]'))
  assert.ok(p.button(/Copiar enlace/), 'el sitio compartido debe ofrecer copiar su URL')
  Object.defineProperty(ventana.navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied') } } })
  await p.click(/Copiar enlace/)
  await until(() => p.text().includes('enlace quedó seleccionado'))
  const share = p.host.querySelector<HTMLInputElement>('input[readonly]')!
  assert.equal(share.selectionEnd, share.value.length)
  const publish = calls.find((call) => call.path.endsWith('/publish'))!
  assert.equal(publish.body.snapshot_html, '<h1>Ana saneada</h1><a href="https://wikipedia.com">Wiki</a>')
  assert.equal(publish.body.title, 'Título cambiado')
  assert.equal(publish.body.visibility, 'cohort')
  assert.ok(p.host.querySelector('a[href="https://wikipedia.com"][rel="noopener noreferrer"]'))
})

test('galería y sitio publicado usan rutas autenticadas, sin ejecutar la fuente', async () => {
  const gallery = await import('../../src/features/publicacion/GaleriaPage.tsx').catch(() => null)
  const published = await import('../../src/features/publicacion/SitioPublicadoPage.tsx').catch(() => null)
  assert.ok(gallery?.GaleriaPage && published?.SitioPublicadoPage, 'faltan las páginas compartidas')
  const item = { slug: 'ana-site', title: 'La web de Ana', display_name: 'Ana', has_avatar: false, updated_at: '2026-09-28T12:00:00Z' }
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer token')
    return Response.json(String(url).endsWith('/gallery') ? { items: [item] } : { ...item, snapshot_html: '<h1>Mi sitio guardado</h1>' })
  }
  const g = await mount(gallery.GaleriaPage, '/galeria', fetcher)
  await until(() => g.text().includes('La web de Ana'))
  assert.ok(g.host.querySelector('a[href="/p/ana-site"]'))
  assert.doesNotMatch(g.text(), /private@example.com/)
  const p = await mount(published.SitioPublicadoPage, '/p/ana-site', fetcher, '/p/:slug')
  await until(() => !!p.host.querySelector('iframe'))
  assert.match(p.host.querySelector('iframe')!.srcdoc, /Mi sitio guardado/)
  assert.doesNotMatch(p.text(), /Publicar para mi cohorte/)
})
