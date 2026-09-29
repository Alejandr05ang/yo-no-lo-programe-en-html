import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { ventana } from './entorno.ts'
import { ServidorFalso, esGuardado } from './servidorFalso.ts'
const { montar, hasta } = await import('./montar.ts')

beforeEach(() => { ventana.localStorage.clear(); ventana.sessionStorage.clear() })

test('Mi sitio espera la confirmación del último borrador antes de abrir la publicación', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', 'mostrar(crearTitulo("antes"))')
  const p = await montar(s)
  await hasta(() => p.editor()?.value.includes('antes') === true, 'carga')
  const save = s.retener(esGuardado('e4'))
  const latest = 'mostrar(crearTitulo("versión que compartiré"))'
  await p.escribir(latest)
  await p.pulsar('Mi sitio')
  await save.llegada
  assert.equal(p.ubicacion(), '/portafolio?e=4')
  save.soltar()
  await hasta(() => p.ubicacion() === '/mi-sitio?challenge_key=e4', 'abre Mi sitio')
  assert.equal(s.progreso.get('e4')!.draft_code, latest)
})

test('sin conexión Mi sitio conserva el editor y no presenta fuente vieja como actual', async () => {
  const s = new ServidorFalso()
  s.borrador('e4', 'mostrar(crearTitulo("antes"))')
  const p = await montar(s)
  await hasta(() => p.editor()?.value.includes('antes') === true, 'carga')
  s.fallar(esGuardado('e4'), 100)
  const latest = 'mostrar(crearTitulo("sin red"))'
  await p.escribir(latest)
  await p.pulsar('Mi sitio')
  await hasta(() => p.texto().includes('guarda los cambios con conexión'), 'aviso')
  assert.equal(p.ubicacion(), '/portafolio?e=4')
  assert.equal(p.editor()!.value, latest)
  assert.equal(ventana.localStorage.getItem('tutorias:draft:alumno-1:e4'), latest)
})

test('abrir Mi sitio guarda la fuente heredada inicial aunque todavía no se haya editado', async () => {
  const s = new ServidorFalso()
  const p = await montar(s)
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'carga fuente inicial')
  const initial = p.editor()!.value
  assert.ok(initial.trim())
  await p.pulsar('Mi sitio')
  await hasta(() => p.ubicacion().startsWith('/mi-sitio'), 'publicación de fuente inicial')
  assert.equal(s.progreso.get('e4')?.draft_code, initial)
})
