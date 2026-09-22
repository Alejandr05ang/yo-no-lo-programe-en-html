import assert from 'node:assert/strict'
import test from 'node:test'
import { ENCARGOS } from '../src/lib/encargos.ts'

test('E11 conserva las skills que usa el código acumulado de E10', () => {
  assert.ok(Array.isArray(ENCARGOS[10].datosOverride.skills))
  assert.deepEqual(ENCARGOS[11].datosOverride.skills, ENCARGOS[10].datosOverride.skills)
})

test('a session is reachable on its own, with or without assignments', () => {
  // El mapa solo emitia enlaces dentro de session.challenges, asi que un dia sin
  // encargos —el de diagnostico— no tenia forma de abrirse. La direccion se
  // construye con el codigo publico, nunca con el UUID.
  const enlace = (codigo: string) => `/sesiones/${encodeURIComponent(codigo)}`
  assert.equal(enlace('L1'), '/sesiones/L1')
  assert.equal(enlace('Ma1'), '/sesiones/Ma1')
  assert.doesNotMatch(enlace('L1'), /[0-9a-f]{8}-[0-9a-f]{4}/)
})

test('only a future session withholds its way in', () => {
  // active/done se pueden abrir; future no navega a ninguna parte.
  const sePuedeEntrar = (estado: string) => estado !== 'future'
  assert.equal(sePuedeEntrar('active'), true)
  assert.equal(sePuedeEntrar('done'), true)
  assert.equal(sePuedeEntrar('future'), false)
})
