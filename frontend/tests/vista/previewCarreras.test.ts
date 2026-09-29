import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { ventana } from './entorno.ts'
import { ServidorFalso } from './servidorFalso.ts'

const { act } = await import('react')
const { montar, hasta, esperar } = await import('./montar.ts')
beforeEach(() => { ventana.localStorage.clear(); ventana.sessionStorage.clear() })

/** Retrasa solo la entrega de un postMessage real; el código y el sandbox siguen reales. */
function retenerPreview() {
  const original = ventana.dispatchEvent.bind(ventana)
  let pendiente: Event | null = null
  let retenida = false
  ventana.dispatchEvent = (evento: Event) => {
    if (!retenida && evento instanceof ventana.MessageEvent && evento.data?.tipo === 'preview-ok') {
      retenida = true
      pendiente = evento
      return true
    }
    return original(evento)
  }
  return {
    retenida: () => retenida,
    soltar() { if (pendiente) { const evento = pendiente; pendiente = null; original(evento) } },
    restaurar() { ventana.dispatchEvent = original },
  }
}

test('una preview inicial tardía no reemplaza una ejecución posterior del mismo encargo', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', 'mostrar(crearParrafo("Original antiguo"))')
  const retenida = retenerPreview()
  try {
    const p = await montar(s, '/portafolio?e=4')
    await hasta(() => retenida.retenida() && !!p.editor() && !p.editor()!.readOnly, 'preview inicial retenida')
    await p.escribir('mostrar(crearParrafo("Resultado nuevo"))')
    await p.pulsar('Ejecutar')
    await hasta(() => p.contenedor.querySelector('.pv-marco')?.getAttribute('srcdoc')?.includes('Resultado nuevo') === true, 'preview nueva visible')
    await act(async () => retenida.soltar())
    await esperar(20)
    assert.ok(p.contenedor.querySelector('.pv-marco')?.getAttribute('srcdoc')?.includes('Resultado nuevo'))
    assert.equal(p.editor()!.value, 'mostrar(crearParrafo("Resultado nuevo"))')
  } finally { await act(async () => retenida.soltar()); retenida.restaurar() }
})

test('cambiar de encargo durante Ejecutar deja disponible el botón del nuevo encargo', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', 'mostrar(crearParrafo("Cuatro"))')
  s.borrador('e5', 'mostrar(crearParrafo("Cinco"))')
  const p = await montar(s, '/portafolio?e=4')
  await hasta(() => p.contenedor.querySelector('.pv-marco')?.getAttribute('srcdoc')?.includes('Cuatro') === true, 'preview inicial')
  const retenida = retenerPreview()
  try {
    await p.pulsar('Ejecutar')
    await hasta(retenida.retenida, 'ejecución pendiente')
    await p.ir('/portafolio?e=5')
    await hasta(() => p.editor()?.value === 'mostrar(crearParrafo("Cinco"))' && !p.editor()!.readOnly, 'nuevo encargo cargado')
    await act(async () => retenida.soltar())
    await esperar(20)
    assert.ok(p.boton('Ejecutar'), 'el nuevo encargo no hereda el estado Ejecutando')
    assert.equal(p.boton('Ejecutar')!.disabled, false)
  } finally { await act(async () => retenida.soltar()); retenida.restaurar() }
})
