// Traduce el pseudocódigo que el estudiante ESCRIBE (SI…ENTONCES, PARA CADA…HACER,
// MIENTRAS…HACER, FUNCIÓN…) a JavaScript real, para poder correrlo en el sandbox
// (lib/sandbox.ts) y revisarlo (lib/revisionLocal.ts) — ninguno de los dos cambia: siguen
// recibiendo JS, tal como antes.
//
// POR QUÉ: para un estudiante de primer ciclo, "()" y "{}" en el control de flujo son
// fricción pura — la misma estructura sin esos símbolos (palabras clave que abren y cierran,
// como PSeInt) es más fácil de escribir y de leer en voz alta. Las LLAMADAS a funciones
// (mostrar(x), crearParrafo(x)…) siguen siendo JS real tal cual: ahí "()" ya tiene sentido
// (son argumentos), no es lo que generaba fricción.
//
// Mismo vocabulario que ya se usa para EXPLICAR el código (lib/flujo.ts, que traduce en la
// dirección contraria — JS real a pseudocódigo, para las fichas de ayuda y el diagrama de
// flujo): es la única forma en que "SI … ENTONCES" significa lo mismo en toda la app.
//
// DISEÑO CLAVE: la traducción es línea por línea, 1 a 1 — cada línea de pseudocódigo produce
// EXACTAMENTE una línea de JS (nunca más, nunca menos). Así el número de línea de un error de
// ejecución en el JS traducido es el MISMO número de línea del pseudocódigo que el estudiante
// ve en el editor, sin necesitar un mapa de líneas aparte.
//
// MEZCLAS: quien ya sabe JavaScript puede escribir if/for/while/function con llaves, y eso
// sigue funcionando, incluso dentro de un bloque de pseudocódigo o al revés. Lo que no se
// puede es abrir un bloque con una sintaxis y cerrarlo con la otra. Para detectarlo, UNA sola
// pila sigue a la vez los bloques de pseudocódigo y las llaves reales de JS; las llaves se
// encuentran con el tokenizador de acorn (el mismo parser que usa lib/flujo.ts), así que una
// llave dentro de un texto, un comentario o una plantilla no se confunde con un bloque. No
// hay reemplazos de texto: el pseudocódigo se reconoce línea a línea y el resto se deja tal cual.

import { parse, tokenizer, tokTypes } from 'acorn'

export interface ResultadoTraduccion {
  ok: boolean
  js: string
  error?: { mensaje: string; linea?: number }
}

type TipoBloque = 'si' | 'para' | 'mientras' | 'funcion'

const NOMBRE_APERTURA: Record<TipoBloque, string> = {
  si: 'SI … ENTONCES',
  para: 'PARA CADA … HACER',
  mientras: 'MIENTRAS … HACER',
  funcion: 'FUNCIÓN …(…)',
}
const NOMBRE_CIERRE: Record<TipoBloque, string> = {
  si: 'FIN SI',
  para: 'FIN PARA',
  mientras: 'FIN MIENTRAS',
  funcion: 'FIN FUNCIÓN',
}

// Case-insensitive y tolerante a "FUNCION"/"FUNCIÓN": el estudiante no tiene por qué acordarse
// de escribir todo en mayúsculas ni de la tilde.
// Cada línea admite un comentario "// …" al final, como los que traen los andamiajes: se
// conserva en el JS (último grupo) para que la traducción siga siendo 1 a 1.
const RE_SINO_SI = /^(\s*)sino\s+si\s+(.+?)\s+entonces\s*(\/\/.*)?$/i
const RE_SI = /^(\s*)si\s+(.+?)\s+entonces\s*(\/\/.*)?$/i
const RE_SINO = /^(\s*)sino\s*(\/\/.*)?$/i
const RE_FIN_SI = /^(\s*)fin\s*si\s*(\/\/.*)?$/i
// Los nombres (la variable del PARA CADA, la función) pueden llevar tildes y ñ, como en JS:
// "PARA CADA año EN años HACER" es tan válido como "for (const año of años)".
const RE_PARA = /^(\s*)para\s+cada\s+([\p{ID_Start}$_][\p{ID_Continue}$\u200C\u200D]*)\s+en\s+(.+?)\s+hacer\s*(\/\/.*)?$/iu
const RE_FIN_PARA = /^(\s*)fin\s*para\s*(\/\/.*)?$/i
const RE_MIENTRAS = /^(\s*)mientras\s+(.+?)\s+hacer\s*(\/\/.*)?$/i
const RE_FIN_MIENTRAS = /^(\s*)fin\s*mientras\s*(\/\/.*)?$/i
const RE_FUNCION = /^(\s*)funci[oó]n\s+([\p{ID_Start}$_][\p{ID_Continue}$\u200C\u200D]*)\s*\(([^)]*)\)\s*(\/\/.*)?$/iu
const RE_FIN_FUNCION = /^(\s*)fin\s*funci[oó]n\s*(\/\/.*)?$/i

/** El comentario final de la línea (último grupo de la expresión), para copiarlo al JS. */
function comentario(m: RegExpMatchArray): string {
  const c = m[m.length - 1]
  return c ? ` ${c}` : ''
}

// Qué hace cada línea de pseudocódigo con la pila de bloques.
type Marca =
  | { tipo: 'abre'; bloque: TipoBloque }
  | { tipo: 'rama'; siTambien: boolean } // SINO / SINO SI
  | { tipo: 'cierra'; bloque: TipoBloque }

interface LineaTraducida {
  js: string
  marca: Marca | null
}

function traducirLinea(linea: string): LineaTraducida {
  // Un salto de línea de Windows (\r\n) deja un "\r" al final de cada línea: no es parte de
  // lo escrito, así que se aparta para reconocer la línea (con su comentario final) y se
  // devuelve tal cual.
  if (linea.endsWith('\r')) {
    const t = traducirContenido(linea.slice(0, -1))
    return { js: `${t.js}\r`, marca: t.marca }
  }
  return traducirContenido(linea)
}

function traducirContenido(linea: string): LineaTraducida {
  let m: RegExpMatchArray | null
  if ((m = linea.match(RE_SINO_SI))) return { js: `${m[1]}} else if (${m[2]}) {${comentario(m)}`, marca: { tipo: 'rama', siTambien: true } }
  if ((m = linea.match(RE_SI))) return { js: `${m[1]}if (${m[2]}) {${comentario(m)}`, marca: { tipo: 'abre', bloque: 'si' } }
  if ((m = linea.match(RE_SINO))) return { js: `${m[1]}} else {${comentario(m)}`, marca: { tipo: 'rama', siTambien: false } }
  if ((m = linea.match(RE_FIN_SI))) return { js: `${m[1]}}${comentario(m)}`, marca: { tipo: 'cierra', bloque: 'si' } }
  if ((m = linea.match(RE_PARA))) return { js: `${m[1]}for (const ${m[2]} of ${m[3]}) {${comentario(m)}`, marca: { tipo: 'abre', bloque: 'para' } }
  if ((m = linea.match(RE_FIN_PARA))) return { js: `${m[1]}}${comentario(m)}`, marca: { tipo: 'cierra', bloque: 'para' } }
  if ((m = linea.match(RE_MIENTRAS))) return { js: `${m[1]}while (${m[2]}) {${comentario(m)}`, marca: { tipo: 'abre', bloque: 'mientras' } }
  if ((m = linea.match(RE_FIN_MIENTRAS))) return { js: `${m[1]}}${comentario(m)}`, marca: { tipo: 'cierra', bloque: 'mientras' } }
  if ((m = linea.match(RE_FUNCION))) return { js: `${m[1]}function ${m[2]}(${m[3]}) {${comentario(m)}`, marca: { tipo: 'abre', bloque: 'funcion' } }
  if ((m = linea.match(RE_FIN_FUNCION))) return { js: `${m[1]}}${comentario(m)}`, marca: { tipo: 'cierra', bloque: 'funcion' } }
  // Cualquier otra línea es JS real tal cual: const, llamadas a función, comentarios, líneas
  // vacías, y también if/for/while/function con llaves para quien ya sabe JavaScript.
  return { js: linea, marca: null }
}

/**
 * Una línea que EMPIEZA como pseudocódigo pero no termina como tal (por ejemplo
 * "SI x > 1 ENTONCES {" o "PARA CADA x EN lista {"): JS no la entiende y el motor diría algo
 * como "Unexpected identifier". Se explica la mezcla en su lugar.
 */
function mezclaEnLaLinea(linea: string): string | null {
  const t = linea.replace(/\r$/, '').replace(/\s*\/\/.*$/, '').trim()
  // ¿Empieza la línea con esa palabra usada como PALABRA CLAVE? "si: 1", "sino = 2",
  // "sino.push(x)", "mientras[0]" o "si + 1" usan el mismo texto como NOMBRE de variable o de
  // propiedad (detrás viene un signo u operador): eso no es una mezcla, y señalarlo mandaría al
  // estudiante a la línea equivocada cuando el error de verdad está en otra parte.
  const clave = (re: RegExp): boolean => {
    const m = re.exec(t)
    return !!m && !COMO_NOMBRE.test(t.slice(m[0].length))
  }
  const entonces = /\bentonces\b/i.test(t)
  const hacer = /\bhacer\b/i.test(t)
  const llave = t.endsWith('{')
  // Pseudocódigo al que le falta su palabra de cierre (y no lleva llaves): es un olvido, no
  // una mezcla.
  if (clave(/^(?:sino\s+)?si(?=\s+[^\s(\[])/iu) && !entonces && !llave) return 'Te falta "ENTONCES" al final de esta línea: SI condición ENTONCES.'
  if (/^para\s+cada\s/i.test(t) && !hacer && !llave) return 'Te falta "HACER" al final de esta línea: PARA CADA elemento EN lista HACER.'
  if (clave(/^mientras(?=\s+[^\s(\[])/iu) && !hacer && !llave) return 'Te falta "HACER" al final de esta línea: MIENTRAS condición HACER.'
  if (/^sino\s+si\b/i.test(t)) return 'Esta línea mezcla pseudocódigo y JavaScript. Escribe "SINO SI condición ENTONCES", sin llaves; o, en JavaScript, "} else if (condición) {".'
  if (clave(/^si(?![\p{ID_Continue}$])/iu) && (entonces || llave)) return 'Esta línea mezcla pseudocódigo y JavaScript. Escribe "SI condición ENTONCES", sin llaves ni paréntesis obligatorios; o, en JavaScript, "if (condición) {".'
  if (/^para\s+cada\b/i.test(t)) return 'Esta línea mezcla pseudocódigo y JavaScript. Escribe "PARA CADA elemento EN lista HACER", sin llaves; o, en JavaScript, "for (const elemento of lista) {".'
  if (clave(/^mientras(?![\p{ID_Continue}$])/iu) && (hacer || llave)) return 'Esta línea mezcla pseudocódigo y JavaScript. Escribe "MIENTRAS condición HACER", sin llaves; o, en JavaScript, "while (condición) {".'
  if (/^funci[oó]n\s+[\p{ID_Start}$_]/iu.test(t)) return 'Esta línea mezcla pseudocódigo y JavaScript. Escribe "FUNCIÓN nombre(entrada)", sin llaves; o, en JavaScript, "function nombre(entrada) {".'
  if (clave(/^fin\s*(?:si|para|mientras|funci[oó]n)(?![\p{ID_Continue}$])/iu)) return 'Esta línea mezcla pseudocódigo y JavaScript: un "FIN …" va solo en su línea, sin llaves ni nada más.'
  if (clave(/^sino(?![\p{ID_Continue}$])/iu)) return 'Esta línea mezcla pseudocódigo y JavaScript: "SINO" va solo en su línea; o, en JavaScript, "} else {".'
  return null
}

/** Lo que puede venir detrás de un NOMBRE (y no de una palabra clave): "=", ".", ":", ",",
 *  "?", "[", "]" o un operador ("!=", "+=", "++", "&&", "+ 1"…). Una llave, un ";" o un ")"
 *  no cuentan: "FIN SI }" o "SINO;" son mezclas de verdad. */
const COMO_NOMBRE = /^\s*(?:[=.:,?[\]]|!=|[-+*/%&|^<>]=|\+\+|--|&&|\|\||[-+*/%<>&|^]\s)/u

/** Cómo se llama, para el estudiante, el bloque de JS que abre una línea. */
function aperturaJs(linea: string): string {
  const t = linea.trim()
  if (/^\}?\s*else\s+if\b/.test(t)) return '} else if (…) {'
  if (/^\}?\s*else\b/.test(t)) return '} else {'
  if (/^if\b/.test(t)) return 'if (…) {'
  if (/^for\b/.test(t)) return 'for (…) {'
  if (/^while\b/.test(t)) return 'while (…) {'
  if (/^(async\s+)?function\b/.test(t)) return 'function …(…) {'
  return t.length > 32 ? `${t.slice(0, 31)}…` : t
}

type Entrada =
  | { tipo: 'pseudo'; bloque: TipoBloque; linea: number }
  | { tipo: 'js'; linea: number; apertura: string }
  | { tipo: 'plantilla'; linea: number }

type Llave = 'abre' | 'cierra' | 'plantilla'

/** Para ubicar tokens por línea contando SOLO "\n", como el editor (acorn también cuenta
 *  U+2028/U+2029 como salto, y eso descolocaba las líneas si el texto traía uno pegado). */
function lineaDeOffset(js: string): (pos: number) => number {
  const inicios = [0]
  for (let k = 0; k < js.length; k++) if (js[k] === '\n') inicios.push(k + 1)
  return (pos) => {
    let lo = 0
    let hi = inicios.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (inicios[mid] <= pos) lo = mid
      else hi = mid - 1
    }
    return lo
  }
}

/**
 * Las líneas cuyo PRIMER token es un nombre (donde puede empezar una sentencia como "SI …").
 * Deja fuera comentarios, el interior de textos y plantillas de varias líneas. Si el
 * tokenizador se detiene antes del final, las líneas que no llegó a leer se incluyen.
 */
function lineasQueEmpiezanConNombre(js: string): { lineas: Set<number>; desde: number } {
  const lineaDe = lineaDeOffset(js)
  const lineas = new Set<number>()
  const vistas = new Set<number>()
  let hasta = js.length
  try {
    for (const t of tokenizer(js, { ecmaVersion: 'latest', allowHashBang: true })) {
      const linea = lineaDe(t.start)
      if (vistas.has(linea)) continue
      vistas.add(linea)
      if (t.type === tokTypes.name) lineas.add(linea)
    }
  } catch (e) {
    hasta = typeof (e as { pos?: unknown }).pos === 'number' ? (e as { pos: number }).pos : 0
  }
  return { lineas, desde: lineaDe(hasta) }
}

/**
 * Las líneas que EMPIEZAN dentro de un comentario de bloque, una plantilla `…` o un texto
 * partido en varias líneas. No son código: aunque parezcan pseudocódigo ("FIN SI" en un
 * bloque comentado con /* … *\/, "SI te gusta, ENTONCES…" en una plantilla) no se traducen ni
 * abren o cierran bloques. Si el tokenizador se detiene antes del final, lo que no llegó a
 * leer se trata como código, igual que antes.
 */
function lineasDentroDeTextos(js: string): Set<number> {
  const inicios = [0]
  for (let k = 0; k < js.length; k++) if (js[k] === '\n') inicios.push(k + 1)
  const tramos: [number, number][] = []
  try {
    const tokens = tokenizer(js, {
      ecmaVersion: 'latest',
      allowHashBang: true,
      onComment: (bloque, _texto, inicio, fin) => {
        if (bloque) tramos.push([inicio, fin])
      },
    })
    for (const t of tokens) {
      if (t.type === tokTypes.template || t.type === tokTypes.invalidTemplate || t.type === tokTypes.string) {
        tramos.push([t.start, t.end])
      }
    }
  } catch {
    /* ver arriba: el resto se sigue tratando como código */
  }
  const dentro = new Set<number>()
  for (const [inicio, fin] of tramos) {
    for (let i = 1; i < inicios.length; i++) {
      if (inicios[i] > inicio && inicios[i] < fin) dentro.add(i)
    }
  }
  return dentro
}

/** Las llaves reales de cada línea del JS traducido (fuera de textos, comentarios y regex). */
function llavesPorLinea(js: string, lineas: number): Llave[][] | null {
  const porLinea: Llave[][] = Array.from({ length: lineas }, () => [])
  const lineaDe = lineaDeOffset(js)
  try {
    for (const t of tokenizer(js, { ecmaVersion: 'latest', allowHashBang: true })) {
      const tipo = t.type === tokTypes.braceL ? 'abre' : t.type === tokTypes.braceR ? 'cierra' : t.type === tokTypes.dollarBraceL ? 'plantilla' : null
      if (tipo) porLinea[lineaDe(t.start)]?.push(tipo)
    }
  } catch {
    // Un texto sin cerrar, un carácter inválido… Eso lo explica el motor al ejecutar; aquí no
    // se puede seguir la estructura con garantías, así que no se inventa un diagnóstico.
    return null
  }
  return porLinea
}

function errorEn(linea: number, mensaje: string): ResultadoTraduccion {
  return { ok: false, js: '', error: { mensaje, linea } }
}

/**
 * Recorre la estructura del programa con una sola pila y devuelve el primer choque entre la
 * forma en que se abrió un bloque y la forma en que se cierra, o null si todo cuadra.
 */
function revisarEstructura(original: string[], traducidas: LineaTraducida[], llaves: Llave[][]): ResultadoTraduccion | null {
  const pila: Entrada[] = []
  const tope = () => pila[pila.length - 1]

  // Cierra con "}" un bloque de JS (o el `${…}` de una plantilla).
  const cerrarLlave = (numero: number, lineaOriginal: string): ResultadoTraduccion | null => {
    const arriba = tope()
    if (!arriba) return errorEn(numero, 'Esta "}" está de más: no cierra ningún bloque abierto.')
    if (arriba.tipo === 'pseudo') {
      if (arriba.bloque === 'si' && /^\}\s*else\s+if\b/.test(lineaOriginal.trim())) {
        return errorEn(numero, `Abriste este bloque con "SI … ENTONCES" en la línea ${arriba.linea}: para otra condición escribe "SINO SI condición ENTONCES" (y ciérralo con "FIN SI").`)
      }
      if (arriba.bloque === 'si' && /^\}\s*else\b/.test(lineaOriginal.trim())) {
        return errorEn(numero, `Abriste este bloque con "SI … ENTONCES" en la línea ${arriba.linea}: para la otra rama escribe "SINO" (y ciérralo con "FIN SI").`)
      }
      return errorEn(numero, `Abriste este bloque con "${NOMBRE_APERTURA[arriba.bloque]}" en la línea ${arriba.linea}; ciérralo con "${NOMBRE_CIERRE[arriba.bloque]}", no con "}".`)
    }
    pila.pop()
    return null
  }

  for (let i = 0; i < traducidas.length; i++) {
    const numero = i + 1
    const { marca } = traducidas[i]
    const suyas = [...llaves[i]]
    // Tras un SINO el bloque sigue siendo el del SI: los mensajes apuntan a su línea.
    let lineaDelSi = numero

    if (!marca) {
      for (const llave of suyas) {
        if (llave === 'abre') pila.push({ tipo: 'js', linea: numero, apertura: aperturaJs(original[i]) })
        else if (llave === 'plantilla') pila.push({ tipo: 'plantilla', linea: numero })
        else {
          const err = cerrarLlave(numero, original[i])
          if (err) return err
        }
      }
      continue
    }

    // Las llaves que escribió la traducción (la primera "}" de un cierre o de una rama, la
    // última "{" de una apertura o de una rama) representan el bloque de pseudocódigo; las
    // demás de la línea son del JS de la condición y se tratan como tal.
    if (marca.tipo === 'cierra' || marca.tipo === 'rama') {
      suyas.shift()
      const arriba = tope()
      const bloque = marca.tipo === 'cierra' ? marca.bloque : 'si'
      const palabra = marca.tipo === 'cierra' ? NOMBRE_CIERRE[marca.bloque] : marca.siTambien ? 'SINO SI' : 'SINO'
      if (!arriba) {
        return errorEn(numero, marca.tipo === 'cierra'
          ? `"${palabra}" está de más aquí: no hay ningún ${NOMBRE_APERTURA[bloque]} abierto.`
          : `Este "${palabra}" no tiene un "SI … ENTONCES" abierto al que responder.`)
      }
      if (arriba.tipo === 'js' || arriba.tipo === 'plantilla') {
        const apertura = arriba.tipo === 'js' ? arriba.apertura : '${'
        if (marca.tipo === 'rama' && arriba.tipo === 'js' && /^(\} else )?(else )?if \(/.test(apertura)) {
          return errorEn(numero, `Abriste este bloque con "${apertura}" en la línea ${arriba.linea}: para la otra rama escribe "} else {" en vez de "${palabra}".`)
        }
        const hayPseudoDebajo = pila.some((e) => e.tipo === 'pseudo' && e.bloque === bloque)
        return errorEn(numero, hayPseudoDebajo
          ? `Abriste un bloque con "${apertura}" en la línea ${arriba.linea}; ciérralo con "}" antes del "${palabra}".`
          : `Abriste este bloque con "${apertura}" en la línea ${arriba.linea}; ciérralo con "}", no con "${palabra}".`)
      }
      if (arriba.bloque !== bloque) {
        return errorEn(numero, marca.tipo === 'cierra'
          ? `Aquí esperaba "${NOMBRE_CIERRE[arriba.bloque]}": todavía no cierras el ${NOMBRE_APERTURA[arriba.bloque]} que abriste en la línea ${arriba.linea}.`
          : `Este "${palabra}" no tiene un "SI … ENTONCES" abierto al que responder: antes cierra el ${NOMBRE_APERTURA[arriba.bloque]} de la línea ${arriba.linea} con "${NOMBRE_CIERRE[arriba.bloque]}".`)
      }
      lineaDelSi = arriba.linea
      pila.pop()
    }

    const reabre = marca.tipo === 'abre' || marca.tipo === 'rama'
    if (reabre) suyas.pop()
    // Llaves de la condición (un objeto, una plantilla…): se abren y cierran en la línea.
    for (const llave of suyas) {
      if (llave === 'abre') pila.push({ tipo: 'js', linea: numero, apertura: aperturaJs(original[i]) })
      else if (llave === 'plantilla') pila.push({ tipo: 'plantilla', linea: numero })
      else {
        const err = cerrarLlave(numero, original[i])
        if (err) return err
      }
    }
    if (marca.tipo === 'abre') pila.push({ tipo: 'pseudo', bloque: marca.bloque, linea: numero })
    if (marca.tipo === 'rama') pila.push({ tipo: 'pseudo', bloque: 'si', linea: lineaDelSi })
  }

  const abierto = tope()
  if (!abierto) return null
  if (abierto.tipo === 'pseudo') {
    return errorEn(abierto.linea, `Te falta "${NOMBRE_CIERRE[abierto.bloque]}" para este ${NOMBRE_APERTURA[abierto.bloque]}.`)
  }
  if (abierto.tipo === 'js') {
    return errorEn(abierto.linea, `Te falta cerrar con "}" el bloque "${abierto.apertura}" que abriste en esta línea.`)
  }
  return null
}

function esJsValido(js: string): boolean {
  try {
    parse(js, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: false })
    return true
  } catch {
    return false
  }
}

export function aJavaScript(pseudocodigo: string): ResultadoTraduccion {
  const original = pseudocodigo.split('\n')
  const traducidas = original.map(traducirLinea)
  // Lo que queda dentro de un comentario de bloque o de un texto no se traduce. Deshacer una
  // línea no cambia dónde empiezan o acaban los demás comentarios y textos (la traducción solo
  // quita palabras clave y añade paréntesis y llaves), pero se repite hasta que nada cambie.
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    let cambio = false
    for (const i of lineasDentroDeTextos(traducidas.map((t) => t.js).join('\n'))) {
      if (traducidas[i].marca) {
        traducidas[i] = { js: original[i], marca: null }
        cambio = true
      }
    }
    if (!cambio) break
  }
  const tienePseudo = traducidas.some((t) => t.marca)
  const js = traducidas.map((t) => t.js).join('\n')
  const valido = esJsValido(js)

  // Líneas que empiezan como pseudocódigo pero no lo son. Solo si el programa no es JS válido
  // (una mezcla real nunca lo es), y solo en líneas cuyo primer token es un nombre: así un
  // comentario "/* Para cada red… */", un texto de varias líneas o una clave "si:" de un
  // objeto no se confunden con una sentencia.
  if (!valido) {
    const { lineas, desde } = lineasQueEmpiezanConNombre(js)
    for (let i = 0; i < original.length; i++) {
      if (traducidas[i].marca || (!lineas.has(i) && i < desde)) continue
      const mezcla = mezclaEnLaLinea(original[i])
      if (mezcla) return errorEn(i + 1, mezcla)
    }
  }

  const llaves = llavesPorLinea(js, original.length)
  if (llaves) {
    const error = revisarEstructura(original, traducidas, llaves)
    // JavaScript puro que el parser acepta se ejecuta tal cual: el diagnóstico solo sirve para
    // explicar mejor un error que JS de todas formas tendría, nunca para bloquear código válido.
    if (error && (tienePseudo || !valido)) return error
  } else if (tienePseudo) {
    // Sin tokens fiables, al menos la estructura del pseudocódigo por sí sola.
    const soloPseudo = revisarEstructura(original, traducidas, traducidas.map((t) => (
      t.marca?.tipo === 'abre' ? ['abre'] : t.marca?.tipo === 'cierra' ? ['cierra'] : t.marca?.tipo === 'rama' ? ['cierra', 'abre'] : []
    )))
    if (soloPseudo) return soloPseudo
  }

  return { ok: true, js }
}
