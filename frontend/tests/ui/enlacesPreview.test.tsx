// Los enlaces de la vista previa se abren fuera de la plataforma, en dos mitades:
// 1) el documento de la vista previa (documentoPortafolio) avisa del clic por postMessage;
// 2) useAbrirEnlaces, en la ventana principal, valida quién avisa y a dónde, y abre la pestaña.
import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://tutoriasdeverano.netlify.app/portafolio?e=4' })
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
})

const { act, createElement, useRef } = await import('react')
const { createRoot } = await import('react-dom/client')
const { documentoPortafolio } = await import('../../src/lib/andamiajeEstilos.ts')
const { useAbrirEnlaces } = await import('../../src/features/preview/useAbrirEnlaces.ts')

test('dentro de la vista previa, un clic en un enlace avisa al padre en vez de navegar', () => {
  const html = '<a id="w" href="https://wikipedia.com">W</a><a id="ancla" href="#arriba">Arriba</a><a id="sin">Sin</a>'
  const vista = new JSDOM(documentoPortafolio(html), { url: 'about:srcdoc', runScripts: 'dangerously' })
  const avisos: unknown[] = []
  vista.window.postMessage = ((m: unknown) => { avisos.push(m) }) as typeof vista.window.postMessage

  const clic = (id: string) => {
    const ev = new vista.window.MouseEvent('click', { bubbles: true, cancelable: true })
    vista.window.document.getElementById(id)!.dispatchEvent(ev)
    return ev.defaultPrevented
  }
  assert.equal(clic('w'), true, 'el iframe no debe navegar solo')
  // El objeto nace en el realm de la página de la vista previa: se compara por valor.
  assert.deepEqual(JSON.parse(JSON.stringify(avisos)), [{ tipo: 'abrir-enlace', href: 'https://wikipedia.com' }])
  assert.equal(clic('ancla'), false, 'un ancla interna sigue funcionando dentro de la página')
  assert.equal(avisos.length, 1)
  clic('sin')
  assert.equal(avisos.length, 1, 'un enlace sin dirección no avisa de nada')
  vista.window.close()
})

function Marco({ onRef }: { onRef: (el: HTMLIFrameElement | null) => void }) {
  const ref = useRef<HTMLIFrameElement>(null)
  useAbrirEnlaces(ref)
  return createElement('iframe', { ref: (el: HTMLIFrameElement | null) => { ref.current = el; onRef(el) } })
}

async function montarMarco() {
  let marco: HTMLIFrameElement | null = null
  const contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  const raiz = createRoot(contenedor)
  await act(async () => { raiz.render(createElement(Marco, { onRef: (el) => { marco = el } })) })
  return { marco: marco!, desmontar: () => act(() => raiz.unmount()) }
}

function avisar(source: unknown, data: unknown) {
  window.dispatchEvent(new dom.window.MessageEvent('message', { data, source: source as Window }))
}

test('la ventana principal abre en otra pestaña solo direcciones web o de correo, normalizadas', async () => {
  const abiertos: unknown[][] = []
  window.open = ((...a: unknown[]) => { abiertos.push(a); return null }) as typeof window.open
  const { marco, desmontar } = await montarMarco()

  avisar(marco.contentWindow, { tipo: 'abrir-enlace', href: 'wikipedia.com' })
  avisar(marco.contentWindow, { tipo: 'abrir-enlace', href: 'ana@ejemplo.com' })
  avisar(marco.contentWindow, { tipo: 'abrir-enlace', href: 'javascript:alert(1)' })
  avisar(marco.contentWindow, { tipo: 'abrir-enlace', href: '#arriba' })
  avisar(marco.contentWindow, { tipo: 'otra-cosa', href: 'https://x.com' })

  assert.deepEqual(abiertos, [
    ['https://wikipedia.com', '_blank', 'noopener,noreferrer'],
    ['mailto:ana@ejemplo.com', '_blank', 'noopener,noreferrer'],
  ])
  await desmontar()
})

test('un aviso que no viene del iframe de la vista previa se ignora', async () => {
  const abiertos: unknown[][] = []
  window.open = ((...a: unknown[]) => { abiertos.push(a); return null }) as typeof window.open
  const { desmontar } = await montarMarco()
  avisar(window, { tipo: 'abrir-enlace', href: 'https://phishing.example' })
  avisar(null, { tipo: 'abrir-enlace', href: 'https://phishing.example' })
  assert.deepEqual(abiertos, [])
  await desmontar()
  // Desmontado, ya no escucha.
  avisar(null, { tipo: 'abrir-enlace', href: 'https://x.com' })
  assert.deepEqual(abiertos, [])
})
