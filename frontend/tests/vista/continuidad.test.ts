import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { ventana } from './entorno.ts'
import { ServidorFalso } from './servidorFalso.ts'
import { crearDocumentoJu1Inicial, crearSeccion, serializarDocumentoJu1 } from '../../src/lib/estructuraDePagina.ts'

const { montar, hasta } = await import('./montar.ts')

beforeEach(() => { ventana.localStorage.clear(); ventana.sessionStorage.clear() })

function fuente() {
  const r = crearSeccion(crearDocumentoJu1Inicial(), 0, 0, 0, 0, 'Mi identidad')
  assert.equal(r.ok, true)
  if (!r.ok) throw new Error('estructura inicial')
  return { ...r.valor, main: 'mostrar(miIdentidad)', secciones: [{ nombre: 'miIdentidad', contenido: 'mostrar(crearTitulo("Mi diseño único"))' }] }
}

test('E12→E13→E7 conserva secciones y estilo al cambiar de día y recargar', async () => {
  const s = new ServidorFalso({ Ju1: 'open', V1: 'open' })
  const inicial = fuente()
  s.borrador('e12', serializarDocumentoJu1(inicial), 'accepted')
  let p = await montar(s, '/portafolio?e=13')
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'E13 listo')
  assert.equal(p.editor()!.value, inicial.main)
  await p.pestana('seccion-miIdentidad.js')
  const estilo = inicial.secciones[0].contenido + '\ncambiarColorFondo("#abcdef")'
  await p.escribir(estilo, 'seccion-miIdentidad.js')
  await hasta(() => s.progreso.get('e13')?.draft_code.includes('#abcdef') === true, 'estilo guardado')
  await p.desmontar()
  ventana.sessionStorage.clear()
  p = await montar(s, '/portafolio?e=7')
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'E7 listo')
  assert.match(p.editor()!.value, /mostrar\(miIdentidad\)/)
  await p.pestana('seccion-miIdentidad.js')
  assert.equal(p.editor('seccion-miIdentidad.js')!.value, estilo)
  await p.escribir(estilo + '\n// continúa en V1', 'seccion-miIdentidad.js')
  await hasta(() => !!s.progreso.get('e7')?.draft_code.includes('continúa en V1'), 'E7 guardado')
  await p.desmontar()
  ventana.sessionStorage.clear()
  p = await montar(s, '/portafolio?e=7')
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'recarga E7')
  await p.pestana('seccion-miIdentidad.js')
  assert.match(p.editor('seccion-miIdentidad.js')!.value, /continúa en V1/)
  assert.deepEqual(JSON.parse(s.progreso.get('e7')!.draft_code).estructura, inicial.estructura)
})

test('E8 visible ejecuta el carrusel, reemplaza su contenido y desmonta el iframe al salir', async () => {
  const s = new ServidorFalso({ V1: 'open' })
  const code = 'const c = crearCarrusel(); mostrar(c); cadaSegundo(c, ["Uno", "Dos"], crearParrafo)'
  s.borrador('e8', code)
  const p = await montar(s, '/portafolio?e=8')
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'E8 listo')
  await p.pulsar('Ejecutar')
  await hasta(() => p.texto().includes('ejecución sin errores'), 'ejecución')
  const frame = p.contenedor.querySelector<HTMLIFrameElement>('.pv-marco')!
  assert.equal(frame.getAttribute('sandbox'), 'allow-scripts')
  const callbacks: (() => void)[] = []
  const vivo = new JSDOM(frame.getAttribute('srcdoc')!, {
    runScripts: 'dangerously', url: 'about:srcdoc',
    beforeParse(w) { w.setInterval = ((f: () => void) => { callbacks.push(f); return 1 }) as typeof w.setInterval },
  })
  try {
    assert.equal(callbacks.length, 1, 'la preview visible debe conservar el temporizador del programa')
    const carousel = vivo.window.document.querySelector('[data-carrusel]')!
    assert.equal(carousel.textContent, 'Uno')
    callbacks[0]()
    assert.equal(carousel.textContent, 'Dos')
    for (let i = 0; i < 10; i++) callbacks[0]()
    assert.equal(carousel.children.length, 1, 'no acumula nodos')
    await p.ir('/mapa')
    assert.equal(frame.isConnected, false, 'el navegador destruye el contexto y sus timers al salir')
  } finally { vivo.window.close() }
})
