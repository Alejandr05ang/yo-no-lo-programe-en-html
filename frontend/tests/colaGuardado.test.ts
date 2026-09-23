import assert from 'node:assert/strict'
import test from 'node:test'
import { crearColaDeGuardado, sePuedeGuardar } from '../src/lib/colaGuardado.ts'

// Lo que usa VistaEstudiante para guardar el borrador: el código real, no una copia.

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

test('el guardado termina antes de navegar: esperar() espera lo encolado, en orden', async () => {
  const cola = crearColaDeGuardado()
  const eventos: string[] = []
  cola.encolar(async () => { eventos.push('empieza e4'); await espera(40); eventos.push('guarda e4') })
  cola.encolar(async () => { eventos.push('empieza e4 (último cambio)'); await espera(5); eventos.push('guarda e4 (último cambio)') })
  await cola.esperar()
  eventos.push('navega a e5')
  assert.deepEqual(eventos, ['empieza e4', 'guarda e4', 'empieza e4 (último cambio)', 'guarda e4 (último cambio)', 'navega a e5'])
})

test('un guardado que falla (sin red) no bloquea los siguientes ni la navegación', async () => {
  const cola = crearColaDeGuardado()
  let guardado = false
  cola.encolar(async () => { throw new Error('NETWORK_ERROR') })
  cola.encolar(async () => { guardado = true })
  await cola.esperar()
  assert.equal(guardado, true)
})

test('mientras llega el borrador de otro encargo no se guarda el texto del anterior bajo la clave nueva', () => {
  // Volver atrás en el navegador: numero ya es 5, el editor todavía muestra el código de 4.
  assert.equal(sePuedeGuardar({ contenido: 'código de e4', numero: 5, numeroCargado: 4, estado: 'dirty' }), false)
  assert.equal(sePuedeGuardar({ contenido: 'código de e5', numero: 5, numeroCargado: 5, estado: 'dirty' }), true)
  assert.equal(sePuedeGuardar({ contenido: 'código de e5', numero: 5, numeroCargado: 5, estado: 'saved' }), false)
  assert.equal(sePuedeGuardar({ contenido: '', numero: 5, numeroCargado: 5, estado: 'dirty' }), false)
  assert.equal(sePuedeGuardar({ contenido: 'x', numero: 5, numeroCargado: null, estado: 'dirty' }), false)
})
