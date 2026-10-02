import { ANDAMIAJE_CSS } from './andamiajeEstilos'
import { esEnlaceExterno, normalizarEnlace } from './enlaces'
import { parsearDocumentoJu1 } from './estructuraDePagina'
import { ejecutarPreview, ejecutarPreviewEvolucion, ejecutarPreviewJu1 } from './sandbox'

export interface FuentePublicacion {
  challenge_key: string
  draft_code: string
  datos: Record<string, unknown>
  source_fingerprint: string
}
export interface Publicacion {
  slug: string
  title: string
  snapshot_html: string
  source_challenge_key: string
  source_fingerprint: string
  visibility: 'cohort'
  revision: number
  is_published: boolean
  published_at: string
  updated_at: string
}
export interface EstadoPublicacion {
  publication: Publicacion | null
  sources: { challenge_key: string; title: string; session_code: string; last_saved_at: string | null }[]
  source: FuentePublicacion | null
  has_unpublished_changes: boolean
  can_publish: boolean
  publish_block_reason: string | null
}
export interface SitioDeGaleria {
  slug: string
  title: string
  display_name: string
  has_avatar: boolean
  updated_at: string
}
export interface VistaPreviaPublicacion {
  snapshot_html: string
  source_fingerprint: string
}

/** La fuente sigue en Progress. Aquí solo se ejecuta una copia exacta enviada por el servidor. */
export async function capturarFuente(source: FuentePublicacion): Promise<string> {
  let grid = false
  try {
    const parsed: unknown = JSON.parse(source.draft_code)
    grid = !!parsed && typeof parsed === 'object' && 'version' in parsed && parsed.version === 1 && 'estructura' in parsed && 'secciones' in parsed
  } catch { /* los portafolios de un archivo son JavaScript o pseudocódigo */ }
  const result = grid
    ? await ejecutarPreviewJu1(parsearDocumentoJu1(source.draft_code), source.datos)
    : await ejecutarPreview(source.draft_code, source.datos)
  if (!result.ok) throw new Error(result.error?.mensaje ?? 'No se pudo preparar la vista previa.')
  return await conCarruselCompleto(result.html, source)
}

const MAX_IMAGENES_CARRUSEL = 50

/** El snapshot es estático: un carrusel quedaría con su primera imagen. Se corre el reloj del
 *  programa para juntar todas las que muestra y se dejan en el carrusel (solo la primera a la
 *  vista); `documentoPublicado` las va alternando con la pausa en `title="rotar:segundos"`. */
async function conCarruselCompleto(html: string, source: FuentePublicacion): Promise<string> {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const carrusel = doc.querySelector('[data-carrusel]')
  if (!carrusel) return html
  try {
    const cuadros = await ejecutarPreviewEvolucion(source.draft_code, source.datos, MAX_IMAGENES_CARRUSEL)
    const vistas = new Map<string, HTMLElement>()
    for (const c of cuadros) {
      if (!c.ok) break
      const d = new DOMParser().parseFromString(`<body>${c.html}</body>`, 'text/html')
      const img = d.querySelector('[data-carrusel] img')
      const src = img?.getAttribute('src')
      if (!img || !src) continue
      if (vistas.has(src)) break // el ciclo ya dio la vuelta
      vistas.set(src, doc.importNode(img, true) as HTMLElement)
    }
    if (vistas.size < 2) return html
    const segundos = Number(source.datos.segundos)
    carrusel.setAttribute('title', `rotar:${segundos > 0 ? segundos : 1}`)
    carrusel.replaceChildren(...[...vistas.values()].map((img, i) => {
      if (i > 0) img.setAttribute('style', 'display: none')
      return img
    }))
    return doc.body.innerHTML
  } catch {
    return html
  }
}

const GUION_CARRUSEL = `for (const c of document.querySelectorAll('section[title^="rotar:"]')) {
  const imgs = [...c.querySelectorAll('img')];
  if (imgs.length < 2) continue;
  const segundos = parseFloat(c.title.slice(6)) || 1;
  c.removeAttribute('title');
  for (const img of imgs) img.loading = 'eager';
  let i = 0;
  setInterval(() => {
    imgs[i].style.display = 'none';
    i = (i + 1) % imgs.length;
    imgs[i].style.display = '';
  }, segundos * 1000);
}`

// Las imágenes viajan al servidor con su dirección guardada en `title` (que todo saneador
// conserva) y se vuelven `src` solo al mostrarlas. El saneador de versiones anteriores del
// backend quita el `src` de toda imagen; así la dirección sobrevive sin depender de que el
// servidor esté actualizado. Se valida igual que en el servidor (backend/app/portfolio/sanitize.py:
// safe_image_url): solo https, sin credenciales ni caracteres de control. Un `src` que el
// servidor ya conserve se respeta si pasa la misma validación.
const PREFIJO_IMAGEN = 'img:'

function direccionDeImagenSegura(valor: string | null): string | null {
  if (!valor || valor.length > 2048 || /[\u0000- \u007f\\]/.test(valor)) return null
  try {
    const url = new URL(valor)
    return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? valor : null
  } catch {
    return null
  }
}

/** Se parsea en un documento inerte (nada se carga ni se ejecuta) y, como el HTML empieza con
 *  <body>, un <style> inicial se queda dentro y no se pierde al serializar. */
function conImagenes(html: string, transformar: (img: Element) => void): string {
  if (!/<img[\s>]/i.test(html)) return html
  const doc = new DOMParser().parseFromString(`<body>${html}`, 'text/html')
  doc.querySelectorAll('img').forEach(transformar)
  return doc.body.innerHTML
}

/** Antes de enviar al servidor: la dirección https de cada imagen pasa de `src` a `title`. */
export function guardarImagenesParaEnviar(html: string): string {
  return conImagenes(html, (img) => {
    const direccion = direccionDeImagenSegura(img.getAttribute('src'))
    img.removeAttribute('src')
    if (direccion) img.setAttribute('title', PREFIJO_IMAGEN + encodeURIComponent(direccion))
  })
}

/** Al mostrar lo que devolvió el servidor: la dirección guardada vuelve a ser `src`. */
export function restaurarImagenes(html: string): string {
  return conImagenes(html, (img) => {
    const guardada = img.getAttribute('title')
    if (guardada?.startsWith(PREFIJO_IMAGEN)) {
      img.removeAttribute('title')
      let direccion: string | null = null
      try { direccion = direccionDeImagenSegura(decodeURIComponent(guardada.slice(PREFIJO_IMAGEN.length))) } catch { /* % mal formado */ }
      if (direccion) img.setAttribute('src', direccion)
    } else if (!direccionDeImagenSegura(img.getAttribute('src'))) {
      img.removeAttribute('src')
    }
    img.setAttribute('referrerpolicy', 'no-referrer')
    img.setAttribute('loading', 'lazy')
  })
}

/** Solo recibe el fragmento saneado por FastAPI; nunca la fuente del alumno. */
export function documentoPublicado(html: string): string {
  html = restaurarImagenes(html)
  const css = ANDAMIAJE_CSS.replace(/@import\s+url\([^)]*\)\s*;/gi, '')
  // Solo corre el guion de esta plataforma (con nonce): el HTML del alumno ya viene sin <script>.
  // y solo si hay un carrusel para rotar: sin él, el documento queda sin ningún <script>.
  const rota = /title="rotar:[0-9.]+"/.test(html)
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${rota ? `'nonce-${nonce}'` : "'none'"}; style-src 'unsafe-inline'; img-src https:; font-src 'none'; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'">
<style>${css}</style></head><body>${html}${rota ? `<script nonce="${nonce}">${GUION_CARRUSEL}</script>` : ''}</body></html>`
}

/** Los enlaces funcionan fuera del documento estático, sin un puente de JavaScript. */
export function enlacesDePublicacion(html: string): { texto: string; url: string }[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const vistos = new Set<string>()
  return [...doc.querySelectorAll('a[href]')].flatMap((a) => {
    const url = normalizarEnlace(a.getAttribute('href'))
    if (!esEnlaceExterno(url) || vistos.has(url)) return []
    vistos.add(url)
    return [{ texto: a.textContent?.trim() || url, url }]
  })
}
