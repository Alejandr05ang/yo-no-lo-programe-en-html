import assert from 'node:assert/strict'
import test from 'node:test'
import { parse } from 'acorn'
import { componerAndamiaje, ENCARGOS, NUMEROS_DE_ENCARGO } from '../src/lib/encargos.ts'
import { aJavaScript } from '../src/lib/pseudocodigoAJS.ts'

// Fuzzing del traductor de pseudocódigo, con semilla fija (reproducible). Cada programa se
// genera junto con la traducción EXACTA que debe salir, línea por línea, así que el oráculo no
// es "no falla": es "sale justo este JavaScript". Por defecto corre una muestra rápida; para la
// auditoría completa: FUZZ_VALIDOS=20000 FUZZ_MUTADOS=30000 npm test.
const VALIDOS = Number(process.env.FUZZ_VALIDOS ?? 1500)
const MUTADOS = Number(process.env.FUZZ_MUTADOS ?? 1500)

function generador(semilla: number) {
  let s = semilla >>> 0
  const azar = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const uno = <T,>(xs: readonly T[]): T => xs[Math.floor(azar() * xs.length)]
  return { azar, uno }
}
type Azar = ReturnType<typeof generador>

interface Linea {
  src: string
  js: string
  /** Qué abre/cierra (para las mutaciones). */
  papel?: { tipo: 'abre' | 'cierra'; sintaxis: 'pseudo' | 'js'; bloque: 'si' | 'para' | 'mientras' | 'funcion' }
}

const CONDICIONES = [
  'x > 1',
  'datos.hobbies.length === 0',
  '(a && b) || !c',
  'texto === "si entonces"',
  'nombre !== "FIN SI"',
  '/[{}]/.test(texto)',
  '`${a} {` !== "}"',
  'año >= 2000',
  'lista.includes("hacer")',
  'url === "https://x.com//ruta"',
]
const LISTAS = ['datos.hobbies', 'datos.redes', '[1, 2, 3]', 'lista.filter((x) => x !== "{")', 'Object.keys({ si: 1 })']
const VARIABLES = ['h', 'red', 'x', 'año', 'opción', 'item_2', '$v']
const PALABRA = {
  si: ['SI', 'si', 'Si'],
  entonces: ['ENTONCES', 'entonces', 'Entonces'],
  sino: ['SINO', 'sino', 'Sino'],
  finSi: ['FIN SI', 'fin si', 'FIN  SI', 'FINSI'],
  paraCada: ['PARA CADA', 'para cada', 'Para Cada'],
  en: ['EN', 'en'],
  hacer: ['HACER', 'hacer'],
  finPara: ['FIN PARA', 'fin para'],
  mientras: ['MIENTRAS', 'mientras'],
  finMientras: ['FIN MIENTRAS', 'fin mientras'],
  funcion: ['FUNCIÓN', 'FUNCION', 'función', 'funcion'],
  finFuncion: ['FIN FUNCIÓN', 'FIN FUNCION', 'fin función'],
} as const

function comentarioFinal(r: Azar): string {
  return r.azar() < 0.2 ? r.uno([' // nota', ' // SI esto ENTONCES aquello', ' // } {']) : ''
}

/** Una sentencia simple (JS válido tal cual, aunque "parezca" pseudocódigo por dentro). */
function simple(r: Azar, sangria: string, n: number): Linea[] {
  const igual = (src: string): Linea => ({ src, js: src })
  switch (Math.floor(r.azar() * 10)) {
    case 0: return [igual(`${sangria}mostrar(crearParrafo("texto ${n} { }"))`)]
    case 1: return [igual(`${sangria}const v${n} = ${n}`)]
    case 2: return [igual(`${sangria}// PARA CADA x EN lista HACER`)]
    case 3: return [igual('')]
    // Un bloque comentado con líneas de pseudocódigo COMPLETAS (sin cerrar a propósito).
    case 4: return [igual(`${sangria}/*`), igual(r.uno(['PARA CADA x EN y HACER', 'FIN SI', 'SINO', 'SI a ENTONCES', 'FIN FUNCIÓN', '}', '{'])), igual(`${sangria}*/`)]
    // Una plantilla de varias líneas con pseudocódigo por dentro.
    case 5: return [igual(`${sangria}const t${n} = \``), igual(r.uno(['SI te gusta ENTONCES', 'FIN PARA', 'SINO', 'MIENTRAS x HACER', '{ }'])), igual('`')]
    case 6: return [igual(`${sangria}const re${n} = /[{}]+/g`)]
    case 7: return [igual(`${sangria}const o${n} = {`), igual(`${sangria}  si: 1,`), igual(`${sangria}  sino: { x: "}" },`), igual(`${sangria}}`)]
    case 8: return [igual(`${sangria}const s${n} = "a${String.fromCharCode(0x2028)}b"`)] // U+2028 dentro de un texto
    default: return [igual(`${sangria}agregarA(lista, crearItem(\`\${x} FIN SI\`))`)]
  }
}

function bloque(r: Azar, nivel: number, contador: { n: number }): Linea[] {
  const sangria = r.azar() < 0.1 ? '\t'.repeat(nivel) : '  '.repeat(nivel)
  const n = contador.n++
  const cuerpo = (): Linea[] => programa(r, nivel + 1, contador, 1 + Math.floor(r.azar() * 2))
  const cond = r.uno(CONDICIONES)
  const v = r.uno(VARIABLES)
  const lista = r.uno(LISTAS)
  const c = comentarioFinal(r)
  const P = <K extends keyof typeof PALABRA>(k: K) => r.uno(PALABRA[k])
  const abre = (sintaxis: 'pseudo' | 'js', b: 'si' | 'para' | 'mientras' | 'funcion') => ({ tipo: 'abre' as const, sintaxis, bloque: b })
  const cierra = (sintaxis: 'pseudo' | 'js', b: 'si' | 'para' | 'mientras' | 'funcion') => ({ tipo: 'cierra' as const, sintaxis, bloque: b })

  switch (Math.floor(r.azar() * 8)) {
    case 0: { // SI … [SINO SI …] [SINO] FIN SI
      const lineas: Linea[] = [{ src: `${sangria}${P('si')} ${cond} ${P('entonces')}${c}`, js: `${sangria}if (${cond}) {${c}`, papel: abre('pseudo', 'si') }, ...cuerpo()]
      if (r.azar() < 0.4) {
        const c2 = r.uno(CONDICIONES)
        lineas.push({ src: `${sangria}${P('sino')} ${P('si')} ${c2} ${P('entonces')}`, js: `${sangria}} else if (${c2}) {` }, ...cuerpo())
      }
      if (r.azar() < 0.5) lineas.push({ src: `${sangria}${P('sino')}`, js: `${sangria}} else {` }, ...cuerpo())
      lineas.push({ src: `${sangria}${P('finSi')}${c}`, js: `${sangria}}${c}`, papel: cierra('pseudo', 'si') })
      return lineas
    }
    case 1:
      return [
        { src: `${sangria}${P('paraCada')} ${v} ${P('en')} ${lista} ${P('hacer')}${c}`, js: `${sangria}for (const ${v} of ${lista}) {${c}`, papel: abre('pseudo', 'para') },
        ...cuerpo(),
        { src: `${sangria}${P('finPara')}`, js: `${sangria}}`, papel: cierra('pseudo', 'para') },
      ]
    case 2:
      return [
        { src: `${sangria}${P('mientras')} ${cond} ${P('hacer')}`, js: `${sangria}while (${cond}) {`, papel: abre('pseudo', 'mientras') },
        ...cuerpo(),
        { src: `${sangria}${P('finMientras')}${c}`, js: `${sangria}}${c}`, papel: cierra('pseudo', 'mientras') },
      ]
    case 3:
      return [
        { src: `${sangria}${P('funcion')} f${n}(${v}, otro)`, js: `${sangria}function f${n}(${v}, otro) {`, papel: abre('pseudo', 'funcion') },
        ...cuerpo(),
        { src: `${sangria}${P('finFuncion')}`, js: `${sangria}}`, papel: cierra('pseudo', 'funcion') },
      ]
    case 4: { // if { } else if { } else { }
      const lineas: Linea[] = [{ src: `${sangria}if (${cond}) {`, js: `${sangria}if (${cond}) {`, papel: abre('js', 'si') }, ...cuerpo()]
      if (r.azar() < 0.4) lineas.push({ src: `${sangria}} else if (${cond}) {`, js: `${sangria}} else if (${cond}) {` }, ...cuerpo())
      if (r.azar() < 0.5) lineas.push({ src: `${sangria}} else {`, js: `${sangria}} else {` }, ...cuerpo())
      lineas.push({ src: `${sangria}}`, js: `${sangria}}`, papel: cierra('js', 'si') })
      return lineas
    }
    case 5:
      return [{ src: `${sangria}for (const ${v} of ${lista}) {`, js: `${sangria}for (const ${v} of ${lista}) {`, papel: abre('js', 'para') }, ...cuerpo(), { src: `${sangria}}`, js: `${sangria}}`, papel: cierra('js', 'para') }]
    case 6:
      return [{ src: `${sangria}while (${cond}) {`, js: `${sangria}while (${cond}) {`, papel: abre('js', 'mientras') }, ...cuerpo(), { src: `${sangria}}`, js: `${sangria}}`, papel: cierra('js', 'mientras') }]
    default:
      return [{ src: `${sangria}function g${n}(${v}) {`, js: `${sangria}function g${n}(${v}) {`, papel: abre('js', 'funcion') }, ...cuerpo(), { src: `${sangria}}`, js: `${sangria}}`, papel: cierra('js', 'funcion') }]
  }
}

function programa(r: Azar, nivel: number, contador: { n: number }, sentencias: number): Linea[] {
  const lineas: Linea[] = []
  for (let k = 0; k < sentencias; k++) {
    if (nivel < 4 && r.azar() < 0.55) lineas.push(...bloque(r, nivel, contador))
    else lineas.push(...simple(r, '  '.repeat(nivel), contador.n++))
  }
  return lineas
}

function esJsValido(js: string): boolean {
  try {
    parse(js, { ecmaVersion: 'latest', sourceType: 'script' })
    return true
  } catch {
    return false
  }
}

test('currículo: todos los andamiajes y arranques en frío se traducen y son JS válido', () => {
  let programas = 0
  for (const n of NUMEROS_DE_ENCARGO) {
    const e = ENCARGOS[n]
    for (const codigo of [e.andamiajeNuevo, e.fallbackHeredado, componerAndamiaje(n, {})]) {
      if (!codigo.trim()) continue
      programas++
      const r = aJavaScript(codigo)
      assert.equal(r.ok, true, `E${n}: ${r.error?.mensaje} (línea ${r.error?.linea})`)
      assert.equal(r.js.split('\n').length, codigo.split('\n').length, `E${n}: la traducción debe ser 1 a 1`)
      assert.ok(esJsValido(r.js), `E${n}: el JS traducido no es válido`)
    }
  }
  assert.ok(programas >= 30, `corpus del currículo demasiado pequeño: ${programas}`)
})

test(`programas válidos generados (${VALIDOS}): salen EXACTAMENTE traducidos, 1 a 1 y válidos`, () => {
  const r = generador(20260923)
  let conPseudo = 0
  for (let i = 0; i < VALIDOS; i++) {
    const lineas = programa(r, 0, { n: 0 }, 1 + Math.floor(r.azar() * 4))
    const src = lineas.map((l) => l.src).join('\n')
    const esperado = lineas.map((l) => l.js).join('\n')
    const t = aJavaScript(src)
    assert.equal(t.ok, true, `#${i}: ${t.error?.mensaje} (línea ${t.error?.linea})\n${src}`)
    assert.equal(t.js, esperado, `#${i}: traducción inesperada\n${src}`)
    assert.ok(esJsValido(t.js), `#${i}: JS inválido\n${t.js}`)
    if (lineas.some((l) => l.src !== l.js)) conPseudo++
    // Lo que ya era JavaScript (sin pseudocódigo) sale idéntico.
    if (lineas.every((l) => l.src === l.js)) assert.equal(t.js, src)
  }
  assert.ok(conPseudo > VALIDOS / 3, 'el generador debe producir bastante pseudocódigo')
})

test(`programas mutados (${MUTADOS}): nunca revienta y el error señala la línea que choca`, () => {
  const r = generador(9230526)
  let hechos = 0
  let intentos = 0
  while (hechos < MUTADOS && intentos < MUTADOS * 20) {
    intentos++
    const lineas = programa(r, 0, { n: 0 }, 1 + Math.floor(r.azar() * 4))
    // Un error de JavaScript que no tiene nada que ver con bloques (falta un ")"): el traductor
    // no debe inventar un diagnóstico de mezcla; lo explica el motor al ejecutar.
    const llamadas = lineas.map((l, i) => ({ l, i })).filter((x) => x.l.src === x.l.js && /^\s*mostrar\(.*\)\)$/.test(x.l.src))
    if (llamadas.length > 0 && r.azar() < 0.2) {
      const { i } = r.uno(llamadas)
      const src = lineas.map((x, k) => (k === i ? x.src.slice(0, -1) : x.src)).join('\n')
      const t = aJavaScript(src)
      hechos++
      assert.equal(t.ok, true, `#${hechos} (error ajeno): ${t.error?.mensaje} (línea ${t.error?.linea})\n${src}`)
      continue
    }
    const cierres = lineas.map((l, i) => ({ l, i })).filter((x) => x.l.papel?.tipo === 'cierra')
    if (cierres.length === 0) continue
    const { l, i } = r.uno(cierres)
    const papel = l.papel!
    const sangria = /^\s*/.exec(l.src)![0]
    const mutada = [...lineas.map((x) => x.src)]
    const tipo = r.uno(['otra-sintaxis', 'otro-bloque', 'sobra-cierre', 'falta-cierre'] as const)
    const cierrePseudo = { si: 'FIN SI', para: 'FIN PARA', mientras: 'FIN MIENTRAS', funcion: 'FIN FUNCIÓN' } as const

    if (tipo === 'otra-sintaxis') {
      // Abierto con una sintaxis, cerrado con la otra.
      mutada[i] = papel.sintaxis === 'pseudo' ? `${sangria}}` : `${sangria}${cierrePseudo[papel.bloque]}`
    } else if (tipo === 'otro-bloque') {
      if (papel.sintaxis !== 'pseudo') continue
      const otro = (['si', 'para', 'mientras', 'funcion'] as const).find((b) => b !== papel.bloque)!
      mutada[i] = `${sangria}${cierrePseudo[otro]}`
    } else if (tipo === 'sobra-cierre') {
      mutada.splice(i + 1, 0, `${sangria}${r.azar() < 0.5 ? '}' : r.uno(Object.values(cierrePseudo))}`)
    } else {
      mutada.splice(i, 1)
    }
    const src = mutada.join('\n')
    let t: ReturnType<typeof aJavaScript>
    assert.doesNotThrow(() => { t = aJavaScript(src) }, `#${hechos}: lanzó una excepción\n${src}`)
    t = aJavaScript(src)
    hechos++
    // Un cierre que no corresponde nunca produce un programa "correcto".
    assert.equal(t.ok, false, `#${hechos} (${tipo}): debió dar error\n${src}`)
    const total = mutada.length
    assert.ok(t.error && t.error.linea !== undefined && t.error.linea >= 1 && t.error.linea <= total, `#${hechos}: línea fuera de rango ${t.error?.linea}`)
    assert.ok((t.error?.mensaje ?? '').length > 10)
    assert.doesNotMatch(t.error!.mensaje, /Unexpected|undefined|null|\[object/)
    // Si el choque está en la propia línea mutada, el error la señala a ella.
    if (tipo === 'otra-sintaxis' || tipo === 'otro-bloque') {
      assert.equal(t.error!.linea, i + 1, `#${hechos} (${tipo}): ${t.error!.mensaje}\n${src}`)
    }
  }
  assert.equal(hechos, MUTADOS)
})
