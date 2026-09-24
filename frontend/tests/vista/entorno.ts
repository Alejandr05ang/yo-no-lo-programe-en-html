// Navegador de mentira para montar la pantalla REAL del estudiante (VistaEstudiante) en Node.
// Se importa antes que React.
//
// jsdom no ejecuta los <iframe srcdoc>, y la vista previa y la revisión corren el código del
// estudiante justamente así (lib/sandbox.ts, ejecutarPreview). Aquí se observa el documento:
// cuando la app crea el iframe oculto de ejecución, su srcdoc —el que arma construirSrcdoc(),
// con el runtime real— se ejecuta en un documento aparte, y lo que ese runtime publica con
// postMessage llega a la ventana principal con `source` = ese iframe, igual que en el navegador.
import { JSDOM } from 'jsdom'

export const URL_APP = 'https://tutoriasdeverano.netlify.app/portafolio?e=4'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: URL_APP })
const w = dom.window

function definir(nombre: string, valor: unknown) {
  Object.defineProperty(globalThis, nombre, { value: valor, configurable: true, writable: true })
}

for (const nombre of [
  'document', 'HTMLElement', 'HTMLIFrameElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'Element', 'Node',
  'MutationObserver', 'DOMParser', 'MessageEvent', 'Event', 'KeyboardEvent', 'MouseEvent', 'localStorage',
  'sessionStorage', 'getComputedStyle', 'screen',
] as const) {
  definir(nombre, (w as unknown as Record<string, unknown>)[nombre])
}
definir('window', w)
// Sin pretendToBeVisual (su bucle de animación no deja terminar el proceso de pruebas).
const raf = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16) as unknown as number
definir('requestAnimationFrame', raf)
definir('cancelAnimationFrame', (id: number) => clearTimeout(id))
Object.assign(w, { requestAnimationFrame: raf, cancelAnimationFrame: (id: number) => clearTimeout(id) })
definir('IS_REACT_ACT_ENVIRONMENT', true)
class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}
definir('ResizeObserver', ResizeObserverFalso)
;(w as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverFalso

export const ventana = w

/** Cuántas veces se ejecutó código del estudiante (vista previa o revisión). */
export const ejecuciones = { total: 0 }

const vistos = new WeakSet<HTMLIFrameElement>()
new w.MutationObserver((cambios) => {
  for (const cambio of cambios) {
    for (const nodo of cambio.addedNodes) {
      if (!(nodo instanceof w.HTMLIFrameElement) || vistos.has(nodo)) continue
      // Solo el iframe de ejecución (oculto) de ejecutarPreview; el de la vista previa visible
      // solo muestra HTML ya generado.
      if (nodo.style.display !== 'none') continue
      vistos.add(nodo)
      const srcdoc = (nodo as unknown as { srcdoc?: string }).srcdoc || nodo.getAttribute('srcdoc') || ''
      if (nodo.getAttribute('sandbox') !== 'allow-scripts') throw new Error('el iframe de ejecución perdió sandbox="allow-scripts"')
      ejecuciones.total++
      const pagina = new JSDOM(srcdoc, { url: 'about:srcdoc', runScripts: 'dangerously' })
      pagina.window.addEventListener('message', (ev) => {
        w.dispatchEvent(new w.MessageEvent('message', { data: ev.data, source: nodo.contentWindow }))
        setTimeout(() => pagina.window.close(), 0)
      })
    }
  }
}).observe(w.document.body, { childList: true, subtree: true })
