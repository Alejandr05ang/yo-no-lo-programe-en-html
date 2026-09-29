import { ANDAMIAJE_CSS } from './andamiajeEstilos'
import { esEnlaceExterno, normalizarEnlace } from './enlaces'
import { parsearDocumentoJu1 } from './estructuraDePagina'
import { ejecutarPreview, ejecutarPreviewJu1 } from './sandbox'

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
  return result.html
}

/** Solo recibe el fragmento saneado por FastAPI; nunca la fuente del alumno. */
export function documentoPublicado(html: string): string {
  const css = ANDAMIAJE_CSS.replace(/@import\s+url\([^)]*\)\s*;/gi, '')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'">
<style>${css}</style></head><body>${html}</body></html>`
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
