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
const RE_SINO_SI = /^(\s*)sino\s+si\s+(.+?)\s+entonces\s*$/i
const RE_SI = /^(\s*)si\s+(.+?)\s+entonces\s*$/i
const RE_SINO = /^(\s*)sino\s*$/i
const RE_FIN_SI = /^(\s*)fin\s*si\s*$/i
const RE_PARA = /^(\s*)para\s+cada\s+([a-zA-Z_$][\w$]*)\s+en\s+(.+?)\s+hacer\s*$/i
const RE_FIN_PARA = /^(\s*)fin\s*para\s*$/i
const RE_MIENTRAS = /^(\s*)mientras\s+(.+?)\s+hacer\s*$/i
const RE_FIN_MIENTRAS = /^(\s*)fin\s*mientras\s*$/i
const RE_FUNCION = /^(\s*)funci[oó]n\s+([a-zA-Z_$][\w$]*)\s*\(([^)]*)\)\s*$/i
const RE_FIN_FUNCION = /^(\s*)fin\s*funci[oó]n\s*$/i

function errorEn(linea: number, mensaje: string): ResultadoTraduccion {
  return { ok: false, js: '', error: { mensaje, linea } }
}

/** Saca el bloque abierto más reciente y confirma que sea del tipo que este cierre espera.
 *  Devuelve el mensaje de error para esa línea, o null si cerró bien. */
function cerrarBloque(
  pila: { tipo: TipoBloque; linea: number }[],
  esperado: TipoBloque,
  numeroLinea: number,
): ResultadoTraduccion | null {
  const tope = pila.pop()
  if (!tope) {
    return errorEn(numeroLinea, `"${NOMBRE_CIERRE[esperado]}" está de más acá — no hay ningún ${NOMBRE_APERTURA[esperado]} abierto.`)
  }
  if (tope.tipo !== esperado) {
    return errorEn(
      numeroLinea,
      `Acá esperaba "${NOMBRE_CIERRE[tope.tipo]}" — todavía no cerraste el ${NOMBRE_APERTURA[tope.tipo]} que abriste en la línea ${tope.linea}.`,
    )
  }
  return null
}

export function aJavaScript(pseudocodigo: string): ResultadoTraduccion {
  const entrada = pseudocodigo.split('\n')
  const salida: string[] = []
  const pila: { tipo: TipoBloque; linea: number }[] = []

  for (let i = 0; i < entrada.length; i++) {
    const numeroLinea = i + 1
    const linea = entrada[i]
    let m: RegExpMatchArray | null

    if ((m = linea.match(RE_SINO_SI))) {
      if (pila[pila.length - 1]?.tipo !== 'si') {
        return errorEn(numeroLinea, 'Este "SINO SI" no tiene un "SI … ENTONCES" abierto al que responder.')
      }
      salida.push(`${m[1]}} else if (${m[2]}) {`)
    } else if ((m = linea.match(RE_SI))) {
      pila.push({ tipo: 'si', linea: numeroLinea })
      salida.push(`${m[1]}if (${m[2]}) {`)
    } else if ((m = linea.match(RE_SINO))) {
      if (pila[pila.length - 1]?.tipo !== 'si') {
        return errorEn(numeroLinea, 'Este "SINO" no tiene un "SI … ENTONCES" abierto al que responder.')
      }
      salida.push(`${m[1]}} else {`)
    } else if ((m = linea.match(RE_FIN_SI))) {
      const err = cerrarBloque(pila, 'si', numeroLinea)
      if (err) return err
      salida.push(`${m[1]}}`)
    } else if ((m = linea.match(RE_PARA))) {
      pila.push({ tipo: 'para', linea: numeroLinea })
      salida.push(`${m[1]}for (const ${m[2]} of ${m[3]}) {`)
    } else if ((m = linea.match(RE_FIN_PARA))) {
      const err = cerrarBloque(pila, 'para', numeroLinea)
      if (err) return err
      salida.push(`${m[1]}}`)
    } else if ((m = linea.match(RE_MIENTRAS))) {
      pila.push({ tipo: 'mientras', linea: numeroLinea })
      salida.push(`${m[1]}while (${m[2]}) {`)
    } else if ((m = linea.match(RE_FIN_MIENTRAS))) {
      const err = cerrarBloque(pila, 'mientras', numeroLinea)
      if (err) return err
      salida.push(`${m[1]}}`)
    } else if ((m = linea.match(RE_FUNCION))) {
      pila.push({ tipo: 'funcion', linea: numeroLinea })
      salida.push(`${m[1]}function ${m[2]}(${m[3]}) {`)
    } else if ((m = linea.match(RE_FIN_FUNCION))) {
      const err = cerrarBloque(pila, 'funcion', numeroLinea)
      if (err) return err
      salida.push(`${m[1]}}`)
    } else {
      // Cualquier otra línea es JS real tal cual: const, llamadas a función, comentarios,
      // líneas vacías. No se toca — ahí es donde vive mostrar()/crear…(), que ya está bien.
      salida.push(linea)
    }
  }

  if (pila.length > 0) {
    const abierto = pila[pila.length - 1]
    return errorEn(
      abierto.linea,
      `Te falta "${NOMBRE_CIERRE[abierto.tipo]}" para este ${NOMBRE_APERTURA[abierto.tipo]}.`,
    )
  }

  return { ok: true, js: salida.join('\n') }
}
