// El motor multi-pestaña de Ju1 (construirSrcdocJu1/ejecutarPreviewJu1 en lib/sandbox.ts)
// corre con el runtime REAL (helpers/runtimeReal.ts: jsdom con runScripts, no un mock) — así
// se prueba lo mismo que ejecuta un estudiante. Ver tests/personalizacion.test.ts para las
// herramientas de estilo sueltas; acá lo que importa es la composición de varias pestañas.
import assert from 'node:assert/strict'
import test from 'node:test'
import { agregarColumna, crearDocumentoJu1Inicial, crearSeccion } from '../src/lib/estructuraDePagina.ts'
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
  // Sin <style> de por medio: el fondo quedó puesto directo en el div de ESA sección.
  assert.equal(html.querySelector('style'), null)
  const pintados = [...html.querySelectorAll('div')].filter((d) => (d as HTMLElement).style.backgroundColor !== '') as HTMLElement[]
  assert.equal(pintados.length, 1, 'solo un div quedó pintado — el pie no se contagió')
  assert.equal(pintados[0].style.backgroundColor, 'rgb(238, 241, 230)')
  assert.ok(pintados[0].textContent?.includes('hola'), 'el div pintado es el del encabezado, no el del pie')
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
  assert.equal(html.querySelector('style'), null)
  // El contenedor grid (el primer div, el que envuelve todas las secciones) es "pagina" en el
  // main — ahí es donde queda el fondo con un solo argumento.
  const grid = html.querySelector('body > div') as HTMLElement
  assert.equal(grid.style.backgroundColor, 'rgb(242, 236, 224)')
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
