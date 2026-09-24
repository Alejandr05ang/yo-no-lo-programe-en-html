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
