// El motor multi-pestaña de Ju1 (construirSrcdocJu1/ejecutarPreviewJu1 en lib/sandbox.ts)
// corre con el runtime REAL (helpers/runtimeReal.ts: jsdom con runScripts, no un mock) — así
// se prueba lo mismo que ejecuta un estudiante. Ver tests/personalizacion.test.ts para las
// herramientas de estilo sueltas; acá lo que importa es la composición de varias pestañas.
import assert from 'node:assert/strict'
import test from 'node:test'
import { agregarColumna, agregarFila, crearDocumentoJu1Inicial, crearSeccion } from '../src/lib/estructuraDePagina.ts'
import type { DocumentoJu1 } from '../src/lib/tipos.ts'
import { ejecutarJu1Real, parser } from './helpers/runtimeReal.ts'

function doc(html: string) {
  return parser.parseFromString(`<body>${html}</body>`, 'text/html')
}

test('main hace mostrar() de cada sección y el HTML final trae el contenido de las dos', async () => {
  const doc0 = crearDocumentoJu1Inicial()
  const a = crearSeccion(doc0, 0, 0, 0, 0, 'Encabezado')
  assert.equal(a.ok, true)
  if (!a.ok) return
  const documento: DocumentoJu1 = {
    ...a.valor,
    secciones: [{ nombre: 'encabezado', contenido: 'mostrar(crearTitulo("Hola"))' }],
    main: 'mostrar(encabezado)',
  }
  const r = await ejecutarJu1Real(documento, {})
  assert.equal(r.ok, true, r.error)
  assert.equal(doc(r.html).querySelector('h1')?.textContent, 'Hola')
})

test('la posición sale de la cuadrícula, no del orden de los mostrar() en el main', async () => {
  let d = crearDocumentoJu1Inicial()
  const angosta = crearSeccion(d, 0, 0, 0, 0, 'Angosta')
  assert.equal(angosta.ok, true)
  if (!angosta.ok) return
  d = angosta.valor
  d = { ...d, estructura: agregarColumna(d.estructura) } // 1x2: la nueva columna, sin usar
  const grande = crearSeccion(d, 0, 1, 0, 1, 'Grande')
  assert.equal(grande.ok, true)
  if (!grande.ok) return
  d = grande.valor

  const documento: DocumentoJu1 = {
    ...d,
    secciones: [
      { nombre: 'angosta', contenido: 'mostrar(crearParrafo("angosta"))' },
      { nombre: 'grande', contenido: 'mostrar(crearParrafo("grande"))' },
    ],
    // A propósito en el orden "al revés" de la cuadrícula: mostrar "grande" primero.
    main: 'mostrar(grande)\nmostrar(angosta)',
  }
  const r = await ejecutarJu1Real(documento, {})
  assert.equal(r.ok, true, r.error)
  const html = doc(r.html)
  const divs = [...html.querySelectorAll('body > div > div')]
  const angostaDiv = divs.find((el) => el.textContent?.includes('angosta'))! as HTMLElement
  const grandeDiv = divs.find((el) => el.textContent?.includes('grande'))! as HTMLElement
  assert.equal(angostaDiv.style.gridColumn, '1 / span 1')
  assert.equal(grandeDiv.style.gridColumn, '2 / span 1')
})

test('datos está disponible adentro de una sección, igual que en portafolio.js de un solo archivo', async () => {
  const doc0 = crearDocumentoJu1Inicial()
  const a = crearSeccion(doc0, 0, 0, 0, 0, 'Encabezado')
  assert.equal(a.ok, true)
  if (!a.ok) return
  const documento: DocumentoJu1 = {
    ...a.valor,
    secciones: [{ nombre: 'encabezado', contenido: 'mostrar(crearTitulo(datos.nombre))' }],
    main: 'mostrar(encabezado)',
  }
  const r = await ejecutarJu1Real(documento, { nombre: 'Ana' })
  assert.equal(r.ok, true, r.error)
  assert.equal(doc(r.html).querySelector('h1')?.textContent, 'Ana')
})

test('un error en una sección se reporta con el nombre de ESA sección, no de portafolio.js', async () => {
  const doc0 = crearDocumentoJu1Inicial()
  const a = crearSeccion(doc0, 0, 0, 0, 0, 'SobreMi')
  assert.equal(a.ok, true)
  if (!a.ok) return
  const documento: DocumentoJu1 = {
    ...a.valor,
    secciones: [{ nombre: 'sobreMi', contenido: 'mostrar(crearParrafo(algoQueNoExiste))' }],
    main: 'mostrar(sobreMi)',
  }
  const r = await ejecutarJu1Real(documento, {})
  assert.equal(r.ok, false)
  assert.equal(r.archivo, 'seccion-sobreMi.js')
})

test('un error en el main se reporta con portafolio.js', async () => {
  const doc0 = crearDocumentoJu1Inicial()
  const a = crearSeccion(doc0, 0, 0, 0, 0, 'Encabezado')
  assert.equal(a.ok, true)
  if (!a.ok) return
  const documento: DocumentoJu1 = {
    ...a.valor,
    secciones: [{ nombre: 'encabezado', contenido: 'mostrar(crearTitulo("hola"))' }],
    main: 'mostrar(estoNoExiste)',
  }
  const r = await ejecutarJu1Real(documento, {})
  assert.equal(r.ok, false)
  assert.equal(r.archivo, 'portafolio.js')
})

test('cambiarColorFondo(color) desde una sección pinta ESA sección, no toda la página', async () => {
  const doc0 = crearDocumentoJu1Inicial()
  const encabezado = crearSeccion(doc0, 0, 0, 0, 0, 'Encabezado')
  assert.equal(encabezado.ok, true)
  if (!encabezado.ok) return
  let d = { ...encabezado.valor, estructura: agregarColumna(encabezado.valor.estructura) } // 1x2
  const pie = crearSeccion(d, 0, 1, 0, 1, 'Pie')
  assert.equal(pie.ok, true)
  if (!pie.ok) return
  d = pie.valor

  const documento: DocumentoJu1 = {
    ...d,
    secciones: [
      { nombre: 'encabezado', contenido: 'cambiarColorFondo("#eef1e6")\nmostrar(crearTitulo("hola"))' },
      { nombre: 'pie', contenido: 'mostrar(crearParrafo("pie"))' },
    ],
    main: 'mostrar(encabezado)\nmostrar(pie)',
  }
  const r = await ejecutarJu1Real(documento, {})
  assert.equal(r.ok, true, r.error)
  const html = doc(r.html)
  // Hay un <style> siempre (el que resetea el padding del body para que las secciones lleguen
  // al borde) pero NINGUNO con --color-fondo — el fondo quedó puesto directo en el div de ESA
  // sección, no en la variable global de toda la página.
  assert.ok(![...html.querySelectorAll('style')].some((e) => e.textContent?.includes('--color-fondo')))
  const pintados = [...html.querySelectorAll('div')].filter((d) => (d as HTMLElement).style.backgroundColor !== '') as HTMLElement[]
  assert.equal(pintados.length, 1, 'solo un div quedó pintado — el pie no se contagió')
  assert.equal(pintados[0].style.backgroundColor, 'rgb(238, 241, 230)')
  assert.ok(pintados[0].textContent?.includes('hola'), 'el div pintado es el del encabezado, no el del pie')

  // El MISMO div es el que está posicionado en el grid — no un envoltorio invisible aparte
  // (ese envoltorio era el bug real: se estiraba él, vacío, y el color se quedaba del tamaño
  // de su contenido en vez de llenar toda la celda — jsdom no calcula layout, pero si el color
  // vive en el elemento que YA tiene el grid-row/grid-column puesto, no hay más capas que
  // puedan volver a romperlo).
  assert.notEqual(pintados[0].style.gridColumn, '', 'la posición está puesta en el mismo div que el color')
  assert.equal(pintados[0].parentElement?.style.display, 'grid', 'la sección es hija DIRECTA del contenedor grid, sin un envoltorio en el medio')
})

test('cambiarColorFondo(color) desde el main pinta toda la página compuesta', async () => {
  const doc0 = crearDocumentoJu1Inicial()
  const a = crearSeccion(doc0, 0, 0, 0, 0, 'Encabezado')
  assert.equal(a.ok, true)
  if (!a.ok) return
  const documento: DocumentoJu1 = {
    ...a.valor,
    secciones: [{ nombre: 'encabezado', contenido: 'mostrar(crearTitulo("hola"))' }],
    main: 'cambiarColorFondo("#f2ece0")\nmostrar(encabezado)',
  }
  const r = await ejecutarJu1Real(documento, {})
  assert.equal(r.ok, true, r.error)
  const html = doc(r.html)
  assert.ok(![...html.querySelectorAll('style')].some((e) => e.textContent?.includes('--color-fondo')))
  // El contenedor grid (el div, hermano del <style> de reseteo) es "pagina" en el main — ahí es
  // donde queda el fondo con un solo argumento.
  const grid = html.querySelector('body > div[style*="grid"]') as HTMLElement
  assert.equal(grid.style.backgroundColor, 'rgb(242, 236, 224)')
})

test('sin gap entre celdas, sin padding del body, y la última fila llega hasta abajo', async () => {
  let d = crearDocumentoJu1Inicial()
  const encabezado = crearSeccion(d, 0, 0, 0, 0, 'Encabezado')
  assert.equal(encabezado.ok, true)
  if (!encabezado.ok) return
  d = { ...encabezado.valor, estructura: agregarFila(encabezado.valor.estructura) } // 2x1
  const pie = crearSeccion(d, 1, 0, 1, 0, 'Pie')
  assert.equal(pie.ok, true)
  if (!pie.ok) return
  d = pie.valor

  const documento: DocumentoJu1 = {
    ...d,
    secciones: [
      { nombre: 'encabezado', contenido: 'mostrar(crearTitulo("hola"))' },
      { nombre: 'pie', contenido: 'mostrar(crearParrafo("chau"))' },
    ],
    main: 'mostrar(encabezado)\nmostrar(pie)',
  }
  const r = await ejecutarJu1Real(documento, {})
  assert.equal(r.ok, true, r.error)
  const html = doc(r.html)

  const estiloReseteo = [...html.querySelectorAll('style')].find((e) => e.textContent?.includes('padding: 0'))
  assert.ok(estiloReseteo, 'debe resetear el padding del body — si no, queda un margen alrededor de todo')

  const grid = html.querySelector('body > div[style*="grid"]') as HTMLElement
  assert.equal(grid.style.gap, '0px', 'sin espacio entre secciones — quedan pegadas')
  assert.match(grid.style.minHeight, /100vh/, 'el grid llega al menos a la altura de la pantalla')
  assert.match(grid.style.gridTemplateRows, /1fr/, 'la última fila (el pie) absorbe el espacio que sobra')
})

test('con una sola fila, la plantilla de filas no queda como "repeat(0, ...)" (CSS inválido)', async () => {
  const doc0 = crearDocumentoJu1Inicial()
  const a = crearSeccion(doc0, 0, 0, 0, 0, 'Encabezado')
  assert.equal(a.ok, true)
  if (!a.ok) return
  const documento: DocumentoJu1 = {
    ...a.valor,
    secciones: [{ nombre: 'encabezado', contenido: 'mostrar(crearTitulo("hola"))' }],
    main: 'mostrar(encabezado)',
  }
  const r = await ejecutarJu1Real(documento, {})
  assert.equal(r.ok, true, r.error)
  const grid = doc(r.html).querySelector('body > div[style*="grid"]') as HTMLElement
  assert.doesNotMatch(grid.style.gridTemplateRows, /repeat\(0/)
})

test('una sección con crearSeccion() adentro puede subdividirse a sí misma', async () => {
  const doc0 = crearDocumentoJu1Inicial()
  const a = crearSeccion(doc0, 0, 0, 0, 0, 'Cuerpo')
  assert.equal(a.ok, true)
  if (!a.ok) return
  const documento: DocumentoJu1 = {
    ...a.valor,
    secciones: [
      {
        nombre: 'cuerpo',
        contenido: 'const fila = crearSeccion("encabezado")\nmostrar(fila)\nagregarA(fila, crearParrafo("x"))',
      },
    ],
    main: 'mostrar(cuerpo)',
  }
  const r = await ejecutarJu1Real(documento, {})
  assert.equal(r.ok, true, r.error)
  assert.ok(doc(r.html).querySelector('.fila p'))
})

// ── generarEncabezado() / generarFooter() ────────────────────────────────────────────────
// Cuadrícula 3×2: encabezado (arriba, 2 columnas), sobreMi | hobbies (medio), footer (abajo, 2 columnas).
function cuadricula3x2(codigos: { encabezado?: string; footer?: string; sobreMi?: string }): DocumentoJu1 {
  const celda = (id: string, fila: number, columna: number, expandeColumnas: number, seccion: string) => ({ id, fila, columna, expandeFilas: 1, expandeColumnas, seccion })
  return {
    version: 1,
    estructura: { filas: 3, columnas: 2, celdas: [celda('a', 0, 0, 2, 'encabezado'), celda('b', 1, 0, 1, 'sobreMi'), celda('c', 1, 1, 1, 'hobbies'), celda('d', 2, 0, 2, 'footer')] },
    secciones: [
      { nombre: 'encabezado', contenido: `${codigos.encabezado ?? ''}\nmostrar(crearTitulo("Hola"))` },
      { nombre: 'sobreMi', contenido: `${codigos.sobreMi ?? ''}\nmostrar(crearParrafo("yo"))` },
      { nombre: 'hobbies', contenido: 'mostrar(crearParrafo("leer"))' },
      { nombre: 'footer', contenido: `${codigos.footer ?? ''}\nmostrar(crearParrafo("fin"))` },
    ],
    main: 'mostrar(encabezado)\nmostrar(sobreMi)\nmostrar(hobbies)\nmostrar(footer)',
  }
}
const filasDe = (html: string) => (doc(html).querySelector('body > div[style*="grid"]') as HTMLElement).style.gridTemplateRows

test('sin generarFooter() todo sigue igual: la última fila absorbe el espacio', async () => {
  const r = await ejecutarJu1Real(cuadricula3x2({}), {})
  assert.equal(r.ok, true, r.error)
  assert.equal(filasDe(r.html), 'auto auto minmax(auto, 1fr)')
})

test('generarEncabezado() y generarFooter() miden su fila por contenido; el espacio sobrante va al medio', async () => {
  const r = await ejecutarJu1Real(cuadricula3x2({ encabezado: 'generarEncabezado()', footer: 'generarFooter()' }), {})
  assert.equal(r.ok, true, r.error)
  assert.equal(filasDe(r.html), 'auto minmax(auto, 1fr) auto')
})

test('generarFooter() en una sección que no está abajo explica por qué no se puede', async () => {
  const r = await ejecutarJu1Real(cuadricula3x2({ sobreMi: 'generarFooter()' }), {})
  assert.equal(r.ok, false)
  assert.match(r.error ?? '', /generarFooter\(\) solo funciona en la fila de abajo/)
  assert.equal(r.archivo, 'seccion-sobreMi.js')
})

test('generarEncabezado() fuera de la fila de arriba no se puede', async () => {
  const r = await ejecutarJu1Real(cuadricula3x2({ footer: 'generarEncabezado()' }), {})
  assert.equal(r.ok, false)
  assert.match(r.error ?? '', /generarEncabezado\(\) solo funciona en la fila de arriba/)
})

test('un pie con otra sección a su lado que no es pie no se puede', async () => {
  const d = cuadricula3x2({ footer: 'generarFooter()' })
  // El pie ocupa solo la columna izquierda y "hobbies" pasa a su derecha, abajo.
  d.estructura.celdas = [
    { id: 'a', fila: 0, columna: 0, expandeFilas: 1, expandeColumnas: 2, seccion: 'encabezado' },
    { id: 'b', fila: 1, columna: 0, expandeFilas: 1, expandeColumnas: 2, seccion: 'sobreMi' },
    { id: 'd', fila: 2, columna: 0, expandeFilas: 1, expandeColumnas: 1, seccion: 'footer' },
    { id: 'c', fila: 2, columna: 1, expandeFilas: 1, expandeColumnas: 1, seccion: 'hobbies' },
  ]
  const r = await ejecutarJu1Real(d, {})
  assert.equal(r.ok, false)
  assert.match(r.error ?? '', /no puede ir con otra sección en su misma fila/)
  assert.equal(r.archivo, 'seccion-footer.js')
})

test('un pie de varias columnas es válido si todas las secciones de la fila lo usan', async () => {
  const d = cuadricula3x2({ footer: 'generarFooter()' })
  d.estructura.celdas = [
    { id: 'a', fila: 0, columna: 0, expandeFilas: 1, expandeColumnas: 2, seccion: 'encabezado' },
    { id: 'b', fila: 1, columna: 0, expandeFilas: 1, expandeColumnas: 2, seccion: 'sobreMi' },
    { id: 'd', fila: 2, columna: 0, expandeFilas: 1, expandeColumnas: 1, seccion: 'footer' },
    { id: 'c', fila: 2, columna: 1, expandeFilas: 1, expandeColumnas: 1, seccion: 'hobbies' },
  ]
  d.secciones.find((s) => s.nombre === 'hobbies')!.contenido = 'generarFooter()\nmostrar(crearParrafo("leer"))'
  const r = await ejecutarJu1Real(d, {})
  assert.equal(r.ok, true, r.error)
  assert.equal(filasDe(r.html), 'auto minmax(auto, 1fr) auto')
})
