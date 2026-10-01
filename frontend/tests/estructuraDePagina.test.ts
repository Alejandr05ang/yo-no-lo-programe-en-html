import assert from 'node:assert/strict'
import test from 'node:test'
import {
  agregarColumna,
  agregarFila,
  combinarCeldas,
  crearDocumentoJu1Inicial,
  crearEstructuraInicial,
  crearSeccion,
  eliminarColumna,
  eliminarFila,
  etiquetarCelda,
  extenderSeccion,
  esDocumentoVirgen,
  sinMostrarDe,
  eliminarFilaDelDocumento,
  eliminarColumnaDelDocumento,
  seccionesDeLaUltima,
  sinSeccionesHuerfanas,
  moverSeccion,
  ubicarSeccion,
  parsearDocumentoJu1,
  sanearNombreDeSeccion,
  separarCelda,
  separarCeldaDelDocumento,
  serializarDocumentoJu1,
} from '../src/lib/estructuraDePagina.ts'
import type { EstructuraDePagina } from '../src/lib/tipos.ts'

function celdaEn(e: EstructuraDePagina, fila: number, columna: number) {
  return e.celdas.find((c) => c.fila === fila && c.columna === columna)
}

test('crearEstructuraInicial: una sola celda 1x1', () => {
  const e = crearEstructuraInicial()
  assert.equal(e.filas, 1)
  assert.equal(e.columnas, 1)
  assert.equal(e.celdas.length, 1)
  assert.equal(e.celdas[0].seccion, null)
})

test('agregarFila/agregarColumna: crecen sin tocar lo que ya había', () => {
  let e = crearEstructuraInicial()
  e = agregarColumna(e) // 1x2
  e = agregarFila(e) // 2x2
  assert.equal(e.filas, 2)
  assert.equal(e.columnas, 2)
  assert.equal(e.celdas.length, 4)
  for (let f = 0; f < 2; f++) {
    for (let c = 0; c < 2; c++) {
      assert.ok(celdaEn(e, f, c), `falta la celda (${f},${c})`)
    }
  }
})

test('eliminarFila: no deja la cuadrícula sin filas', () => {
  const r = eliminarFila(crearEstructuraInicial())
  assert.equal(r.ok, false)
})

test('eliminarFila/eliminarColumna: no dejan la última si una sección combinada la ocupa', () => {
  let e = crearEstructuraInicial()
  e = agregarColumna(e) // 1x2
  e = agregarFila(e) // 2x2
  const m = combinarCeldas(e, 0, 0, 1, 0) // combina las dos celdas de la columna 0
  assert.equal(m.ok, true)
  if (!m.ok) return
  e = m.valor
  const rf = eliminarFila(e)
  assert.equal(rf.ok, false, 'la sección combinada ocupa la fila 1, no se puede sacar sin separar antes')
  const rc = eliminarColumna(e)
  assert.equal(rc.ok, true, 'la columna 1 (sin combinar) sí se puede sacar')
})

test('combinarCeldas: arma un rectángulo 1/3-2/3 con una cuadrícula base de 3 columnas', () => {
  let e = crearEstructuraInicial()
  e = agregarColumna(e)
  e = agregarColumna(e) // 1x3 — la celda de la columna 0 ya es, sola, la sección angosta (1/3)
  const grande = combinarCeldas(e, 0, 1, 0, 2) // combina las otras 2 de 3 (2/3)
  assert.equal(grande.ok, true)
  if (!grande.ok) return
  assert.equal(grande.valor.celdas.length, 2)
  const izquierda = grande.valor.celdas.find((c) => c.columna === 0)!
  const derecha = grande.valor.celdas.find((c) => c.columna === 1)!
  assert.equal(izquierda.expandeColumnas, 1)
  assert.equal(derecha.expandeColumnas, 2)
})

test('combinarCeldas: rechaza una sola celda', () => {
  const r = combinarCeldas(crearEstructuraInicial(), 0, 0, 0, 0)
  assert.equal(r.ok, false)
})

test('combinarCeldas: rechaza una selección que corta una sección ya combinada', () => {
  let e = crearEstructuraInicial()
  e = agregarColumna(e)
  e = agregarFila(e) // 2x2
  const primero = combinarCeldas(e, 0, 0, 1, 0) // combina toda la columna 0
  assert.equal(primero.ok, true)
  if (!primero.ok) return
  // Ahora pedir un rectángulo que solo tapa la mitad de esa combinación (fila 0, columnas 0-1)
  const segundo = combinarCeldas(primero.valor, 0, 0, 0, 1)
  assert.equal(segundo.ok, false)
})

test('combinarCeldas: rechaza combinar una celda que ya tiene sección (hay que separar primero)', () => {
  let e = crearEstructuraInicial()
  e = agregarColumna(e) // 1x2
  e = { ...e, celdas: e.celdas.map((c) => (c.columna === 0 ? { ...c, seccion: 'encabezado' } : c)) }
  const r = combinarCeldas(e, 0, 0, 0, 1)
  assert.equal(r.ok, false)
})

test('separarCelda: vuelve a las celdas 1x1 originales, vacías', () => {
  let e = crearEstructuraInicial()
  e = agregarColumna(e)
  e = agregarFila(e) // 2x2
  const m = combinarCeldas(e, 0, 0, 1, 1) // combina las 4
  assert.equal(m.ok, true)
  if (!m.ok) return
  const combinada = m.valor.celdas[0]
  const separada = separarCelda(m.valor, combinada.id)
  assert.equal(separada.celdas.length, 4)
  assert.ok(separada.celdas.every((c) => c.expandeFilas === 1 && c.expandeColumnas === 1 && c.seccion === null))
})

test('sanearNombreDeSeccion: tildes, espacios, mayúsculas de camelCase', () => {
  assert.equal(sanearNombreDeSeccion('Sobre mí', []), 'sobreMi')
  assert.equal(sanearNombreDeSeccion('Mis proyectos', []), 'misProyectos')
})

test('sanearNombreDeSeccion: una etiqueta sin espacios (ya en PascalCase) no pierde la mayúscula interna', () => {
  // Bug real: sin separar por mayúscula interna, "SobreMi" se trataba como una sola palabra y
  // quedaba "sobremi" — un nombre distinto del que después referencia portafolio.js.
  assert.equal(sanearNombreDeSeccion('SobreMi', []), 'sobreMi')
  assert.equal(sanearNombreDeSeccion('MisProyectos', []), 'misProyectos')
})

test('sanearNombreDeSeccion: no puede empezar con un número ni ser una palabra reservada', () => {
  assert.match(sanearNombreDeSeccion('2 columnas', []), /^[a-zA-Z]/)
  assert.notEqual(sanearNombreDeSeccion('datos', []), 'datos')
})

test('sanearNombreDeSeccion: nombres repetidos no chocan', () => {
  const a = sanearNombreDeSeccion('Pie', [])
  const b = sanearNombreDeSeccion('Pie', [a])
  assert.notEqual(a, b)
})

test('serializarDocumentoJu1/parsearDocumentoJu1: ida y vuelta exacta', () => {
  const doc = crearDocumentoJu1Inicial()
  doc.main = 'mostrar(encabezado)'
  doc.secciones.push({ nombre: 'encabezado', contenido: 'mostrar(crearTitulo("hola"))' })
  const texto = serializarDocumentoJu1(doc)
  const de_vuelta = parsearDocumentoJu1(texto)
  assert.deepEqual(de_vuelta, doc)
})

test('etiquetarCelda: crea la sección con nombre saneado y su pestaña vacía', () => {
  const doc = crearDocumentoJu1Inicial()
  const celdaId = doc.estructura.celdas[0].id
  const etiquetado = etiquetarCelda(doc, celdaId, 'Sobre mí')
  assert.equal(etiquetado.estructura.celdas[0].seccion, 'sobreMi')
  assert.deepEqual(etiquetado.secciones, [{ nombre: 'sobreMi', contenido: '' }])
})

test('etiquetarCelda: dos secciones con la misma etiqueta no chocan de nombre', () => {
  let doc = crearDocumentoJu1Inicial()
  doc = { ...doc, estructura: agregarColumna(doc.estructura) } // 1x2
  const [a, b] = doc.estructura.celdas
  doc = etiquetarCelda(doc, a.id, 'Pie')
  doc = etiquetarCelda(doc, b.id, 'Pie')
  const nombres = doc.secciones.map((s) => s.nombre)
  assert.equal(new Set(nombres).size, 2, 'los dos nombres deben ser distintos')
})

test('separarCeldaDelDocumento: borra la pestaña de la sección junto con la combinación', () => {
  let doc = crearDocumentoJu1Inicial()
  doc = { ...doc, estructura: agregarColumna(doc.estructura) } // 1x2
  const m = combinarCeldas(doc.estructura, 0, 0, 0, 1)
  assert.equal(m.ok, true)
  if (!m.ok) return
  doc = { ...doc, estructura: m.valor }
  const combinadaId = doc.estructura.celdas[0].id
  doc = etiquetarCelda(doc, combinadaId, 'Encabezado')
  assert.equal(doc.secciones.length, 1)
  doc = separarCeldaDelDocumento(doc, combinadaId)
  assert.equal(doc.secciones.length, 0, 'la sección desaparece al separar la celda que la tenía')
  assert.equal(doc.estructura.celdas.length, 2)
})

test('crearSeccion: una sola celda se etiqueta directo, sin combinar nada', () => {
  const doc = crearDocumentoJu1Inicial()
  const r = crearSeccion(doc, 0, 0, 0, 0, 'Encabezado')
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.equal(r.valor.estructura.celdas.length, 1)
  assert.equal(r.valor.estructura.celdas[0].seccion, 'encabezado')
  assert.deepEqual(r.valor.secciones, [{ nombre: 'encabezado', contenido: '' }])
})

test('crearSeccion: un rectángulo de varias celdas combina y etiqueta en un solo paso', () => {
  let doc = crearDocumentoJu1Inicial()
  doc = { ...doc, estructura: agregarColumna(doc.estructura) } // 1x2
  const r = crearSeccion(doc, 0, 0, 0, 1, 'Encabezado')
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.equal(r.valor.estructura.celdas.length, 1)
  assert.equal(r.valor.estructura.celdas[0].expandeColumnas, 2)
  assert.equal(r.valor.estructura.celdas[0].seccion, 'encabezado')
})

test('crearSeccion: una selección inválida no cambia nada y avisa por qué', () => {
  let doc = crearDocumentoJu1Inicial()
  doc = { ...doc, estructura: agregarColumna(doc.estructura) }
  doc = { ...doc, estructura: agregarFila(doc.estructura) } // 2x2
  const combinado = crearSeccion(doc, 0, 0, 1, 0, 'Lateral') // combina toda la columna 0
  assert.equal(combinado.ok, true)
  if (!combinado.ok) return
  const invalido = crearSeccion(combinado.valor, 0, 0, 0, 1, 'Otra') // corta la sección anterior
  assert.equal(invalido.ok, false)
})

test('extenderSeccion: agranda una sección ya nombrada SIN tocar su contenido', () => {
  let doc = crearDocumentoJu1Inicial()
  doc = { ...doc, estructura: agregarColumna(doc.estructura) } // 1x2
  const celdaId = doc.estructura.celdas[0].id
  doc = etiquetarCelda(doc, celdaId, 'Encabezado')
  doc = { ...doc, secciones: doc.secciones.map((s) => ({ ...s, contenido: 'mostrar(crearTitulo("hola"))' })) }

  const r = extenderSeccion(doc, celdaId, 0, 0, 0, 1) // agrandarla para que ocupe también la columna 1
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.equal(r.valor.estructura.celdas.length, 1)
  assert.equal(r.valor.estructura.celdas[0].expandeColumnas, 2)
  assert.equal(r.valor.estructura.celdas[0].seccion, 'encabezado')
  // El contenido de la sección sigue siendo el mismo — no se creó ni se borró nada en secciones.
  assert.deepEqual(r.valor.secciones, [{ nombre: 'encabezado', contenido: 'mostrar(crearTitulo("hola"))' }])
})

test('extenderSeccion: rechaza juntar dos secciones ya nombradas y distintas', () => {
  let doc = crearDocumentoJu1Inicial()
  doc = { ...doc, estructura: agregarColumna(doc.estructura) } // 1x2
  const [a, b] = doc.estructura.celdas
  doc = etiquetarCelda(doc, a.id, 'Encabezado')
  doc = etiquetarCelda(doc, b.id, 'Pie')
  const r = extenderSeccion(doc, a.id, 0, 0, 0, 1)
  assert.equal(r.ok, false)
})

test('extenderSeccion: rechaza una selección que corta otra celda combinada a la mitad', () => {
  let doc = crearDocumentoJu1Inicial()
  doc = { ...doc, estructura: agregarColumna(doc.estructura) }
  doc = { ...doc, estructura: agregarColumna(doc.estructura) } // 1x3
  const combinada = combinarCeldas(doc.estructura, 0, 1, 0, 2) // combina las columnas 1-2 en una
  assert.equal(combinada.ok, true)
  if (!combinada.ok) return
  doc = { ...doc, estructura: combinada.valor }
  const celdaOrigen = doc.estructura.celdas.find((c) => c.columna === 0)!
  doc = etiquetarCelda(doc, celdaOrigen.id, 'Angosta')
  // Pedir agrandarla hasta la columna 1 nada más corta a la mitad la celda de columnas 1-2.
  const r = extenderSeccion(doc, celdaOrigen.id, 0, 0, 0, 1)
  assert.equal(r.ok, false)
})

test('extenderSeccion: una celdaId que ya no existe se rechaza en vez de romper', () => {
  const doc = crearDocumentoJu1Inicial()
  const r = extenderSeccion(doc, 'no-existe', 0, 0, 0, 0)
  assert.equal(r.ok, false)
})

test('parsearDocumentoJu1: un borrador viejo (texto plano, de antes de este cambio) se migra sin perderlo', () => {
  const viejo = 'const t = crearTitulo("hola")\nmostrar(t)'
  const doc = parsearDocumentoJu1(viejo)
  assert.equal(doc.main, viejo)
  assert.equal(doc.secciones.length, 0)
  assert.equal(doc.estructura.filas, 1)
})

// ── moverSeccion(): hacerle lugar a secciones nuevas en el medio ─────────────────────────
// Cuadrícula 4×3: encabezado (fila 0, todo el ancho), sobreMi | misHobbies (fila 1), footer
// (fila 2, todo el ancho) y una fila 3 todavía vacía.
function cuadriculaConPie(): EstructuraDePagina {
  const c = (id: string, fila: number, columna: number, expandeColumnas: number, seccion: string | null) => ({ id, fila, columna, expandeFilas: 1, expandeColumnas, seccion })
  return {
    filas: 4,
    columnas: 3,
    celdas: [
      c('enc', 0, 0, 3, 'encabezado'), c('s', 1, 0, 1, 'sobreMi'), c('h', 1, 1, 2, 'misHobbies'), c('pie', 2, 0, 3, 'footer'),
      c('v0', 3, 0, 1, null), c('v1', 3, 1, 1, null), c('v2', 3, 2, 1, null),
    ],
  }
}
const lugar = (e: EstructuraDePagina, id: string) => { const x = e.celdas.find((c) => c.id === id)!; return [x.fila, x.columna] }
const cubre = (e: EstructuraDePagina) => e.celdas.reduce((t, c) => t + c.expandeFilas * c.expandeColumnas, 0)

test('moverSeccion baja el pie a la fila vacía y deja libre la que ocupaba', () => {
  const r = moverSeccion(cuadriculaConPie(), 'pie', 3, 0)
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.deepEqual(lugar(r.valor, 'pie'), [3, 0])
  assert.equal(r.valor.celdas.find((c) => c.id === 'pie')!.seccion, 'footer')
  // La fila 2 quedó con 3 celdas vacías 1×1 y la cuadrícula sigue cubierta sin huecos.
  assert.equal(r.valor.celdas.filter((c) => c.fila === 2 && c.seccion === null).length, 3)
  assert.equal(cubre(r.valor), 12)
})

test('moverSeccion se corre lo justo si se suelta cerca del borde', () => {
  const r = moverSeccion(cuadriculaConPie(), 'pie', 3, 2)
  assert.equal(r.ok, true)
  if (r.ok) assert.deepEqual(lugar(r.valor, 'pie'), [3, 0])
  assert.deepEqual(ubicarSeccion(cuadriculaConPie(), 'pie', 9, 9), { fila: 3, columna: 0, expandeFilas: 1, expandeColumnas: 3 })
})

test('moverSeccion permite bajar una sección solo una fila aunque se superponga con su lugar', () => {
  const e: EstructuraDePagina = { filas: 3, columnas: 1, celdas: [
    { id: 'a', fila: 0, columna: 0, expandeFilas: 2, expandeColumnas: 1, seccion: 'alta' },
    { id: 'b', fila: 2, columna: 0, expandeFilas: 1, expandeColumnas: 1, seccion: null },
  ] }
  const r = moverSeccion(e, 'a', 1, 0)
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.deepEqual(lugar(r.valor, 'a'), [1, 0])
  assert.equal(cubre(r.valor), 3)
})

test('moverSeccion intercambia dos secciones del mismo tamaño y rechaza lo demás sin tocar nada', () => {
  const e = cuadriculaConPie()
  const swap = moverSeccion(e, 'pie', 0, 0)
  assert.equal(swap.ok, true)
  if (swap.ok) { assert.deepEqual(lugar(swap.valor, 'pie'), [0, 0]); assert.deepEqual(lugar(swap.valor, 'enc'), [2, 0]) }

  const otroTamano = moverSeccion(e, 'pie', 1, 0)
  assert.equal(otroTamano.ok, false)
  const sobreOtra = moverSeccion(e, 's', 1, 1)
  assert.equal(sobreOtra.ok, false)
  assert.equal(JSON.stringify(e), JSON.stringify(cuadriculaConPie()))
})

test('mover una sección no cambia su código: el documento sigue teniendo su pestaña', () => {
  const e = cuadriculaConPie()
  const r = moverSeccion(e, 'pie', 3, 0)
  assert.equal(r.ok, true)
  if (!r.ok) return
  const doc = { version: 1 as const, estructura: r.valor, secciones: [{ nombre: 'footer', contenido: 'generarFooter()' }], main: '' }
  assert.equal(doc.estructura.celdas.some((c) => c.seccion === 'footer'), true)
})

// ── ids de celda: una recarga no debe hacer desaparecer secciones ────────────────────────
test('tras recargar (contador de ids en 0) mover y crear secciones no borra otras', async () => {
  const A = await import('../src/lib/estructuraDePagina.ts?sesion-a')
  const B = await import('../src/lib/estructuraDePagina.ts?sesion-b')
  const ok = <T>(r: { ok: true; valor: T } | { ok: false; error: string }): T => { if (!r.ok) throw new Error(r.error); return r.valor }
  let d = A.crearDocumentoJu1Inicial()
  d = { ...d, estructura: A.agregarColumna(A.agregarColumna(d.estructura)) }
  for (let i = 0; i < 3; i++) d = { ...d, estructura: A.agregarFila(d.estructura) }
  d = ok(A.crearSeccion(d, 0, 0, 0, 2, 'encabezado'))
  d = ok(A.crearSeccion(d, 1, 0, 1, 0, 'sobreMi'))
  d = ok(A.crearSeccion(d, 1, 1, 1, 2, 'misHobbies'))
  d = ok(A.crearSeccion(d, 2, 0, 2, 2, 'footer'))
  d = B.parsearDocumentoJu1(A.serializarDocumentoJu1(d))
  const pie = d.estructura.celdas.find((c) => c.seccion === 'footer')!
  d = { ...d, estructura: ok(B.moverSeccion(d.estructura, pie.id, 3, 0)) }
  d = ok(B.crearSeccion(d, 2, 0, 2, 2, 'fragmentoDeLibro'))
  assert.deepEqual(d.estructura.celdas.map((c) => c.seccion).sort(), ['encabezado', 'footer', 'fragmentoDeLibro', 'misHobbies', 'sobreMi'])
  assert.equal(new Set(d.estructura.celdas.map((c) => c.id)).size, d.estructura.celdas.length)
})

test('un documento guardado con ids repetidos se repara al abrirlo', () => {
  const c = (id: string, fila: number, seccion: string | null) => ({ id, fila, columna: 0, expandeFilas: 1, expandeColumnas: 1, seccion })
  const texto = JSON.stringify({ version: 1, estructura: { filas: 2, columnas: 1, celdas: [c('celda-1', 0, 'a'), c('celda-1', 1, 'b')] }, secciones: [{ nombre: 'a', contenido: 'x' }, { nombre: 'b', contenido: 'y' }], main: '' })
  const d = parsearDocumentoJu1(texto)
  assert.equal(new Set(d.estructura.celdas.map((x) => x.id)).size, 2)
  assert.deepEqual(d.estructura.celdas.map((x) => x.seccion), ['a', 'b'])
})

test('nombrar una celda con el nombre de una sección huérfana la reconecta con su código', () => {
  const base = crearDocumentoJu1Inicial()
  const doc = { ...base, secciones: [{ nombre: 'footer', contenido: 'generarFooter()' }] }
  const r = crearSeccion(doc, 0, 0, 0, 0, 'Footer')
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.deepEqual(r.valor.secciones, [{ nombre: 'footer', contenido: 'generarFooter()' }])
  assert.equal(r.valor.estructura.celdas[0]!.seccion, 'footer')
})

// ── pestañas de secciones que ya no existen ──────────────────────────────────────────────
function docConPie() {
  const e = cuadriculaConPie()
  return {
    version: 1 as const,
    estructura: e,
    secciones: [
      { nombre: 'encabezado', contenido: 'a' }, { nombre: 'sobreMi', contenido: '' }, { nombre: 'misHobbies', contenido: '' }, { nombre: 'footer', contenido: 'generarFooter()' },
    ],
    main: '',
  }
}

test('quitar una fila se lleva las secciones que vivían ahí, con su pestaña', () => {
  const d = docConPie()
  d.estructura.celdas = d.estructura.celdas.filter((c) => c.fila !== 3) // sin la fila vacía de abajo
  d.estructura.filas = 3
  assert.deepEqual(seccionesDeLaUltima(d.estructura, 'fila'), ['footer'])
  const r = eliminarFilaDelDocumento(d)
  assert.equal(r.ok, true)
  if (r.ok) assert.deepEqual(r.valor.secciones.map((s) => s.nombre), ['encabezado', 'sobreMi', 'misHobbies'])
})

test('quitar una columna con una sección combinada que la invade se rechaza sin tocar nada', () => {
  const d = docConPie()
  const r = eliminarColumnaDelDocumento(d)
  assert.equal(r.ok, false)
  assert.equal(d.secciones.length, 4)
})

test('al abrir un documento, las pestañas vacías sin celda se descartan y las que tienen código se conservan', () => {
  const d = docConPie()
  const texto = JSON.stringify({ ...d, secciones: [...d.secciones, { nombre: 'fantasma', contenido: '' }, { nombre: 'conCodigo', contenido: 'mostrar(1)' }] })
  const abierto = parsearDocumentoJu1(texto)
  assert.deepEqual(abierto.secciones.map((s) => s.nombre), ['encabezado', 'sobreMi', 'misHobbies', 'footer', 'conCodigo'])
  assert.deepEqual(sinSeccionesHuerfanas(abierto).secciones.map((s) => s.nombre), ['encabezado', 'sobreMi', 'misHobbies', 'footer'])
})

// ── borrar todas las secciones no debe romper ni reiniciar la página ─────────────────────
test('separar una sección 1x1 la quita de verdad: ni etiqueta suelta ni mostrar() colgando en el main', () => {
  const d = { ...docConPie(), main: 'mostrar(encabezado)\nmostrar(sobreMi);\nmostrar( misHobbies ) // hobbies\nmostrar(footer)\nconsole.log("hola")' }
  const s = d.estructura.celdas.find((c) => c.seccion === 'sobreMi')!
  const r = separarCeldaDelDocumento(d, s.id)
  assert.equal(r.estructura.celdas.find((c) => c.id === s.id)!.seccion, null)
  assert.equal(r.secciones.some((x) => x.nombre === 'sobreMi'), false)
  assert.equal(r.main, 'mostrar(encabezado)\nmostrar( misHobbies ) // hobbies\nmostrar(footer)\nconsole.log("hola")')
})

test('al borrar TODAS las secciones el documento queda vacío pero es del alumno: no se considera virgen', () => {
  let d = docConPie()
  for (const c of d.estructura.celdas.filter((x) => x.seccion !== null)) d = separarCeldaDelDocumento(d, c.id) as typeof d
  assert.equal(d.secciones.length, 0)
  assert.equal(d.estructura.celdas.every((c) => c.seccion === null), true)
  assert.equal(esDocumentoVirgen(d), false, 'sigue teniendo 4×3 celdas: la estructura heredada no debe pisarla')
  assert.equal(esDocumentoVirgen(crearDocumentoJu1Inicial()), true)
})

test('una celda con etiqueta pero sin pestaña (daño de antes) vuelve a ser una celda vacía al abrir', () => {
  const d = docConPie()
  const roto = { ...d, secciones: d.secciones.filter((s) => s.nombre !== 'footer'), main: 'mostrar(footer)\nmostrar(encabezado)' }
  const abierto = parsearDocumentoJu1(JSON.stringify(roto))
  assert.equal(abierto.estructura.celdas.find((c) => c.id === 'pie')!.seccion, null)
  assert.equal(sinMostrarDe('mostrar(a)\nmostrar(b)', ['a']), 'mostrar(b)')
})
