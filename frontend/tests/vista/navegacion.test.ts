// Navegación entre actividades y días en la pantalla REAL del estudiante. El mapa (qué día está
// abierto, pausado o bloqueado) lo da el servidor; nunca se salta solo de un día a otro.
import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { ventana } from './entorno.ts'
import { esGuardado, esLectura, ServidorFalso } from './servidorFalso.ts'

const { montar, hasta, esperar } = await import('./montar.ts')
const { onlineManager } = await import('@tanstack/react-query')

beforeEach(() => {
  ventana.localStorage.clear()
  ventana.sessionStorage.clear()
  onlineManager.setOnline(true)
})

async function abrir(s: ServidorFalso, e: number) {
  const p = await montar(s, `/portafolio?e=${e}`)
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, `carga e${e}`)
  return p
}

test('fin de día con el siguiente abierto y sin actividades: CTA manual al día, que antes guarda', async () => {
  const s = new ServidorFalso({ Ju1: 'open' })
  const p = await abrir(s, 6)
  await hasta(() => p.texto().includes('No quedan más actividades abiertas en este día'), 'nota de fin de día')
  assert.ok(p.boton('Ir al Día 4'))
  await esperar(1500)
  assert.equal(p.ubicacion(), '/portafolio?e=6', 'nunca navega solo')

  await p.escribir('const ultimo = 1')
  await p.pulsar('Ir al Día 4')
  await hasta(() => p.ubicacion() === '/sesiones/Ju1', 'va al día por su código')
  assert.equal(s.progreso.get('e6')?.draft_code, 'const ultimo = 1', 'guardó antes de salir')
  await p.desmontar()
})

test('fin de día con el siguiente abierto y con actividades: "Continuar con el Día N" a su primera actividad', async () => {
  const s = new ServidorFalso({ Ju1: 'open', V1: 'open' })
  const p = await abrir(s, 6)
  // Ju1 no tiene actividades: el siguiente día con actividades es V1, pero se ofrece Ju1.
  assert.ok(p.boton('Ir al Día 4'))
  await p.desmontar()

  const s2 = new ServidorFalso({ Ju1: 'open', V1: 'open', L2: 'open' })
  const q = await abrir(s2, 8)
  await hasta(() => !!q.boton('Continuar con el Día 6'), 'CTA al día 6')
  await q.escribir('const e8 = "último cambio"')
  await q.pulsar('Continuar con el Día 6')
  await hasta(() => q.ubicacion() === '/portafolio?e=9' && !!q.editor() && !q.editor()!.readOnly, 'abre E9')
  const orden = s2.llamadas.map((l) => `${l.metodo} ${l.ruta}`)
  assert.ok(orden.includes('GET /api/challenges/e9/progress'))
  assert.ok(orden.indexOf('PUT /api/challenges/e8/progress') < orden.indexOf('GET /api/challenges/e9/progress'), orden.join(', '))
  await q.desmontar()
})

test('fin de día con el siguiente bloqueado o pausado: se explica, sin botón a ningún día', async () => {
  const bloqueado = await abrir(new ServidorFalso(), 6)
  await hasta(() => bloqueado.texto().includes('se abrirá más adelante'), 'nota de bloqueado')
  assert.equal(bloqueado.boton(/Ir al Día|Continuar con el Día/), null)
  await bloqueado.desmontar()

  const pausado = await abrir(new ServidorFalso({ Ju1: 'paused' }), 6)
  await hasta(() => pausado.texto().includes('pausó el Día 4'), 'nota de pausado')
  assert.equal(pausado.boton(/Ir al Día|Continuar con el Día/), null)
  await pausado.desmontar()
})

test('"Ver actividades del día" lleva al día por su CÓDIGO (Mi1), no por su etiqueta', async () => {
  const s = new ServidorFalso()
  const p = await abrir(s, 6)
  await hasta(() => !!p.boton('Ver actividades del día'), 'botón del día')
  await p.pulsar('Ver actividades del día')
  await hasta(() => p.ubicacion() === '/sesiones/Mi1', 'va a /sesiones/Mi1')
  assert.match(p.texto(), /Sesión Mi1/)
  await p.desmontar()
})

test('el enlace al mapa de la nota de fin de día guarda antes de salir', async () => {
  const s = new ServidorFalso()
  const p = await abrir(s, 6)
  await hasta(() => p.texto().includes('se abrirá más adelante'), 'nota')
  await p.escribir('const antesDelMapa = 1')
  await p.enlace('mapa')
  await hasta(() => p.ubicacion() === '/mapa', 'va al mapa')
  await hasta(() => s.progreso.get('e6')?.draft_code === 'const antesDelMapa = 1', 'guardado')
  await p.desmontar()
})

test('si el docente cierra la siguiente actividad del día, "Siguiente" salta a la próxima abierta', async () => {
  const s = new ServidorFalso()
  s.retosCerrados.add('e5')
  const p = await abrir(s, 4)
  await p.pulsar('Siguiente actividad')
  await hasta(() => p.ubicacion() === '/portafolio?e=6', 'salta a e6')
  // Y "Anterior" tampoco lleva a la cerrada: vuelve a e4.
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'carga e6')
  await p.pulsar('← Actividad anterior')
  await hasta(() => p.ubicacion() === '/portafolio?e=4', 'anterior abierta = e4')
  await p.desmontar()
})

test('una actividad de un día bloqueado o pausado no abre el editor por URL', async () => {
  const bloqueada = await montar(new ServidorFalso(), '/portafolio?e=7')
  await hasta(() => bloqueada.texto().includes('Esta actividad todavía no está abierta'), 'pantalla de bloqueo')
  assert.equal(bloqueada.editor(), null)
  await bloqueada.desmontar()

  const pausada = await montar(new ServidorFalso({ Mi1: 'paused' }), '/portafolio?e=4')
  await hasta(() => pausada.texto().includes('Este día está en pausa'), 'pantalla de pausa')
  assert.equal(pausada.editor(), null)
  await pausada.desmontar()
})

test('recién abierto el día siguiente, entrar a su actividad no muestra un "bloqueado" viejo', async () => {
  const s = new ServidorFalso()
  const p = await abrir(s, 6)
  await hasta(() => p.texto().includes('se abrirá más adelante'), 'V1 todavía bloqueado')
  s.accesos.Ju1 = 'open'
  s.accesos.V1 = 'open' // el docente abre los días siguientes
  await p.ir('/mapa')
  await p.enlace('Abrir E7')
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'E7 se abre', 5000)
  assert.equal(p.texto().includes('todavía no está abierta'), false)
  await p.desmontar()
})

test('sin conexión, "Siguiente actividad" abre la siguiente con lo que haya en este equipo', async () => {
  const s = new ServidorFalso()
  const p = await abrir(s, 4)
  onlineManager.setOnline(false)
  s.fallar(() => true, 1000)
  await p.pulsar('Siguiente actividad')
  await hasta(() => p.ubicacion() === '/portafolio?e=5', 'navega')
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'el editor de e5 se puede usar sin red', 5000)
  assert.equal(s.llamadas.some(esLectura('e5')) || s.llamadas.some(esGuardado('e5')), false)
  onlineManager.setOnline(true)
  await p.desmontar()
})
