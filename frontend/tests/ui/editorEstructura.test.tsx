// EditorEstructura montado de verdad con React en jsdom: la selección de rango (dos clics,
// como elegir un rango en una planilla) vive en el estado del componente, así que no alcanza
// con probar la lógica pura de estructuraDePagina.ts sola — acá se prueba el flujo de clics
// tal como lo haría un estudiante.
import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://tutoriasdeverano.netlify.app/portafolio?e=12' })
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
})

const React = await import('react')
const { act, createElement, useState } = React
const { createRoot } = await import('react-dom/client')
const { EditorEstructura } = await import('../../src/features/estructura/EditorEstructura.tsx')
const { crearDocumentoJu1Inicial, crearSeccion, agregarColumna, eliminarFila, eliminarColumna } =
  await import('../../src/lib/estructuraDePagina.ts')
type DocumentoJu1 = ReturnType<typeof crearDocumentoJu1Inicial>

// Envoltorio con estado propio, tal como lo tendrá VistaEstudiante.tsx: EditorEstructura es
// controlado (recibe `estructura` y avisa por callbacks), no guarda nada solo.
function Arnes({ inicial, alAbrirSeccion }: { inicial: DocumentoJu1; alAbrirSeccion: (nombre: string) => void }) {
  const [doc, setDoc] = useState(inicial)
  return createElement(EditorEstructura, {
    estructura: doc.estructura,
    onAgregarFila: () => {},
    onAgregarColumna: () => setDoc((d) => ({ ...d, estructura: agregarColumna(d.estructura) })),
    onEliminarFila: () => {
      const r = eliminarFila(doc.estructura)
      if (!r.ok) return r.error
      setDoc((d) => ({ ...d, estructura: r.valor }))
      return null
    },
    onEliminarColumna: () => {
      const r = eliminarColumna(doc.estructura)
      if (!r.ok) return r.error
      setDoc((d) => ({ ...d, estructura: r.valor }))
      return null
    },
    onCrearSeccion: (fi: number, ci: number, ff: number, cf: number, etq: string) => {
      const r = crearSeccion(doc, fi, ci, ff, cf, etq)
      if (!r.ok) return r.error
      setDoc(r.valor)
      return null
    },
    onSepararCelda: () => {},
    onAbrirSeccion: alAbrirSeccion,
  })
}

/** Escribe como lo haría el navegador: cambia el valor y dispara el evento input — asignar
 *  `.value` directo no alcanza porque React reemplaza el setter nativo para detectar cambios. */
async function escribir(el: HTMLInputElement, valor: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(el, valor)
    el.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  })
}

async function montar(inicial: DocumentoJu1, alAbrirSeccion: (nombre: string) => void = () => {}) {
  const contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  const raiz = createRoot(contenedor)
  await act(async () => {
    raiz.render(createElement(Arnes, { inicial, alAbrirSeccion }))
  })
  return {
    celdas: () => [...contenedor.querySelectorAll('.ee-celda')] as HTMLButtonElement[],
    boton: (texto: string) => [...contenedor.querySelectorAll('button')].find((b) => b.textContent === texto)!,
    input: () => contenedor.querySelector('.ee-form-input') as HTMLInputElement,
    contenedor,
    desmontar: () => act(() => raiz.unmount()),
  }
}

test('un solo clic en una celda y "crear sección" la etiqueta sin pedir combinar nada', async () => {
  const ui = await montar(crearDocumentoJu1Inicial())
  await act(async () => { ui.celdas()[0].click() })
  assert.match(ui.contenedor.querySelector('.ee-form-ayuda')!.textContent ?? '', /sin combinar|Nombrá esta celda/)
  await escribir(ui.input(), 'Encabezado')
  await act(async () => { ui.boton('Crear sección').click() })
  assert.equal(ui.celdas().length, 1)
  assert.equal(ui.celdas()[0].textContent, 'encabezado')
  await ui.desmontar()
})

test('dos clics en celdas distintas seleccionan el rectángulo entre ellas y lo combinan', async () => {
  const ui = await montar(crearDocumentoJu1Inicial())
  // 1x1 → agregar columna para tener 1x2
  await act(async () => { ui.boton('+ agregar columna').click() })
  assert.equal(ui.celdas().length, 2)

  await act(async () => { ui.celdas()[0].click() })
  await act(async () => { ui.celdas()[1].click() })
  await escribir(ui.input(), 'Encabezado')
  await act(async () => { ui.boton('Crear sección').click() })

  const celdas = ui.celdas()
  assert.equal(celdas.length, 1, 'las dos celdas se combinaron en una')
  assert.equal(celdas[0].textContent, 'encabezado')
  await ui.desmontar()
})

test('clic en una celda ya etiquetada abre su sección en vez de iniciar una selección', async () => {
  let doc = crearDocumentoJu1Inicial()
  const r = crearSeccion(doc, 0, 0, 0, 0, 'Encabezado')
  assert.equal(r.ok, true)
  if (!r.ok) return
  doc = r.valor

  const abiertas: string[] = []
  const ui = await montar(doc, (nombre) => abiertas.push(nombre))
  await act(async () => { ui.celdas()[0].click() })
  assert.deepEqual(abiertas, ['encabezado'])
  assert.equal(ui.contenedor.querySelector('.ee-form'), null, 'no debe aparecer el formulario de nombrar')
  await ui.desmontar()
})

test('eliminar la última fila avisa en vez de fallar en silencio', async () => {
  const ui = await montar(crearDocumentoJu1Inicial())
  await act(async () => { ui.boton('eliminar fila').click() })
  assert.equal(ui.celdas().length, 1, 'no se borró la única fila')
  assert.match(ui.contenedor.querySelector('[role="alert"]')?.textContent ?? '', /al menos una fila/)
  await ui.desmontar()
})

test('un nombre vacío no crea la sección y lo avisa', async () => {
  const ui = await montar(crearDocumentoJu1Inicial())
  await act(async () => { ui.celdas()[0].click() })
  await act(async () => { ui.boton('Crear sección').click() })
  assert.equal(ui.celdas()[0].textContent, '···', 'sigue sin etiquetar')
  assert.match(ui.contenedor.querySelector('[role="alert"]')?.textContent ?? '', /nombre/)
  await ui.desmontar()
})
