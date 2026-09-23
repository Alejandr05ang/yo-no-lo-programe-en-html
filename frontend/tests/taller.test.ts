import assert from 'node:assert/strict'
import test from 'node:test'
import {
  accionDelDia,
  estadoDeActividad,
  estadoDelDia,
  motivoCerrado,
  sePuedeEntrar,
  textoProgreso,
  type DiaParaEstado,
} from '../src/lib/estadoTaller.ts'
import { posicionEnDia, rutaActividad, rutaDia } from '../src/lib/navegacionActividades.ts'

const dia = (parcial: Partial<DiaParaEstado> & { progress?: Partial<DiaParaEstado['progress']> } = {}): DiaParaEstado => ({
  access: parcial.access ?? 'open',
  is_current: parcial.is_current ?? false,
  progress: { required_total: 3, accepted: 0, started: 0, ...parcial.progress },
})

// --- Mapa: días ------------------------------------------------------------

test('a past open day stays enterable', () => {
  const pasado = dia({ progress: { accepted: 1 } })
  assert.equal(sePuedeEntrar(pasado), true)
  assert.equal(estadoDelDia(pasado), 'en_progreso')
  assert.equal(accionDelDia(pasado), 'Continuar')
})

test('the current day is marked as today and enterable', () => {
  const hoy = dia({ is_current: true })
  assert.equal(estadoDelDia(hoy), 'hoy')
  assert.equal(accionDelDia(hoy), 'Entrar')
})

test('a future day is locked and offers no way in', () => {
  const futuro = dia({ access: 'locked' })
  assert.equal(sePuedeEntrar(futuro), false)
  assert.equal(estadoDelDia(futuro), 'bloqueado')
  assert.equal(accionDelDia(futuro), null)
  assert.equal(motivoCerrado(futuro), 'Se abrirá más adelante.')
})

test('a day paused by the teacher is not navigable and says so without blaming the account', () => {
  const pausado = dia({ access: 'paused', progress: { accepted: 2 } })
  assert.equal(sePuedeEntrar(pausado), false)
  assert.equal(estadoDelDia(pausado), 'pausado')
  assert.equal(accionDelDia(pausado), null)
  const motivo = motivoCerrado(pausado) ?? ''
  assert.match(motivo, /docente pausó/)
  assert.match(motivo, /progreso sigue guardado/)
  assert.doesNotMatch(motivo, /cuenta|acceso/i)
})

test('a reopened day is navigable again with its progress intact', () => {
  const antes = dia({ access: 'paused', progress: { accepted: 1, started: 1 } })
  const reabierto = { ...antes, access: 'open' as const }
  assert.equal(sePuedeEntrar(reabierto), true)
  assert.equal(estadoDelDia(reabierto), 'en_progreso')
  assert.equal(accionDelDia(reabierto), 'Continuar')
})

test('a day with no activities is enterable but never "completed"', () => {
  const clase = dia({ progress: { required_total: 0 } })
  assert.equal(sePuedeEntrar(clase), true)
  assert.equal(estadoDelDia(clase), 'disponible')
  assert.equal(accionDelDia(clase), 'Entrar')
  assert.match(textoProgreso(clase.progress), /Sesión de clase/)
  assert.equal(estadoDelDia({ ...clase, is_current: true }), 'hoy')
})

test('completed means every required activity accepted, not that the day passed', () => {
  assert.equal(estadoDelDia(dia({ progress: { accepted: 3 } })), 'completado')
  assert.equal(accionDelDia(dia({ progress: { accepted: 3 } })), 'Revisar')
  assert.equal(estadoDelDia(dia({ progress: { accepted: 2, started: 1 } })), 'en_progreso')
  // Un día pasado sin tocar sigue "disponible", no "completado".
  assert.equal(estadoDelDia(dia()), 'disponible')
  // Terminar el día de hoy lo da por completado; el marcador "hoy" va aparte.
  assert.equal(estadoDelDia(dia({ is_current: true, progress: { accepted: 3 } })), 'completado')
})

test('progress text counts real accepted activities', () => {
  assert.equal(textoProgreso({ required_total: 3, accepted: 2, started: 1 }), '2 de 3 actividades completadas')
  assert.equal(textoProgreso({ required_total: 1, accepted: 0, started: 0 }), '0 de 1 actividad completada')
})

// --- Actividades -------------------------------------------------------------

test('activity labels follow the saved progress status', () => {
  assert.deepEqual(estadoDeActividad('not_started'), { etiqueta: 'Pendiente', accion: 'Empezar' })
  assert.deepEqual(estadoDeActividad(undefined), { etiqueta: 'Pendiente', accion: 'Empezar' })
  assert.deepEqual(estadoDeActividad('draft'), { etiqueta: 'En progreso', accion: 'Continuar' })
  assert.deepEqual(estadoDeActividad('in_progress'), { etiqueta: 'En progreso', accion: 'Continuar' })
  assert.deepEqual(estadoDeActividad('accepted'), { etiqueta: 'Completada', accion: 'Revisar' })
})

// --- Anterior / siguiente ----------------------------------------------------

const MI1 = [
  { key: 'e4', title: 'Cómo encontrarte', unlocked: true },
  { key: 'e5', title: 'Tus hobbies', unlocked: true },
  { key: 'e6', title: 'La lista que no se queda quieta', unlocked: true },
]

test('first activity offers only next', () => {
  const p = posicionEnDia(MI1, 'e4')
  assert.ok(p)
  assert.equal(p.posicion, 1)
  assert.equal(p.total, 3)
  assert.equal(p.anterior, null)
  assert.equal(p.siguiente?.numero, 5)
})

test('middle activity offers previous and next', () => {
  const p = posicionEnDia(MI1, 'e5')
  assert.ok(p)
  assert.equal(p.posicion, 2)
  assert.equal(p.anterior?.numero, 4)
  assert.equal(p.siguiente?.numero, 6)
})

test('last activity offers previous and no next: it returns to the day, never the next day', () => {
  const p = posicionEnDia(MI1, 'e6')
  assert.ok(p)
  assert.equal(p.posicion, 3)
  assert.equal(p.anterior?.numero, 5)
  assert.equal(p.siguiente, null)
  assert.equal(rutaDia('Mi1'), '/sesiones/Mi1')
})

test('navigation does not require the current activity to be accepted', () => {
  // La posición depende solo del orden del día, no del progreso.
  const p = posicionEnDia(MI1, 'e4')
  assert.equal(p?.siguiente?.disponible, true)
})

test('a locked neighbour is reported as unavailable instead of hidden', () => {
  const conCierre = [MI1[0], { ...MI1[1], unlocked: false }, MI1[2]]
  const p = posicionEnDia(conCierre, 'e4')
  assert.equal(p?.siguiente?.disponible, false)
})

test('an activity outside the day gets no navigation', () => {
  assert.equal(posicionEnDia(MI1, 'e9'), null)
  assert.equal(rutaActividad(6), '/portafolio?e=6')
})
