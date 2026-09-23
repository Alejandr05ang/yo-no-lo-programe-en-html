// Una sola definición de "a dónde lleva un enlace", compartida por todo lo que la necesita:
// - lib/sandbox.ts, que la aplica a los <a> que genera crearEnlace() antes de devolver el HTML;
// - lib/revisionLocal.ts, que compara contra ella lo que espera cada encargo;
// - la vista previa (hooks/useAbrirEnlaces.ts), que la vuelve a aplicar antes de abrir nada;
// - "Mis datos", que la usa para aceptar "github.com/ana" sin obligar a escribir https://.
//
// POR QUÉ: en HTML, un dominio sin esquema ("wikipedia.com") es una ruta RELATIVA. Dentro de
// la vista previa eso se resolvía contra la dirección de la plataforma y el enlace llevaba a
// "tutoriasdeverano…/wikipedia.com". Para un estudiante, "wikipedia.com" es obviamente un
// sitio externo: se trata como tal.

const EMAIL = /^[^\s@/:?#]+@[^\s@/:?#]+\.[^\s@/:?#]+$/u
// Un dominio con al menos un punto y un final de letras ("wikipedia.com", "www.x.org.ec"),
// con puerto y ruta opcionales. Sin esquema.
const DOMINIO = /^(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+\p{L}{2,}(?::\d{1,5})?(?:[/?#]\S*)?$/u
const ESQUEMA = /^([a-z][a-z0-9+.-]*):/i

function urlValida(texto: string): boolean {
  try {
    return !!new URL(texto).hostname
  } catch {
    return false
  }
}

/**
 * La dirección a la que debe llevar un enlace, o null si no lleva a ningún sitio razonable.
 *
 * - https://… y http://… se conservan tal cual (no se "mejora" ni se degrada lo escrito).
 * - wikipedia.com, www.wikipedia.com → https://…
 * - persona@dominio.com → mailto:persona@dominio.com; mailto: válido se conserva.
 * - #seccion (un ancla dentro de la misma página) se conserva.
 * - javascript:, data:, file: y cualquier otro esquema → null.
 * - vacío, texto con espacios o que no parece una dirección → null.
 *
 * Es idempotente: normalizarEnlace(normalizarEnlace(x)) === normalizarEnlace(x).
 */
export function normalizarEnlace(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const texto = valor.trim()
  if (!texto || /\s/u.test(texto)) return null
  if (texto.startsWith('#')) return texto.length > 1 ? texto : null

  // Antes que el esquema: "github.com:8080/x" empieza con algo que parece un esquema.
  if (DOMINIO.test(texto)) {
    const completa = `https://${texto}`
    return urlValida(completa) ? completa : null
  }
  if (texto.startsWith('//')) return normalizarEnlace(`https:${texto}`)

  const esquema = ESQUEMA.exec(texto)?.[1].toLowerCase()
  if (esquema === 'https' || esquema === 'http') return urlValida(texto) ? texto : null
  if (esquema === 'mailto') {
    const destinatario = texto.slice('mailto:'.length).split('?')[0]
    let decodificado: string
    try {
      decodificado = decodeURIComponent(destinatario)
    } catch {
      return null // un "%" suelto: no es una dirección, y no debe romper la vista previa
    }
    return EMAIL.test(decodificado) ? texto : null
  }
  if (esquema) return null

  if (EMAIL.test(texto)) return `mailto:${texto}`
  return null
}

/** true si la dirección abre algo fuera de la página (web o correo), no un ancla interna. */
export function esEnlaceExterno(destino: string | null): destino is string {
  return !!destino && /^(?:https?:|mailto:)/i.test(destino)
}

/**
 * Para los campos de "Mis datos" (GitHub, LinkedIn): el backend exige una dirección https
 * pública. Se acepta lo que un estudiante escribe de forma natural ("github.com/ana",
 * "http://…") y se devuelve la forma https. '' queda '' (el campo es opcional).
 * Devuelve null si no es una dirección web.
 */
export function normalizarUrlDePerfil(valor: string): string | null {
  const texto = valor.trim()
  if (!texto) return ''
  const destino = normalizarEnlace(texto)
  if (!destino || !/^https?:/i.test(destino)) return null
  const url = new URL(destino)
  url.protocol = 'https:'
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return null
  // Sin usuario/contraseña ni fragmento: el backend los rechaza.
  if (url.username || url.password || url.hash) return null
  return url.toString()
}

/**
 * Aplica normalizarEnlace a cada <a href> de un fragmento HTML (el que devuelve la vista
 * previa). Un href que no lleva a ningún sitio se quita —el texto se sigue viendo, pero no
 * navega a una ruta absurda de la plataforma— y se devuelve como aviso para la consola.
 */
export function normalizarEnlacesDelHtml(html: string, parser: DOMParser): { html: string; avisos: string[] } {
  if (!/<a[\s>]/i.test(html)) return { html, avisos: [] }
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html')
  const avisos: string[] = []
  for (const a of doc.body.querySelectorAll('a[href]')) {
    const original = a.getAttribute('href') ?? ''
    const destino = normalizarEnlace(original)
    if (destino) {
      if (destino !== original) a.setAttribute('href', destino)
    } else {
      a.removeAttribute('href')
      avisos.push(`El enlace "${(a.textContent ?? '').trim()}" no tiene una dirección válida ("${original}"), así que no lleva a ningún sitio.`)
    }
  }
  return { html: doc.body.innerHTML, avisos }
}
