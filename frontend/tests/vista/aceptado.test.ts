// "Entregar a revisión" en la pantalla REAL del estudiante: la revisión corre el código con el
// runtime real del sandbox (tests/vista/entorno.ts) y el aceptado se guarda en el servidor.
import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { ventana } from './entorno.ts'
import { esEntrega, esLectura, ServidorFalso, type Llamada } from './servidorFalso.ts'

const { montar, hasta, esperar } = await import('./montar.ts')
const { componerAndamiaje } = await import('../../src/lib/encargos.ts')

// La solución de E4 (redes) en pseudocódigo, sobre el andamiaje con el que arranca.
const SOLUCION_E4 = `${componerAndamiaje(4, {})}
PARA CADA red EN datos.redes HACER
  SI red.url !== "" ENTONCES
    mostrar(crearEnlace(red.nombre, red.url))
  FIN SI
FIN PARA`

const esAceptado = (l: Llamada) => l.metodo === 'PUT' && l.ruta === '/api/challenges/e4/progress' && l.cuerpo?.status === 'accepted'

beforeEach(() => {
  ventana.localStorage.clear()
  ventana.sessionStorage.clear()
})

async function abrirE4(s: ServidorFalso) {
  const p = await montar(s)
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'carga e4')
  return p
}

test('una solución correcta queda aceptada en el servidor y no se degrada al seguir editando', async () => {
  const s = new ServidorFalso()
  let p = await abrirE4(s)
  await p.escribir(SOLUCION_E4)
  await p.pulsar('Entregar a revisión')
  await hasta(() => s.progreso.get('e4')?.status === 'accepted', 'aceptado en el servidor')
  const aceptado = s.llamadas.find(esAceptado)!
  assert.equal(aceptado.cuerpo?.cases_passed, 2)
  assert.equal(aceptado.cuerpo?.cases_total, 2)
  assert.equal(s.entregas.length, 1)
  await hasta(() => p.texto().includes('encargo aceptado'), 'se ve aceptado')
  // Aceptar salta solo a la siguiente actividad abierta del día (E5). Se espera a que E5 esté
  // cargado y se vuelve con "Actividad anterior", como haría el estudiante: escribir antes
  // competía con ese salto.
  await hasta(() => p.ubicacion() === '/portafolio?e=5' && !!p.editor() && !p.editor()!.readOnly, 'salto automático a E5, ya cargado')
  await p.pulsar('← Actividad anterior')
  await hasta(() => p.ubicacion() === '/portafolio?e=4' && p.editor()?.value === SOLUCION_E4 && !p.editor()!.readOnly
    && p.texto().includes('encargo aceptado'), 'E4 aceptado al volver')

  // Seguir editando un reto aceptado: el autoguardado nunca manda otro estado que in_progress
  // y el reto sigue aceptado (en el servidor y en la pantalla).
  await p.escribir(`${SOLUCION_E4}\n// repaso`)
  await hasta(() => s.progreso.get('e4')?.draft_code.endsWith('// repaso') === true, 'autoguardado tras aceptar')
  assert.equal(s.progreso.get('e4')?.status, 'accepted')
  assert.ok(s.guardados('e4').every((l) => l.cuerpo?.status === 'accepted' || l.cuerpo?.status === 'in_progress'))
  assert.ok(p.texto().includes('encargo aceptado'))
  await p.desmontar()

  // Al volver (F5), el servidor dice aceptado y así se muestra.
  p = await abrirE4(s)
  await hasta(() => p.texto().includes('encargo aceptado'), 'aceptado tras recargar')
  assert.ok(p.editor()!.value.endsWith('// repaso'))
  await p.desmontar()
})

test('volver enseguida tras el salto automático y seguir editando: nada lo pisa y sigue aceptado', async () => {
  const s = new ServidorFalso()
  const p = await abrirE4(s)
  await p.escribir(SOLUCION_E4)
  const lentaE5 = s.retener(esLectura('e5')) // E5 todavía no llega cuando se vuelve
  await p.pulsar('Entregar a revisión')
  await hasta(() => s.progreso.get('e4')?.status === 'accepted' && p.texto().includes('encargo aceptado'), 'aceptado')
  await hasta(() => p.ubicacion() === '/portafolio?e=5', 'salto automático a E5')
  await lentaE5.llegada
  await p.ir('/portafolio?e=4') // Atrás del navegador, con E5 cargando
  await hasta(() => p.ubicacion() === '/portafolio?e=4' && p.editor()?.value === SOLUCION_E4 && !p.editor()!.readOnly, 'E4 editable')
  await p.escribir(`${SOLUCION_E4}\n// repaso al volver`)
  lentaE5.soltar()
  await hasta(() => s.progreso.get('e4')?.draft_code.endsWith('// repaso al volver') === true, 'se guarda lo escrito al volver')
  assert.equal(p.editor()?.value.endsWith('// repaso al volver'), true, 'la respuesta tardía no pisa el editor')
  assert.equal(p.ubicacion(), '/portafolio?e=4')
  assert.equal(s.progreso.get('e4')?.status, 'accepted')
  assert.ok(p.texto().includes('encargo aceptado'))
  await p.desmontar()
})

test('si guardar el aceptado falla (sin red), se reintenta hasta que llega', async () => {
  const s = new ServidorFalso()
  const p = await abrirE4(s)
  await p.escribir(SOLUCION_E4)
  await hasta(() => s.progreso.get('e4')?.draft_code === SOLUCION_E4, 'autoguardado')
  s.fallar(esAceptado, 1)
  await p.pulsar('Entregar a revisión')
  await hasta(() => p.texto().includes('encargo aceptado'), 'la revisión pasa')
  await hasta(() => p.texto().includes('Pendiente de sincronizar') || s.progreso.get('e4')?.status === 'accepted', 'aviso o reintento')
  await hasta(() => s.progreso.get('e4')?.status === 'accepted', 'el aceptado llega al servidor', 12_000)
  await hasta(() => !p.texto().includes('Pendiente de sincronizar'), 'sin aviso pendiente')
  await p.desmontar()
})

test('lo que se escribe mientras se revisa no se pierde: el servidor termina con lo último', async () => {
  const s = new ServidorFalso()
  const p = await abrirE4(s)
  await p.escribir(SOLUCION_E4)
  const r = s.retener(esEntrega('e4'))
  await p.pulsar('Entregar a revisión')
  await r.llegada
  const ultimo = `${SOLUCION_E4}\n// seguí escribiendo mientras se revisaba`
  await p.escribir(ultimo)
  await hasta(() => s.progreso.get('e4')?.draft_code === ultimo, 'autoguardado durante la revisión')
  r.soltar()
  await hasta(() => s.progreso.get('e4')?.status === 'accepted', 'aceptado')
  await esperar(1500)
  assert.equal(s.progreso.get('e4')?.draft_code, ultimo, 'el aceptado no vuelve a poner el código viejo')
  assert.equal(p.editor()!.value, ultimo)
  await hasta(() => p.sello().startsWith('guardado'), 'guardado')
  await p.desmontar()
})

test('una solución incorrecta no se marca aceptada', async () => {
  const s = new ServidorFalso()
  const p = await abrirE4(s)
  await p.escribir(`${componerAndamiaje(4, {})}\nmostrar(crearEnlace("GitHub", "https://github.com/otra-persona"))`)
  await p.pulsar('Entregar a revisión')
  await hasta(() => /\d \/ 2 casos/.test(p.texto()), 'resultado de la revisión')
  await esperar(500)
  assert.equal(s.llamadas.some(esAceptado), false)
  assert.notEqual(s.progreso.get('e4')?.status, 'accepted')
  assert.equal(p.texto().includes('encargo aceptado'), false)
  await p.desmontar()
})
