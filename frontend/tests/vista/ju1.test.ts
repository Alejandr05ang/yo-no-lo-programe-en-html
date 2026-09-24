// Encargo 12 (Ju1, modelo 'grid') en la pantalla REAL del estudiante: la herramienta visual de
// cuadrícula, las pestañas por sección, y que lo que se autoguarda sea el documento serializado
// (no JS) — de punta a punta, con el runtime real del sandbox (tests/vista/entorno.ts).
import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { ventana } from './entorno.ts'
import { ServidorFalso } from './servidorFalso.ts'

const { act } = await import('react')
const { montar, hasta } = await import('./montar.ts')

beforeEach(() => {
  ventana.localStorage.clear()
  ventana.sessionStorage.clear()
})

/** Escribe en un <input> como lo haría el navegador (mismo truco que en los .test.tsx). */
async function escribirEnInput(el: HTMLInputElement, valor: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(ventana.HTMLInputElement.prototype, 'value')!.set!.call(el, valor)
    el.dispatchEvent(new ventana.Event('input', { bubbles: true }))
  })
}

test('E12: armar una sección con la herramienta visual crea su propia pestaña de código', async () => {
  const s = new ServidorFalso({ Ju1: 'open' })
  const p = await montar(s, '/portafolio?e=12')
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'carga e12')

  // La celda inicial (1x1, sin nombre todavía) se etiqueta con un solo clic — no hace falta
  // combinar nada para una sola celda.
  await p.pulsar('···')
  const input = p.contenedor.querySelector<HTMLInputElement>('.ee-form-input')
  assert.ok(input, 'debe aparecer el formulario para nombrar la sección')
  await escribirEnInput(input!, 'Encabezado')
  await p.pulsar('Crear sección')

  // Ahora existe una pestaña "seccion-encabezado.js" con su propio editor, editable.
  await p.pestana('seccion-encabezado.js')
  const editorSeccion = p.editor('seccion-encabezado.js')
  assert.ok(editorSeccion, 'la pestaña de la sección tiene su propio editor')
  assert.equal(editorSeccion!.readOnly, false)

  await p.escribir('mostrar(crearTitulo("Hola"))', 'seccion-encabezado.js')
  await p.pestana('portafolio.js')
  await p.escribir('mostrar(encabezado)', 'portafolio.js')

  await p.pulsar('Ejecutar')
  await hasta(() => p.texto().includes('ejecución sin errores'), 'corre sin errores')

  // Lo que se autoguarda es el documento serializado, no JS — con la sección y el main que
  // acabamos de escribir.
  await hasta(() => !!s.progreso.get('e12')?.draft_code.includes('"encabezado"'), 'autoguardado con la sección')
  const doc = JSON.parse(s.progreso.get('e12')!.draft_code)
  assert.equal(doc.version, 1)
  assert.equal(doc.secciones[0].nombre, 'encabezado')
  assert.match(doc.secciones[0].contenido, /crearTitulo\("Hola"\)/)
  assert.match(doc.main, /mostrar\(encabezado\)/)
})
