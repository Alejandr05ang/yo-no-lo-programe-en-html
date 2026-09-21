import assert from 'node:assert/strict'
import test from 'node:test'
import {
  claveDemo,
  elegirRestauracion,
  type CopiaLocal,
  type ProgresoDemo,
} from '../src/features/demo/demoStorage.ts'

const progreso = (state: Record<string, unknown>, draft = ''): ProgresoDemo => ({
  schema_version: 1, state, draft_code: draft,
})
const copia = (state: Record<string, unknown>, sincronizado: boolean): CopiaLocal => ({
  ...progreso(state), sincronizado,
})
const vacio = progreso({})

test('each student gets their own backup key, so one account never reads another one', () => {
  assert.equal(claveDemo('uid-a'), 'tutorias:demo:uid-a')
  assert.notEqual(claveDemo('uid-a'), claveDemo('uid-b'))
  // A signed-out visitor has a key of their own; it must not collide with a uid.
  assert.equal(claveDemo(null), 'tutorias:demo:anon')
  assert.notEqual(claveDemo(null), claveDemo('uid-a'))
})

test('the backend is the authority when the local copy is already saved there', () => {
  const eleccion = elegirRestauracion(progreso({ monedas: 9 }), copia({ monedas: 3 }, true))
  assert.equal(eleccion.origen, 'backend')
  assert.deepEqual(eleccion.progreso?.state, { monedas: 9 })
})

test('work the server never received wins, instead of being dropped on the next visit', () => {
  // The unsynced copy was written after the last successful save, so it is newer
  // than whatever the backend still holds.
  const eleccion = elegirRestauracion(progreso({ monedas: 3 }), copia({ monedas: 12 }, false))
  assert.equal(eleccion.origen, 'local-pendiente')
  assert.deepEqual(eleccion.progreso?.state, { monedas: 12 })
})

test('an unreachable backend falls back to the local copy rather than an empty level', () => {
  const eleccion = elegirRestauracion(null, copia({ monedas: 5 }, true))
  assert.equal(eleccion.origen, 'local')
  assert.deepEqual(eleccion.progreso?.state, { monedas: 5 })
})

test('a student with nothing saved anywhere starts on the default level', () => {
  assert.deepEqual(elegirRestauracion(null, null), { origen: 'ninguno', progreso: null })
  // An empty row from the backend is not something to restore either.
  assert.deepEqual(elegirRestauracion(vacio, null), { origen: 'ninguno', progreso: null })
  assert.deepEqual(elegirRestauracion(vacio, copia({}, false)), { origen: 'ninguno', progreso: null })
})

test('a restore never mixes two accounts, whichever side is missing', () => {
  // Signing in on a machine where someone else worked: that student's backup
  // lives under another key, so what arrives here is only the backend's answer.
  const deOtroAlumno = copia({ monedas: 99 }, false)
  const eleccion = elegirRestauracion(progreso({ monedas: 1 }), null)
  assert.equal(eleccion.origen, 'backend')
  assert.notDeepEqual(eleccion.progreso?.state, deOtroAlumno.state)
})
