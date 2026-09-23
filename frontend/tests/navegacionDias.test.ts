import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { ENCARGOS, NUMEROS_DE_ENCARGO } from '../src/lib/encargos.ts'
import {
  accesoActividad,
  continuacion,
  posicionEnDia,
  rutaDia,
  type DiaDelMapa,
} from '../src/lib/navegacionActividades.ts'

// Bug de clase: "antes había salto a un nivel bloqueado; ahora, aunque ya está habilitado,
// no pasa a ningún nivel y se estanca". La última actividad de un día solo ofrecía "Ver
// actividades del día", construido con una ETIQUETA ("Día 3 — Mi1") en vez del código.

const reto = (n: number, unlocked = true, progress_status = 'not_started') => ({
  key: `e${n}`, title: ENCARGOS[n].meta.titulo, unlocked, progress_status,
})
const dia = (code: string, day_number: number, access: 'open' | 'paused' | 'locked', challenges: ReturnType<typeof reto>[]): DiaDelMapa => ({
  code, day_number, title: `Día ${day_number}`, access, challenges,
})

// Mismo orden y reparto que el seed (backend/app/catalog/seed.py).
function mapa(accesos: Partial<Record<string, 'open' | 'paused' | 'locked'>>): DiaDelMapa[] {
  const a = (c: string) => accesos[c] ?? 'locked'
  return [
    dia('L1', 1, a('L1'), []),
    dia('Ma1', 2, a('Ma1'), [reto(1), reto(2), reto(3)]),
    dia('Mi1', 3, a('Mi1'), [reto(4), reto(5), reto(6)]),
    dia('Ju1', 4, a('Ju1'), []),
    dia('V1', 5, a('V1'), [reto(7), reto(8)]),
  ]
}

test('mismo día: anterior y siguiente', () => {
  const dias = mapa({ L1: 'open', Ma1: 'open', Mi1: 'open' })
  const p = posicionEnDia(dias[2].challenges, 'e5')
  assert.equal(p?.anterior?.numero, 4)
  assert.equal(p?.siguiente?.numero, 6)
  assert.deepEqual(continuacion(dias, 'e5'), { tipo: 'mismo-dia', destino: p?.siguiente })
})

test('fin de día con el siguiente bloqueado: se explica, sin destino al que saltar', () => {
  const dias = mapa({ L1: 'open', Ma1: 'open' })
  assert.deepEqual(continuacion(dias, 'e3'), { tipo: 'dia-bloqueado', dia: { code: 'Mi1', day_number: 3, title: 'Día 3' } })
})

test('fin de día con el siguiente abierto: se ofrece continuar con su primera actividad', () => {
  const dias = mapa({ L1: 'open', Ma1: 'open', Mi1: 'open' })
  const c = continuacion(dias, 'e3')
  assert.equal(c?.tipo, 'dia-siguiente')
  assert.equal(c?.tipo === 'dia-siguiente' && c.dia.code, 'Mi1')
  assert.equal(c?.tipo === 'dia-siguiente' && c.destino?.numero, 4)
})

test('fin de día: si el siguiente ya tiene actividades terminadas, se ofrece la primera pendiente', () => {
  const dias = mapa({ L1: 'open', Ma1: 'open', Mi1: 'open' })
  dias[2].challenges = [reto(4, true, 'accepted'), reto(5, true, 'in_progress'), reto(6)]
  const c = continuacion(dias, 'e3')
  assert.equal(c?.tipo === 'dia-siguiente' && c.destino?.numero, 5)
})

test('fin de día con el siguiente pausado: se dice que el docente lo pausó', () => {
  const dias = mapa({ L1: 'open', Ma1: 'open', Mi1: 'paused' })
  assert.equal(continuacion(dias, 'e3')?.tipo, 'dia-pausado')
})

test('fin de día con el siguiente abierto y sin actividades: se ofrece entrar a ese día', () => {
  const dias = mapa({ L1: 'open', Ma1: 'open', Mi1: 'open', Ju1: 'open' })
  const c = continuacion(dias, 'e6')
  assert.equal(c?.tipo, 'dia-siguiente')
  assert.equal(c?.tipo === 'dia-siguiente' && c.dia.code, 'Ju1')
  assert.equal(c?.tipo === 'dia-siguiente' && c.destino, null)
})

test('último día del taller: no hay a dónde seguir', () => {
  const dias = mapa({ L1: 'open', Ma1: 'open', Mi1: 'open', Ju1: 'open', V1: 'open' })
  assert.deepEqual(continuacion(dias, 'e8'), { tipo: 'fin' })
})

test('un reto bloqueado, pausado o fuera del mapa no se abre por URL directa', () => {
  const dias = mapa({ L1: 'open', Ma1: 'paused', Mi1: 'open' })
  assert.equal(accesoActividad(dias, 'e4'), 'abierta')
  assert.equal(accesoActividad(dias, 'e1'), 'pausada')
  assert.equal(accesoActividad(dias, 'e7'), 'bloqueada')
  assert.equal(accesoActividad(dias, 'e99'), 'desconocida')
  dias[2].challenges[1].unlocked = false
  assert.equal(accesoActividad(dias, 'e5'), 'bloqueada')
})

test('las rutas de día usan el código público, el mismo que acepta la API', () => {
  const rutaApiValida = /^\/[a-z0-9][a-z0-9/_-]*(?:\?[^#\\]*)?$/i // lib/http.ts
  for (const n of NUMEROS_DE_ENCARGO) {
    const codigo = ENCARGOS[n].sesion
    assert.match(rutaDia(codigo), /^\/sesiones\/[A-Za-z0-9]+$/)
    assert.match(`/map/sessions/${encodeURIComponent(codigo)}`, rutaApiValida)
  }
})

test('no hay auto-avance: el editor no navega con temporizadores ni usa la etiqueta del día como código', () => {
  const vista = readFileSync(new URL('../src/features/estudiante/VistaEstudiante.tsx', import.meta.url), 'utf8')
  // Cualquier temporizador (con flecha, function o referencia) que termine navegando.
  assert.doesNotMatch(vista, /setTimeout\([\s\S]{0,200}?(irAEncargo|irADia|navigate\(|setParams\()/)
  assert.doesNotMatch(vista, /rutaDia\(diaDeEncargo/)
  assert.doesNotMatch(vista, /\/map\/sessions\/\$\{encodeURIComponent\(diaDeEncargo/)
})
