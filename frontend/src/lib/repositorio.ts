import { ANDAMIAJE_CSS } from './andamiajeEstilos'
import { crearZip } from './zip'
import { aJavaScript } from './pseudocodigoAJS'
import { parsearDocumentoJu1 } from './estructuraDePagina'
import { ejecutarPreview, ejecutarPreviewJu1 } from './sandbox'
import { extraerLogica, type UnidadCodigo } from './traduccionReal'
import type { FuentePublicacion } from './publicacion'

// Convierte la vista previa (el HTML ya saneado que genera el código del taller: mostrar(),
// agregarA(), crearTitulo()…) en un mini repositorio estático listo para subir a GitHub Pages:
// index.html + styles.css + script.js. Las funciones del taller desaparecen: lo que queda es el
// HTML y el CSS "de verdad" que esas funciones produjeron.

export interface ArchivosRepositorio { 'index.html': string; 'styles.css': string; 'script.js': string }

const FUENTES = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Lora:wght@400;600&family=Inter:wght@400;600&family=Caveat:wght@400;600&display=swap'
const VACIOS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])
const EN_LINEA = new Set(['a', 'abbr', 'b', 'button', 'code', 'em', 'i', 'img', 'small', 'span', 'strong', 'sub', 'sup', 'u', 'br'])

const escaparTexto = (texto: string) => texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escaparAtributo = (texto: string) => escaparTexto(texto).replace(/"/g, '&quot;')

/** "Mi portafolio" → "mi-portafolio" para el nombre del .zip. */
export function nombreDeArchivo(titulo: string): string {
  const base = titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return base || 'mi-sitio'
}

/** Pasa cada style="…" a una clase con nombre propio, para que el HTML quede limpio y el
 *  diseño viva en styles.css, como en un sitio escrito a mano. Estilos iguales comparten clase. */
function extraerEstilosEnLinea(raiz: Element): string {
  const clases = new Map<string, string>()
  for (const el of raiz.querySelectorAll('[style]')) {
    const estilo = (el.getAttribute('style') ?? '').trim().replace(/;$/, '')
    el.removeAttribute('style')
    if (!estilo) continue
    let clase = clases.get(estilo)
    if (!clase) { clase = `estilo-${clases.size + 1}`; clases.set(estilo, clase) }
    el.classList.add(clase)
  }
  if (clases.size === 0) return ''
  const reglas = [...clases].map(([estilo, clase]) => `.${clase} {\n${estilo.split(/;\s*/).filter(Boolean).map((d) => `  ${d};`).join('\n')}\n}`)
  return `\n/* Estilos propios de tu página */\n${reglas.join('\n\n')}\n`
}

function serializar(nodo: Node, nivel: number, salida: string[]): void {
  const sangria = '  '.repeat(nivel)
  if (nodo.nodeType === Node.TEXT_NODE) {
    const texto = (nodo.textContent ?? '').trim()
    if (texto) salida.push(sangria + escaparTexto(texto))
    return
  }
  if (nodo.nodeType !== Node.ELEMENT_NODE) return
  const el = nodo as Element
  const tag = el.tagName.toLowerCase()
  const atributos = [...el.attributes].map((a) => ` ${a.name}="${escaparAtributo(a.value)}"`).join('')
  if (VACIOS.has(tag)) { salida.push(`${sangria}<${tag}${atributos}>`); return }
  const hijos = [...el.childNodes]
  const soloEnLinea = hijos.every((h) => h.nodeType === Node.TEXT_NODE || (h.nodeType === Node.ELEMENT_NODE && EN_LINEA.has((h as Element).tagName.toLowerCase())))
  if (soloEnLinea) {
    salida.push(`${sangria}<${tag}${atributos}>${hijos.map((h) => (h.nodeType === Node.TEXT_NODE ? escaparTexto(h.textContent ?? '') : (h as Element).outerHTML)).join('').trim()}</${tag}>`)
    return
  }
  salida.push(`${sangria}<${tag}${atributos}>`)
  for (const hijo of hijos) serializar(hijo, nivel + 1, salida)
  salida.push(`${sangria}</${tag}>`)
}

/** Los enlaces externos se abren en otra pestaña, como en la vista previa del taller. */
function endurecerEnlaces(raiz: Element): void {
  for (const a of raiz.querySelectorAll('a[href]')) {
    if (/^https?:\/\//i.test(a.getAttribute('href') ?? '')) {
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
    }
  }
}

/** El HTML puede venir de una segunda ejecución del programa (sin pasar por el saneador del
 *  servidor): se quita todo lo que ejecute código, igual que hace la publicación. */
function quitarCodigoActivo(raiz: Element): void {
  for (const el of [...raiz.querySelectorAll('*')]) {
    for (const atributo of [...el.attributes]) {
      const valor = atributo.value.trim().toLowerCase()
      if (atributo.name.startsWith('on') || ((atributo.name === 'href' || atributo.name === 'src') && valor.startsWith('javascript:'))) el.removeAttribute(atributo.name)
    }
  }
}

const CSS_RESPONSIVO = `
/* Diseño adaptable: la página se ve bien en celular, tableta y computador. */
img, video, iframe { max-width: 100%; height: auto; }
html { -webkit-text-size-adjust: 100%; }
@media (max-width: 900px) {
  .grid-3 { grid-template-columns: repeat(2, 1fr); }
}
`

export interface LogicaRepositorio { script: string; datos?: unknown }

export function construirRepositorio(titulo: string, snapshotHtml: string, logica?: LogicaRepositorio): ArchivosRepositorio {
  const doc = new DOMParser().parseFromString(`<!doctype html><html><body>${snapshotHtml}</body></html>`, 'text/html')
  const cuerpo = doc.body

  // <style> que generó la página (p. ej. el color de fondo): pasan a styles.css.
  const bloques: string[] = []
  for (const estilo of [...cuerpo.querySelectorAll('style')]) {
    bloques.push((estilo.textContent ?? '').trim())
    estilo.remove()
  }
  for (const script of [...cuerpo.querySelectorAll('script')]) script.remove()

  // Secciones marcadas con generarEncabezado()/generarFooter() → etiquetas semánticas.
  for (const [clase, etiqueta] of [['rol-encabezado', 'header'], ['rol-pie', 'footer']] as const) {
    for (const el of [...cuerpo.querySelectorAll('.' + clase)]) {
      const nuevo = doc.createElement(etiqueta)
      for (const atributo of [...el.attributes]) nuevo.setAttribute(atributo.name, atributo.value)
      nuevo.classList.remove(clase)
      if (!nuevo.getAttribute('class')) nuevo.removeAttribute('class')
      nuevo.append(...el.childNodes)
      el.replaceWith(nuevo)
    }
  }

  quitarCodigoActivo(cuerpo)
  endurecerEnlaces(cuerpo)
  const claseExtra = extraerEstilosEnLinea(cuerpo)

  const lineas: string[] = []
  for (const hijo of cuerpo.childNodes) serializar(hijo, 2, lineas)

  const css = ANDAMIAJE_CSS.replace(/@import\s+url\([^)]*\)\s*;/gi, '').trim()
  const styles = `${css}\n${CSS_RESPONSIVO}${bloques.length ? `\n/* Ajustes de tu página */\n${bloques.join('\n')}\n` : ''}${claseExtra}`

  const index = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escaparTexto(titulo)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="${FUENTES}">
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
${lineas.join('\n')}
    <script src="script.js"></script>
  </body>
</html>
`

  const encabezado = `// script.js — la lógica de tu página: lo que pasa DESPUÉS de que carga.
// El contenido que se ve está en index.html y el diseño en styles.css.
`
  const script = logica
    ? `${encabezado}${logica.datos !== undefined ? `
// Tus datos (los que escribiste en "Mis datos").
const datos = ${JSON.stringify(logica.datos, null, 2)};
` : ''}
${logica.script}
`
    : `${encabezado}//
// Esta página no necesita lógica todavía. Puedes buscar elementos con
// document.querySelector(...) y reaccionar a eventos (clics, teclado, etc.).
//
// Ejemplo: descomenta para mostrar un mensaje en la consola del navegador (F12).
// console.log('Mi página cargó correctamente');
`
  return { 'index.html': index, 'styles.css': styles, 'script.js': script }
}

/** Corre el programa del alumno otra vez para separar contenido (HTML) y lógica (JS). Si algo
 *  falla, el repositorio sale igual con el HTML de la vista previa y un script.js base. */
export async function prepararRepositorio(source: FuentePublicacion, titulo: string, snapshotHtml: string): Promise<ArchivosRepositorio> {
  try {
    let grid = false
    try {
      const v: unknown = JSON.parse(source.draft_code)
      grid = !!v && typeof v === 'object' && 'version' in v && v.version === 1 && 'estructura' in v && 'secciones' in v
    } catch { /* un solo archivo */ }

    const traducir = (js: string) => { const t = aJavaScript(js); if (!t.ok) throw new Error('pseudocódigo'); return t.js }
    let unidades: UnidadCodigo[]
    const doc = grid ? parsearDocumentoJu1(source.draft_code) : null
    if (doc) {
      const enCuadricula = new Set(doc.estructura.celdas.flatMap((c) => (c.seccion ? [c.seccion] : [])))
      unidades = [
        ...doc.secciones.filter((s) => enCuadricula.has(s.nombre)).map((s) => ({ nombre: `seccion-${s.nombre}.js`, js: traducir(s.contenido), tipo: 'seccion' as const, seccion: s.nombre })),
        { nombre: 'portafolio.js', js: traducir(doc.main), tipo: 'main' as const },
      ]
    } else {
      unidades = [{ nombre: 'portafolio.js', js: traducir(source.draft_code), tipo: 'unico' }]
    }

    const logica = extraerLogica(unidades)
    // Siempre se corre el programa otra vez (no se usa el HTML saneado de la publicación): ese
    // descarta imágenes con direcciones que no son https y todo lo que no se publica. El .zip es
    // del propio alumno y se abre fuera de la plataforma, así que lleva la página completa.
    const ejecutable = (nombre: string, original: string) => (logica.hayLogica ? logica.ejecutables.get(nombre) ?? original : original)
    const resultado = doc
      ? await ejecutarPreviewJu1({ ...doc, secciones: doc.secciones.map((s) => ({ nombre: s.nombre, contenido: ejecutable(`seccion-${s.nombre}.js`, s.contenido) })), main: ejecutable('portafolio.js', doc.main) }, source.datos)
      : await ejecutarPreview(ejecutable('portafolio.js', source.draft_code), source.datos)
    if (!resultado.ok) return construirRepositorio(titulo, snapshotHtml)
    return construirRepositorio(titulo, resultado.html, logica.hayLogica ? { script: logica.script, ...(logica.usaDatos ? { datos: source.datos } : {}) } : undefined)
  } catch {
    return construirRepositorio(titulo, snapshotHtml)
  }
}

export function archivosComoZip(archivos: ArchivosRepositorio): Blob {
  const zip = crearZip(Object.entries(archivos).map(([nombre, contenido]) => ({ nombre, contenido })))
  return new Blob([zip.buffer as ArrayBuffer], { type: 'application/zip' })
}

export async function descargarRepositorio(source: FuentePublicacion, titulo: string, snapshotHtml: string): Promise<void> {
  const url = URL.createObjectURL(archivosComoZip(await prepararRepositorio(source, titulo, snapshotHtml)))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `${nombreDeArchivo(titulo)}.zip`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
