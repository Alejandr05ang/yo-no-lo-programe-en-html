import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Guardia contra la corrupción de codificación: un archivo UTF-8 que alguien
// vuelve a guardar como cp1252 (o que pasa por una herramienta que lo lee así)
// convierte cada acento en dos caracteres. La huella fiable de ese accidente es
// una "Ã" (U+00C3) o una "Â" (U+00C2) seguida de otro carácter no ASCII, porque
// los bytes de 'á', 'é', 'í', 'ó', 'ú', 'ñ', '¿' y '¡' en UTF-8 empiezan por
// 0xC3 o 0xC2. Una "Ã" suelta, un guion largo, una flecha o una nota musical no
// son mojibake, así que no se marcan.

const RAIZ_FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const EXTENSIONES_DE_TEXTO = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.md', '.svg', '.txt'])

const LIDERES_DE_MOJIBAKE = new Set([0x00c3, 0x00c2])
const CARACTER_DE_REEMPLAZO = 0xfffd

export type Hallazgo = {
  linea: number
  columna: number
  secuencia: string
  extracto: string
}

/** Devuelve cada secuencia de mojibake del texto, con su línea y su columna. */
export function buscarMojibake(texto: string): Hallazgo[] {
  const hallazgos: Hallazgo[] = []
  const lineas = texto.split('\n')
  for (let indice = 0; indice < lineas.length; indice += 1) {
    const linea = lineas[indice]
    for (let columna = 0; columna < linea.length; columna += 1) {
      const codigo = linea.charCodeAt(columna)
      let secuencia = ''
      if (codigo === CARACTER_DE_REEMPLAZO) secuencia = linea[columna]
      // charCodeAt fuera de rango devuelve NaN, y NaN > 0x7f es falso: una "Ã"
      // al final de la línea no cuenta.
      else if (LIDERES_DE_MOJIBAKE.has(codigo) && linea.charCodeAt(columna + 1) > 0x7f) secuencia = linea.slice(columna, columna + 2)
      if (!secuencia) continue
      hallazgos.push({
        linea: indice + 1,
        columna: columna + 1,
        secuencia,
        extracto: linea.slice(Math.max(0, columna - 24), columna + 24).trim(),
      })
      columna += secuencia.length - 1
    }
  }
  return hallazgos
}

function puntosDeCodigo(texto: string): string {
  return [...texto].map((caracter) => `U+${(caracter.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`).join(' ')
}

function rutaRelativa(ruta: string): string {
  return path.relative(RAIZ_FRONTEND, ruta).replaceAll('\\', '/')
}

function describir(ruta: string, hallazgo: Hallazgo): string {
  return `${rutaRelativa(ruta)}:${hallazgo.linea}:${hallazgo.columna}  "${hallazgo.secuencia}" (${puntosDeCodigo(hallazgo.secuencia)})  …${hallazgo.extracto}…`
}

/** src/** recursivo, más index.html y los .html sueltos de public/. */
function archivosDeTexto(): string[] {
  const encontrados: string[] = []
  const recorrer = (directorio: string) => {
    for (const entrada of fs.readdirSync(directorio, { withFileTypes: true })) {
      const ruta = path.join(directorio, entrada.name)
      if (entrada.isDirectory()) recorrer(ruta)
      else if (entrada.isFile() && EXTENSIONES_DE_TEXTO.has(path.extname(entrada.name).toLowerCase())) encontrados.push(ruta)
    }
  }
  recorrer(path.join(RAIZ_FRONTEND, 'src'))
  encontrados.push(path.join(RAIZ_FRONTEND, 'index.html'))
  const publico = path.join(RAIZ_FRONTEND, 'public')
  for (const entrada of fs.readdirSync(publico, { withFileTypes: true })) {
    if (entrada.isFile() && path.extname(entrada.name).toLowerCase() === '.html') encontrados.push(path.join(publico, entrada.name))
  }
  return encontrados.sort()
}

const ARCHIVOS = archivosDeTexto()

test('el recorrido encuentra los archivos de texto del producto', () => {
  assert.ok(ARCHIVOS.length > 20, `solo se encontraron ${ARCHIVOS.length} archivos; el recorrido está roto`)
  assert.ok(ARCHIVOS.some((ruta) => ruta.endsWith('index.html')))
  assert.ok(ARCHIVOS.some((ruta) => ruta.endsWith('.tsx')))
  assert.ok(ARCHIVOS.some((ruta) => ruta.endsWith('.css')))
})

test('cada archivo es UTF-8 válido y no empieza por BOM', () => {
  const problemas: string[] = []
  for (const ruta of ARCHIVOS) {
    const bytes = fs.readFileSync(ruta)
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      problemas.push(`${rutaRelativa(ruta)}: empieza por BOM (EF BB BF); guárdalo en UTF-8 sin BOM`)
      continue
    }
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch (error) {
      problemas.push(`${rutaRelativa(ruta)}: no es UTF-8 válido (${(error as Error).message})`)
    }
  }
  assert.ok(problemas.length === 0, `Archivos mal codificados:\n${problemas.join('\n')}`)
})

test('ningún archivo del producto contiene secuencias de mojibake', () => {
  const problemas: string[] = []
  for (const ruta of ARCHIVOS) {
    const bytes = fs.readFileSync(ruta)
    const texto = new TextDecoder('utf-8').decode(bytes)
    for (const hallazgo of buscarMojibake(texto)) problemas.push(describir(ruta, hallazgo))
  }
  assert.ok(
    problemas.length === 0,
    `Mojibake detectado en ${problemas.length} sitio(s). Reescribe el archivo en UTF-8 con los acentos correctos:\n${problemas.join('\n')}`,
  )
})

// cp1252 solo se separa de latin1 en el tramo 0x80-0x9F; esta tabla es ese tramo.
const CP1252_TRAMO_ALTO =
  '€‚ƒ„…†‡ˆ‰Š‹ŒŽ' +
  '‘’“”•–—˜™š›œžŸ'

/** Lee bytes como si fueran cp1252: exactamente lo que corrompe un UTF-8. */
function leerComoCp1252(bytes: Uint8Array): string {
  let salida = ''
  for (const byte of bytes) {
    salida += byte >= 0x80 && byte <= 0x9f ? CP1252_TRAMO_ALTO[byte - 0x80] : String.fromCharCode(byte)
  }
  return salida
}

test('el detector marca el mojibake de leer UTF-8 como cp1252', () => {
  const original = 'día, ¿qué tal? ÉXITO para el señor Ñuño'
  const corrupto = leerComoCp1252(new TextEncoder().encode(original))
  assert.notEqual(corrupto, original)
  assert.ok(corrupto.startsWith('dÃ­a'), `cp1252 no produjo el mojibake esperado: ${JSON.stringify(corrupto)}`)

  const hallazgos = buscarMojibake(corrupto)
  // í ¿ é É ñ Ñ ñ  -> siete acentos corrompidos, ninguno se escapa.
  assert.equal(hallazgos.length, 7)
  assert.deepEqual(
    hallazgos.map((hallazgo) => hallazgo.secuencia),
    ['Ã­', 'Â¿', 'Ã©', 'Ã‰', 'Ã±', 'Ã‘', 'Ã±'],
  )
  assert.equal(hallazgos[0].linea, 1)
  assert.equal(hallazgos[0].columna, 2)
  assert.match(describir('/x/frontend/src/demo.ts', hallazgos[0]), /:1:2.+U\+00C3 U\+00AD/)

  const enVariasLineas = buscarMojibake(`ok\nprimera lÃ­nea\nsegunda lÃ­nea`)
  assert.deepEqual(
    enVariasLineas.map((hallazgo) => hallazgo.linea),
    [2, 3],
  )
  assert.deepEqual(buscarMojibake('men�u').map((hallazgo) => hallazgo.secuencia), ['�'])
})

test('el detector no marca texto español legítimo ni símbolos', () => {
  const legitimo = [
    'Programación en español: ¿cómo diseñar una función que evalúe el código?',
    'Tutorías de Verano — niveles, días y años; «citas», guiones – cortos y puntos…',
    'Flechas → ← ↑ ↺, notas ♪, casillas ✓ ✅ ❌, bordes ─ ═ y viñetas · §',
    'Títulos del reproductor: 星くず, 香港戀歌, サヨナラ, ブリーズ',
    'Signos sueltos: Â al final de nada, Ã seguida de ASCII, 10 × 3 ≥ 5',
    'Mayúsculas con tilde: ÓPTIMO, ÚNICO, ÉXITO, Ñandú',
    'Sin nada raro: plain ASCII text with no accents at all.',
  ]
  for (const texto of legitimo) {
    assert.deepEqual(buscarMojibake(texto), [], `falso positivo en: ${texto}`)
  }
})
