import assert from 'node:assert/strict'
import test from 'node:test'
import { confirmacion, filaDia, type PausaAdmin, type SesionAdmin } from '../src/lib/controlDias.ts'

const dia = (n: number, code: string, title: string): SesionAdmin => ({
  id: `id-${code}`, code, day_number: n, order_index: n, title, challenges_count: 0,
})
const L1 = dia(1, 'L1', 'Diagnóstico y algoritmos')
const MA1 = dia(2, 'Ma1', 'Variables y DOM')
const MI1 = dia(3, 'Mi1', 'Condicionales y bucles')
const JU1 = dia(4, 'Ju1', 'Personalización visual')
const TODAS = [L1, MA1, MI1, JU1]
const activoMi1 = { id: MI1.id, orden: 3 }
const pausa = (s: SesionAdmin): PausaAdmin => ({ session_id: s.id, code: s.code, updated_at: null, updated_by_name: null })

test('rows follow the cumulative rule around the current day', () => {
  assert.deepEqual(filaDia(L1, activoMi1, []), { estado: 'disponible', pausado: false, esActual: false, acciones: ['pausar', 'activar'] })
  assert.deepEqual(filaDia(MI1, activoMi1, []), { estado: 'actual', pausado: false, esActual: true, acciones: ['pausar'] })
  assert.deepEqual(filaDia(JU1, activoMi1, []), { estado: 'futuro', pausado: false, esActual: false, acciones: ['activar'] })
})

test('a paused day offers reopen instead of pause', () => {
  const fila = filaDia(MA1, activoMi1, [pausa(MA1)])
  assert.equal(fila.estado, 'pausado')
  assert.deepEqual(fila.acciones, ['reabrir', 'activar'])
})

test('a pause left ahead of the current day after a rollback is still visible and reopenable', () => {
  const fila = filaDia(MI1, { id: L1.id, orden: 1 }, [pausa(MI1)])
  assert.equal(fila.estado, 'futuro')
  assert.equal(fila.pausado, true)
  assert.deepEqual(fila.acciones, ['reabrir', 'activar'])
})

test('pausing says students lose access temporarily and nothing is deleted', () => {
  const c = confirmacion('pausar', MA1, TODAS, activoMi1, [])
  assert.equal(c.titulo, '¿Pausar Día 2?')
  assert.equal(c.boton, 'Pausar acceso')
  assert.match(c.parrafos.join(' '), /temporalmente/)
  assert.match(c.parrafos.join(' '), /NO se eliminan/)
})

test('rolling the current day back names exactly the days that close', () => {
  const c = confirmacion('activar', MA1, TODAS, { id: JU1.id, orden: 4 }, [])
  const texto = c.parrafos.join(' ')
  assert.match(texto, /Al volver el día actual a Día 2, Día 3 y Día 4 dejarán de estar disponibles temporalmente\./)
  assert.match(texto, /NO se eliminan/)
})

test('moving forward explains the cumulative range', () => {
  const c = confirmacion('activar', JU1, TODAS, activoMi1, [])
  assert.equal(c.titulo, '¿Activar Día 4 como día actual?')
  assert.match(c.parrafos[0], /del Día 1 al Día 4/)
})

test('activating a paused day warns that it reopens', () => {
  const c = confirmacion('activar', MA1, TODAS, { id: L1.id, orden: 1 }, [pausa(MA1)])
  assert.match(c.parrafos.join(' '), /Día 2 está pausado: al activarlo como día actual se reabre\./)
})

test('reopening a future day says it stays locked', () => {
  const c = confirmacion('reabrir', MI1, TODAS, { id: L1.id, orden: 1 }, [pausa(MI1)])
  assert.match(c.parrafos.join(' '), /seguirá bloqueado hasta que el curso llegue/)
  assert.match(c.parrafos.join(' '), /no adelanta el día actual/)
})

test('going back to demo only lists every open day that closes', () => {
  const c = confirmacion('activar', null, TODAS, { id: MA1.id, orden: 2 }, [])
  assert.equal(c.boton, 'Volver a la demo')
  assert.match(c.parrafos.join(' '), /Día 1 y Día 2 dejarán de estar disponibles/)
})
