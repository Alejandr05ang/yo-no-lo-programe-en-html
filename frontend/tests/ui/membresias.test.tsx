import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import '../vista/entorno.ts'
import type { AuthContextValue } from '../../src/features/auth/authContext'

const { act, createElement } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { AuthContext } = await import('../../src/features/auth/authContext.ts')
const { createApiClient } = await import('../../src/lib/http.ts')
const { InstructorDashboard } = await import('../../src/features/instructor/InstructorDashboard.tsx')

const cohortes = [
  { id: 'clase-a', name: 'Clase A', slug: 'clase-a', is_active: true },
  { id: 'clase-b', name: 'Clase B', slug: 'clase-b', is_active: true },
]
const ana = { id: 'ana', email: 'ana@example.test', full_name: 'Ana Pérez', display_name: 'Ana', joined_at: '2026-09-28T12:00:00Z', status: 'active' }
const disposers: (() => Promise<void>)[] = []
afterEach(async () => { for (const dispose of disposers.splice(0)) await dispose() })

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

async function montar(responder: (path: string, method: string, body: unknown) => Response | Promise<Response>, ruta = '/instructor') {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  const api = createApiClient({
    browserOrigin: 'https://taller.example.test', development: false,
    getSessionKey: () => 'docente', getIdToken: async () => 'token-de-prueba',
    fetcher: async (url, init) => {
      const path = new URL(String(url)).pathname
      if (path === '/api/instructor/cohorts') return Response.json(cohortes)
      return responder(path, init?.method ?? 'GET', init?.body ? JSON.parse(String(init.body)) : undefined)
    },
  })
  const auth: AuthContextValue = {
    user: null, session: null, initialized: true, loading: false, configurationError: null, sessionError: null, verificationError: null, api,
    signIn: async () => {}, signUp: async () => ({ isNewUser: false }), signInGoogle: async () => ({ isNewUser: false }), signOut: async () => {}, linkGoogle: async () => {}, sendVerification: async () => {}, resetPassword: async () => {}, refresh: async () => {}, retrySession: async () => {}, getIdToken: async () => null,
  }
  await act(async () => root.render(createElement(AuthContext.Provider, { value: auth }, createElement(MemoryRouter, { initialEntries: [ruta] }, createElement(InstructorDashboard)))))
  disposers.push(async () => { await act(() => root.unmount()); host.remove() })
  return {
    host,
    fila: (email = ana.email) => {
      const row = [...host.querySelectorAll('tbody tr')].find((r) => r.textContent?.includes(email))
      assert.ok(row, `Debe aparecer el estudiante ${email}`)
      return row
    },
    async cohorte(id: string) {
      await act(async () => {
        const select = host.querySelector('select')!
        select.value = id
        select.dispatchEvent(new window.Event('change', { bubbles: true }))
      })
    },
  }
}

function boton(scope: ParentNode, texto: string) {
  const element = [...scope.querySelectorAll('button')].find((b) => b.textContent === texto)
  assert.ok(element, `Debe existir el botón ${texto}`)
  return element
}

async function pulsar(scope: ParentNode, texto: string) {
  await act(async () => boton(scope, texto).click())
}

test('retirar y reactivar requieren confirmación y actualizan el estado desde la respuesta del servidor', async () => {
  const cambios: unknown[] = []
  const retiro = deferred<Response>()
  const ui = await montar((path, method, body) => {
    if (method === 'GET') return Response.json([ana])
    assert.equal(path, '/api/instructor/cohorts/clase-a/students/ana/membership')
    assert.equal(method, 'PATCH')
    cambios.push(body)
    return cambios.length === 1 ? retiro.promise : Response.json(ana)
  })

  assert.equal(ui.fila().querySelectorAll('td')[2]?.textContent, 'Activo')
  await pulsar(ui.fila(), 'Retirar')
  assert.match(ui.fila().textContent ?? '', /Ana Pérez/)
  assert.match(ui.fila().textContent ?? '', /Clase A/)
  assert.match(ui.fila().textContent ?? '', /código/)
  assert.deepEqual(cambios, [], 'abrir la confirmación no modifica el acceso')
  await pulsar(ui.fila(), 'Cancelar')
  assert.deepEqual(cambios, [])
  await pulsar(ui.fila(), 'Retirar')
  await pulsar(ui.fila(), 'Confirmar retiro')
  assert.deepEqual(cambios, [{ status: 'removed' }])
  assert.equal(ui.fila().querySelectorAll('td')[2]?.textContent, 'Activo', 'conserva el acceso mostrado hasta que responde el servidor')
  assert.equal(boton(ui.fila(), 'Aplicando…').disabled, true)
  await act(async () => retiro.resolve(Response.json({ ...ana, status: 'removed' })))
  assert.equal(ui.fila().querySelectorAll('td')[2]?.textContent, 'Retirado')
  await pulsar(ui.fila(), 'Reactivar')
  assert.deepEqual(cambios, [{ status: 'removed' }])
  await pulsar(ui.fila(), 'Confirmar reactivación')
  assert.deepEqual(cambios, [{ status: 'removed' }, { status: 'active' }])
  assert.equal(ui.fila().querySelectorAll('td')[2]?.textContent, 'Activo')
  assert.ok(boton(ui.fila(), 'Retirar'))
})

test('un rechazo del servidor conserva el estado y permite reintentar la confirmación', async () => {
  const ui = await montar((_path, method) => method === 'GET'
    ? Response.json([ana])
    : Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 }))
  await pulsar(ui.fila(), 'Retirar')
  await pulsar(ui.fila(), 'Confirmar retiro')
  assert.equal(ui.fila().querySelectorAll('td')[2]?.textContent, 'Activo')
  assert.match(ui.host.querySelector('[role="alert"]')?.textContent ?? '', /no tiene acceso/)
  assert.equal(boton(ui.fila(), 'Confirmar retiro').disabled, false)
  await pulsar(ui.fila(), 'Cancelar')
  assert.equal(boton(ui.fila(), 'Retirar').disabled, false)
})

for (const resultado of ['éxito', 'error']) {
  test(`un ${resultado} tardío de retiro no modifica la siguiente cohorte, aunque tenga el mismo estudiante`, async () => {
    const respuesta = deferred<Response>()
    const ui = await montar((path, method) => {
      if (method === 'PATCH') return respuesta.promise
      return Response.json([{ ...ana, full_name: path.includes('clase-b') ? 'Ana en B' : 'Ana Pérez' }])
    })
    await pulsar(ui.fila(), 'Retirar')
    await pulsar(ui.fila(), 'Confirmar retiro')
    await ui.cohorte('clase-b')
    assert.match(ui.fila().textContent ?? '', /Ana en B/)
    await act(async () => respuesta.resolve(resultado === 'éxito'
      ? Response.json({ ...ana, status: 'removed' })
      : Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })))
    assert.equal(ui.fila().querySelectorAll('td')[2]?.textContent, 'Activo')
    assert.match(ui.fila().textContent ?? '', /Ana en B/)
    assert.equal(ui.host.querySelector('[role="alert"]'), null)
    assert.equal(boton(ui.fila(), 'Retirar').disabled, false)
  })
}

test('una lista tardía de estudiantes no sustituye los de la cohorte seleccionada', async () => {
  const primera = deferred<Response>()
  const ui = await montar((path) => path.includes('clase-a')
    ? primera.promise
    : Response.json([{ ...ana, full_name: 'Ana en B' }]))
  await ui.cohorte('clase-b')
  assert.match(ui.fila().textContent ?? '', /Ana en B/)
  await act(async () => primera.resolve(Response.json([ana])))
  assert.match(ui.fila().textContent ?? '', /Ana en B/)
  assert.equal(ui.host.querySelector('select')?.value, 'clase-b')
})

test('las membresías pendientes se distinguen de las activas y no ofrecen retirarlas o reactivarlas', async () => {
  const ui = await montar(() => Response.json([{ ...ana, status: 'pending' }]))
  assert.equal(ui.fila().querySelectorAll('td')[2]?.textContent, 'Pendiente')
  assert.equal(ui.fila().querySelector('button'), null)
})

test('desde el panel de administración se abre la cohorte que se estaba viendo', async () => {
  const pedidas: string[] = []
  const ui = await montar((path) => { pedidas.push(path); return Response.json([ana]) }, '/instructor?cohort=clase-b')
  for (let i = 0; i < 50 && !ui.host.querySelector('tbody tr'); i++) await act(() => new Promise<void>((r) => setTimeout(r, 10)))
  assert.equal(ui.host.querySelector('select')?.value, 'clase-b')
  assert.deepEqual(pedidas, ['/api/instructor/cohorts/clase-b/students'])
  assert.match(ui.fila().textContent ?? '', /Ana Pérez/)
})

test('una cohorte pedida que no es del docente cae en la primera de su lista', async () => {
  const pedidas: string[] = []
  await montar((path) => { pedidas.push(path); return Response.json([]) }, '/instructor?cohort=otra-ajena')
  for (let i = 0; i < 50 && pedidas.length === 0; i++) await act(() => new Promise<void>((r) => setTimeout(r, 10)))
  assert.deepEqual(pedidas, ['/api/instructor/cohorts/clase-a/students'])
})
