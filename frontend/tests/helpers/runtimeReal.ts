// Ejecuta código del estudiante con el runtime REAL del sandbox (lib/sandbox.ts), sin
// navegador. jsdom no ejecuta iframes con srcdoc, así que se carga el mismo documento que
// construye construirSrcdoc() como página propia, se escucha el mismo postMessage y se
// procesa con la misma resultadoDelMensaje() que usa ejecutarPreview(). Solo cambia el marco.
import { JSDOM } from 'jsdom'
import { aJavaScript } from '../../src/lib/pseudocodigoAJS.ts'
import { construirSrcdoc, resultadoDelMensaje } from '../../src/lib/sandbox.ts'

export const URL_APP = 'https://tutoriasdeverano.netlify.app/portafolio?e=4'

const dom = new JSDOM('<!doctype html><body></body>', { url: URL_APP })
export const parser = new dom.window.DOMParser()
// revisionLocal.ts usa el DOMParser global del navegador.
Object.assign(globalThis, { DOMParser: dom.window.DOMParser })

export interface Ejecucion {
  ok: boolean
  html: string
  logs: string[]
  error?: string
}

export async function ejecutarReal(codigo: string, datos: unknown): Promise<Ejecucion> {
  const traduccion = aJavaScript(codigo)
  if (!traduccion.ok) return { ok: false, html: '', logs: [], error: traduccion.error?.mensaje }
  const pagina = new JSDOM(construirSrcdoc(traduccion.js, datos), { url: URL_APP, runScripts: 'dangerously' })
  const mensaje = await new Promise<unknown>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('el runtime no respondió')), 3000)
    pagina.window.addEventListener('message', (ev: MessageEvent) => {
      clearTimeout(t)
      resolve(ev.data)
    })
  })
  pagina.window.close()
  const r = resultadoDelMensaje(mensaje, parser)
  if (!r) throw new Error('mensaje desconocido del runtime')
  return { ok: r.ok, html: r.html, logs: r.logs, error: r.error?.mensaje }
}

/** Los <a> del HTML, con su href tal cual y a dónde navegaría desde la plataforma. */
export function enlaces(html: string): { texto: string; href: string | null; navegaA: string | null }[] {
  const doc = new JSDOM(`<!doctype html><body>${html}</body>`, { url: URL_APP }).window.document
  return [...doc.querySelectorAll('a')].map((a) => ({
    texto: (a.textContent ?? '').trim(),
    href: a.getAttribute('href'),
    navegaA: a.getAttribute('href') === null ? null : (a as unknown as { href: string }).href,
  }))
}
