import assert from 'node:assert/strict'
import test from 'node:test'
import { ENCARGOS } from '../src/lib/encargos.ts'

test('E11 conserva las skills que usa el código acumulado de E10', () => {
  assert.ok(Array.isArray(ENCARGOS[10].datosOverride.skills))
  assert.deepEqual(ENCARGOS[11].datosOverride.skills, ENCARGOS[10].datosOverride.skills)
})
