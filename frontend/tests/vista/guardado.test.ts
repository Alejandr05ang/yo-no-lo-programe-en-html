// Autoguardado del borrador en la pantalla REAL del estudiante (VistaEstudiante), con el cliente
// HTTP real y un backend en memoria (tests/vista). Nada de esto reimplementa la lógica: se
// escribe en el editor, se pulsan botones y se mira qué llega al servidor.
import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { ventana } from './entorno.ts'
import { esGuardado, esLectura, ServidorFalso } from './servidorFalso.ts'

const { montar, hasta, esperar } = await import('./montar.ts')
const { datosComoTexto } = await import('../../src/lib/mockEncargo.ts')
const { componerAndamiaje } = await import('../../src/lib/encargos.ts')

const D4 = 'mostrar(crearTitulo("borrador de e4"))'
const D5 = 'mostrar(crearTitulo("borrador de e5"))'
const pendiente = (key: string, uid = 'alumno-1') => ventana.localStorage.getItem(`tutorias:draft-pendiente:${uid}:${key}`)

beforeEach(() => {
  ventana.localStorage.clear()
  ventana.sessionStorage.clear()
})

test('escribir guarda el borrador en SU reto tras la pausa; cargar no guarda nada', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', D4)
  const p = await montar(s)
  await hasta(() => p.editor()?.value === D4, 'carga el borrador de e4')
  await esperar(1000)
  assert.equal(s.guardados('e4').length, 0, 'cargar un borrador no es un cambio')

  await p.escribir(`${D4}\n// cambio`)
  await hasta(() => s.guardados('e4').length === 1, 'autoguardado')
  assert.deepEqual(s.guardados('e4')[0].cuerpo, { draft_code: `${D4}\n// cambio`, status: 'in_progress' })
  await hasta(() => p.sello().startsWith('guardado'), 'sello "guardado"')
  await p.desmontar()
})

test('mientras llega el borrador el editor es de solo lectura', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', D4)
  const r = s.retener(esLectura('e4'))
  const p = await montar(s)
  await r.llegada
  await esperar(50)
  assert.equal(p.editor()?.readOnly, true)
  assert.match(p.sello(), /cargando tu borrador/)
  r.soltar()
  await hasta(() => p.editor()?.value === D4 && !p.editor()!.readOnly, 'editor listo')
  await p.desmontar()
})

test('"Siguiente actividad" espera a que termine el guardado y no mezcla los retos', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', D4)
  s.borrador('e5', D5)
  const p = await montar(s)
  await hasta(() => p.editor()?.value === D4, 'carga e4')

  const r = s.retener(esGuardado('e4'))
  await p.escribir('mostrar(crearTitulo("último cambio de e4"))')
  await p.pulsar('Siguiente actividad')
  await r.llegada
  await esperar(300)
  assert.equal(p.ubicacion(), '/portafolio?e=4', 'no se navega con el guardado en curso')
  assert.equal(s.llamadas.some((l) => esLectura('e5')(l)), false)

  r.soltar()
  await hasta(() => p.ubicacion() === '/portafolio?e=5' && p.editor()?.value === D5, 'abre e5 con SU borrador')
  const orden = s.llamadas.map((l) => `${l.metodo} ${l.ruta}`)
  assert.ok(orden.indexOf('PUT /api/challenges/e4/progress') < orden.indexOf('GET /api/challenges/e5/progress'))
  assert.equal(s.progreso.get('e4')?.draft_code, 'mostrar(crearTitulo("último cambio de e4"))')
  await esperar(1200)
  assert.equal(s.guardados('e5').length, 0, 'nada del e4 se guarda bajo e5')
  await p.desmontar()
})

test('una respuesta vieja del servidor no pisa el reto que ya está abierto', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', D4)
  s.borrador('e5', D5)
  const p = await montar(s)
  await hasta(() => p.editor()?.value === D4, 'carga e4')

  const lenta = s.retener(esLectura('e5'))
  await p.pulsar('Siguiente actividad')
  await lenta.llegada
  await hasta(() => !!p.boton('← Actividad anterior'), 'botón anterior')
  await p.pulsar('← Actividad anterior')
  await hasta(() => p.ubicacion() === '/portafolio?e=4' && p.editor()?.value === D4 && !p.editor()!.readOnly, 'vuelve a e4')

  lenta.soltar() // llega tarde la respuesta de e5
  await esperar(600)
  assert.equal(p.ubicacion(), '/portafolio?e=4')
  assert.equal(p.editor()?.value, D4, 'el borrador de e5 no aparece en e4')
  assert.equal(p.editor()?.readOnly, false)
  await esperar(900)
  assert.equal(s.guardados('e4').length + s.guardados('e5').length, 0)
  await p.desmontar()
})

test('Atrás con cambios sin guardar y el borrador nuevo tardando: lo del reto anterior nunca va al nuevo', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', D4)
  s.borrador('e5', D5)
  const p = await montar(s, '/portafolio?e=5')
  await hasta(() => p.editor()?.value === D5, 'carga e5')
  const lenta = s.retener(esLectura('e4'))
  await p.escribir('const cambioDeE5 = 1') // sin esperar a la pausa del autoguardado
  await p.ir('/portafolio?e=4') // botón Atrás del navegador: no pasa por "Anterior"
  await lenta.llegada
  await esperar(1500) // más que la pausa del autoguardado, con e4 todavía cargando
  assert.ok(s.guardados('e4').every((l) => l.cuerpo?.draft_code !== 'const cambioDeE5 = 1'), 'nada de e5 bajo e4')
  lenta.soltar()
  await hasta(() => p.editor()?.value === D4, 'e4 con lo suyo')
  await hasta(() => s.progreso.get('e5')?.draft_code === 'const cambioDeE5 = 1', 'el cambio de e5 se guardó en e5')
  assert.equal(s.progreso.get('e4')?.draft_code, D4)
  await p.desmontar()
})

test('lo que se escribe durante un guardado no se da por guardado: se envía después', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', D4)
  const p = await montar(s)
  await hasta(() => p.editor()?.value === D4, 'carga e4')

  const r = s.retener(esGuardado('e4'))
  await p.escribir('const a = 1')
  await r.llegada
  await p.escribir('const a = 1\nconst b = 2')
  r.soltar()
  await esperar(100)
  assert.notEqual(p.sello().split(' · ')[0], 'guardado', 'lo último todavía no llegó')
  await hasta(() => s.progreso.get('e4')?.draft_code === 'const a = 1\nconst b = 2', 'segundo guardado')
  await hasta(() => p.sello().startsWith('guardado'), 'sello')
  await p.desmontar()
})

test('un guardado que falla sin red se reintenta solo, sin volver a escribir', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', D4)
  const p = await montar(s)
  await hasta(() => p.editor()?.value === D4, 'carga e4')

  s.fallar(esGuardado('e4'), 1)
  await p.escribir('const escrito = "sin red"')
  await hasta(() => p.sello().startsWith('error al guardar'), 'se ve el error')
  assert.notEqual(pendiente('e4'), null, 'queda marcado como pendiente en este equipo')

  await hasta(() => s.progreso.get('e4')?.draft_code === 'const escrito = "sin red"', 'reintento automático', 12_000)
  await hasta(() => p.sello().startsWith('guardado'), 'sello tras el reintento')
  assert.equal(pendiente('e4'), null)
  await p.desmontar()
})

test('recargar (F5) tras un fallo: la copia de este equipo gana a la vieja del servidor y se sube', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', D4)
  let p = await montar(s)
  await hasta(() => p.editor()?.value === D4, 'carga e4')
  s.fallar(esGuardado('e4'), 1000)
  await p.escribir('const trabajo = "sin subir"')
  await hasta(() => p.sello().startsWith('error al guardar'), 'error')
  await p.desmontar()

  s.restablecerRed()
  p = await montar(s)
  await hasta(() => p.editor()?.value === 'const trabajo = "sin subir"', 'se muestra la copia local pendiente')
  await hasta(() => s.progreso.get('e4')?.draft_code === 'const trabajo = "sin subir"', 'y se sube')
  await hasta(() => pendiente('e4') === null, 'sin marca pendiente')
  await p.desmontar()
})

test('recargar (F5) con todo guardado: manda el servidor (p. ej. lo editado en otro equipo)', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', D4)
  let p = await montar(s)
  await hasta(() => p.editor()?.value === D4, 'carga e4')
  await p.escribir('const version = "de este equipo"')
  await hasta(() => s.progreso.get('e4')?.draft_code === 'const version = "de este equipo"' && p.sello().startsWith('guardado'), 'guardado')
  await p.desmontar()

  s.borrador('e4', 'const version = "de otro equipo"')
  p = await montar(s)
  await hasta(() => p.editor()?.value === 'const version = "de otro equipo"', 'gana el servidor')
  await esperar(1000)
  assert.equal(s.progreso.get('e4')?.draft_code, 'const version = "de otro equipo"', 'la copia vieja no se vuelve a subir')
  await p.desmontar()
})

test('salir por un enlace (mapa, menú, Atrás) justo después de escribir no pierde lo escrito', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', D4)
  const p = await montar(s)
  await hasta(() => p.editor()?.value === D4, 'carga e4')
  await p.escribir('const ultimo = "antes de salir"')
  await esperar(100) // antes de la pausa del autoguardado
  await p.ir('/mapa')
  await hasta(() => s.progreso.get('e4')?.draft_code === 'const ultimo = "antes de salir"', 'se guarda al salir')
  await p.desmontar()
})

test('recargar la página justo después de escribir no pierde lo escrito', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', D4)
  let p = await montar(s)
  await hasta(() => p.editor()?.value === D4, 'carga e4')
  s.fallar(esGuardado('e4'), 1000) // la pestaña se cierra antes de que nada llegue al servidor
  await p.escribir('const ultimo = "antes de recargar"')
  await esperar(100)
  ventana.dispatchEvent(new ventana.Event('pagehide'))
  // Al cerrar o recargar la pestaña no hay desmontaje de React: lo tiene que dejar escrito el
  // propio aviso de "pagehide", en ese instante.
  assert.equal(ventana.localStorage.getItem('tutorias:draft:alumno-1:e4'), 'const ultimo = "antes de recargar"')
  assert.notEqual(pendiente('e4'), null)
  await p.desmontar()

  s.restablecerRed()
  p = await montar(s)
  await hasta(() => p.editor()?.value === 'const ultimo = "antes de recargar"', 'vuelve lo escrito')
  await hasta(() => s.progreso.get('e4')?.draft_code === 'const ultimo = "antes de recargar"', 'y se sube')
  await p.desmontar()
})

test('cerrar la pestaña con el guardado en camino y seguir en otro equipo: la copia vieja no pisa lo nuevo', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', D4)
  let p = await montar(s)
  await hasta(() => p.editor()?.value === D4, 'carga e4')
  s.colgar(esGuardado('e4')) // el guardado llega, pero la pestaña ya no se entera
  await p.escribir('const v = "A: lo último de clase"')
  await hasta(() => s.progreso.get('e4')?.draft_code === 'const v = "A: lo último de clase"', 'llegó al servidor')
  ventana.dispatchEvent(new ventana.Event('pagehide'))
  await p.desmontar()
  assert.equal(pendiente('e4') !== null, true, 'queda marcado en este equipo')

  // En casa (otro equipo) sigue trabajando y se guarda.
  s.restablecerRed()
  s.borrador('e4', 'const v = "B: trabajo de casa, más nuevo"')

  // De vuelta en el equipo A: manda el servidor y la marca se limpia.
  p = await montar(s)
  await hasta(() => p.editor()?.value === 'const v = "B: trabajo de casa, más nuevo"', 'gana lo más nuevo')
  await esperar(1200)
  assert.equal(s.progreso.get('e4')?.draft_code, 'const v = "B: trabajo de casa, más nuevo"')
  assert.equal(pendiente('e4'), null)
  await p.desmontar()
})

test('dos estudiantes en la misma pestaña: el segundo nunca ve el código del primero', async () => {
  const s = new ServidorFalso()
  let p = await montar(s, '/portafolio?e=4', 'alumna-a')
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'carga e4')
  await p.escribir('const secreto = "de la alumna A"')
  await hasta(() => s.progreso.get('e4')?.draft_code === 'const secreto = "de la alumna A"', 'guardado de A')
  await p.desmontar()

  const otro = new ServidorFalso() // el backend de B no tiene nada de e4
  p = await montar(otro, '/portafolio?e=4', 'alumno-b')
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'carga e4 de B')
  assert.doesNotMatch(p.editor()!.value, /alumna A/)
  assert.equal(p.editor()!.value, componerAndamiaje(4, {}))
  await p.desmontar()
})

test('un borrador que en realidad es datos.js nunca se carga ni se guarda como portafolio.js', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', datosComoTexto({ nombre: 'Ana', hobbies: ['Ajedrez'] }))
  const p = await montar(s)
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'carga e4')
  assert.equal(p.editor()!.value, componerAndamiaje(4, {}))
  await p.pestana('datos.js')
  await esperar(1000)
  assert.equal(s.guardados('e4').length, 0)
  await p.desmontar()
})
