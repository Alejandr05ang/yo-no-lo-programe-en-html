// "Mis datos" de punta a punta en la pantalla REAL del estudiante: lo que se escribe en el
// formulario → PUT /api/profile → la sesión se vuelve a leer → datos.js → el runtime del
// sandbox → la revisión de E4 (redes) y E6 (hobbies). Es el recorrido de los bugs 1 y 3.
import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { ventana } from './entorno.ts'
import { ServidorFalso } from './servidorFalso.ts'

const { act } = await import('react')
const { focusManager } = await import('@tanstack/react-query')
const { montar, hasta, esperar } = await import('./montar.ts')
const { componerAndamiaje } = await import('../../src/lib/encargos.ts')

beforeEach(() => {
  ventana.localStorage.clear()
  ventana.sessionStorage.clear()
})

async function escribirEn(el: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto = el.tagName === 'TEXTAREA' ? ventana.HTMLTextAreaElement.prototype : ventana.HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, valor)
    el.dispatchEvent(new ventana.Event('input', { bubbles: true }))
  })
}

const datosJs = (c: HTMLElement) => c.querySelector<HTMLTextAreaElement>('textarea[data-editor="datos.js"]')?.value ?? ''

test('Mis datos → datos.js → E4: redes sin https y tres hobbies, tecla a tecla, hasta aceptado', async () => {
  const s = new ServidorFalso()
  const p = await montar(s)
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'carga e4')

  await p.pestana('datos.js')
  await p.pulsar('editar mis datos')
  const campo = <T extends HTMLElement>(id: string) => p.contenedor.querySelector(`#${id}`) as T
  await escribirEn(campo<HTMLInputElement>('md-github'), 'github.com/ana')
  await escribirEn(campo<HTMLInputElement>('md-linkedin'), 'www.linkedin.com/in/ana')
  const hobbies = campo<HTMLTextAreaElement>('md-hobbies')
  let texto = ''
  for (const tecla of 'Ajedrez\nFútbol\nMúsica') {
    texto += tecla
    await escribirEn(hobbies, texto)
    assert.equal(hobbies.value, texto, 'el salto de línea recién escrito no desaparece')
  }
  await p.pulsar('Guardar')
  await hasta(() => !p.contenedor.querySelector('#md-hobbies'), 'se cierra el formulario')

  assert.equal(s.perfil.github_url, 'https://github.com/ana')
  assert.equal(s.perfil.linkedin_url, 'https://www.linkedin.com/in/ana')
  assert.deepEqual(s.perfil.hobbies, ['Ajedrez', 'Fútbol', 'Música'])
  await hasta(() => datosJs(p.contenedor).includes('Música'), 'datos.js se actualiza')
  for (const esperado of ['Ajedrez', 'Fútbol', 'Música', 'https://github.com/ana', 'https://www.linkedin.com/in/ana', 'ana@ejemplo.com']) {
    assert.ok(datosJs(p.contenedor).includes(esperado), `datos.js incluye ${esperado}`)
  }

  // Reabrir el formulario muestra los tres hobbies, uno por línea.
  await p.pulsar('editar mis datos')
  assert.equal(campo<HTMLTextAreaElement>('md-hobbies').value, 'Ajedrez\nFútbol\nMúsica')
  await p.pulsar('Cancelar')

  await p.pestana('portafolio.js')
  await p.escribir(`${componerAndamiaje(4, {})}
PARA CADA red EN datos.redes HACER
  SI red.url !== "" ENTONCES
    mostrar(crearEnlace(red.nombre, red.url))
  FIN SI
FIN PARA`)
  await p.pulsar('Entregar a revisión')
  await hasta(() => s.progreso.get('e4')?.status === 'accepted', 'E4 aceptado')
  assert.match(p.texto(), /2 \/ 2 casos/)
  // Y en la vista previa (al ejecutar) los enlaces llevan fuera de la plataforma.
  const vista = () => p.contenedor.querySelector('iframe.pv-marco')?.getAttribute('srcdoc') ?? ''
  await p.pulsar('Ejecutar')
  await hasta(() => vista().includes('mailto:'), 'la vista previa muestra los enlaces')
  for (const href of ['https://github.com/ana', 'https://www.linkedin.com/in/ana', 'mailto:ana@ejemplo.com']) {
    assert.ok(vista().includes(`href="${href}"`), `vista previa con ${href}`)
  }
  await p.desmontar()
})

test('E6 recorre los hobbies guardados: con tres y con ninguno', async () => {
  const SOLUCION_E6 = (base: string) => `${base}
vaciar(lista)
PARA CADA hobby EN datos.hobbies HACER
  agregarA(lista, crearItem(hobby))
FIN PARA
mostrar(lista)`
  for (const hobbies of [['Ajedrez', 'Fútbol', 'Música'], []]) {
    ventana.localStorage.clear()
    ventana.sessionStorage.clear()
    const s = new ServidorFalso()
    s.perfil.hobbies = hobbies
    const p = await montar(s, '/portafolio?e=6')
    await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'carga e6')
    await p.escribir(SOLUCION_E6(p.editor()!.value))
    await p.pulsar('Entregar a revisión')
    await hasta(() => s.progreso.get('e6')?.status === 'accepted', `E6 aceptado con ${hobbies.length} hobbies`)
    await p.desmontar()
  }
})

test('E6 sin hobbies guardados no se acepta sin recorrer la lista: se prueba también con hobbies de ejemplo', async () => {
  const s = new ServidorFalso() // perfil sin hobbies: lo normal si nunca se abrió "Mis datos"
  const p = await montar(s, '/portafolio?e=6')
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'carga e6')
  const base = p.editor()!.value
  await p.escribir(`${base}\nvaciar(lista)`) // deja la lista vacía, sin PARA CADA
  await p.pulsar('Entregar a revisión')
  await hasta(() => /\d \/ 3 casos/.test(p.texto()), 'resultado')
  assert.notEqual(s.progreso.get('e6')?.status, 'accepted')
  assert.match(p.texto(), /también se probó con tres de ejemplo/)
  await p.desmontar()
})

test('los datos de "Mis datos" guardados en el navegador de antes no pisan el nombre real ni meten datos de ejemplo', async () => {
  // Formulario viejo (localStorage 've:perfil'): empezaba con los datos de ejemplo de Ana Rivas
  // y el estudiante solo cambió sus hobbies y escribió su GitHub sin https.
  ventana.localStorage.setItem('ve:perfil', JSON.stringify({
    nombre: 'Ana Rivas',
    sobreMi: 'Estudio ingeniería y estoy aprendiendo a construir cosas para internet.',
    redes: { github: 'github.com/luis', linkedin: '', correo: 'ana@ejemplo.com' },
    hobbies: ['Fútbol', 'Guitarra'],
  }))
  const s = new ServidorFalso()
  s.perfil.display_name = 'Luis'
  s.perfil.full_name = 'Luis Pérez'
  const p = await montar(s)
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'carga e4')
  await hasta(() => s.llamadas.some((l) => l.ruta === '/api/profile'), 'migración')
  await esperar(300)
  assert.equal(s.perfil.display_name, 'Luis', 'el nombre real no cambia')
  assert.equal(s.perfil.full_name, 'Luis Pérez')
  assert.equal(s.perfil.description, '', 'el texto de ejemplo no se sube')
  assert.equal(s.perfil.github_url, 'https://github.com/luis', 'el enlace se normaliza')
  assert.deepEqual(s.perfil.hobbies, ['Fútbol', 'Guitarra'])
  assert.equal(ventana.localStorage.getItem('ve:perfil'), null, 'la copia vieja se olvida')
  await esperar(1500)
  assert.equal(s.llamadas.filter((l) => l.ruta === '/api/profile').length, 1, 'una sola vez')
  assert.ok(p.editor(), 'el editor sigue montado')
  await p.desmontar()
})

test('si el docente pausa el día con "Mis datos" abierto, lo que se estaba escribiendo no se pierde', async () => {
  const s = new ServidorFalso()
  const p = await montar(s)
  await hasta(() => !!p.editor() && !p.editor()!.readOnly, 'carga e4')
  await p.pestana('datos.js')
  await p.pulsar('editar mis datos')
  const bio = p.contenedor.querySelector('#md-bio') as HTMLTextAreaElement
  await escribirEn(bio, 'Me gusta programar')
  s.accesos.Mi1 = 'paused'
  await act(async () => { focusManager.setFocused(false); focusManager.setFocused(true) }) // volver a la pestaña: se pide el mapa
  await hasta(() => p.texto().includes('Este día está en pausa'), 'se pausa', 60_000)
  const bioDespues = p.contenedor.querySelector('#md-bio') as HTMLTextAreaElement | null
  assert.equal(bioDespues?.value, 'Me gusta programar')
  await p.desmontar()
})

test('E6 con 0 hobbies: si el bucle falla con los hobbies de ejemplo, la nota dice dónde; si no corrió, no dice que se probó', async () => {
  const { revisarLocalmente } = await import('../../src/lib/revisionLocal.ts')
  const base = componerAndamiaje(6, {})
  const conError = `${base}\nvaciar(lista)\nPARA CADA hobby EN datos.hobbies HACER\n  agregarA(lista, crearItem(hobbie))\nFIN PARA`
  const r = await revisarLocalmente(6, conError, { hobbies: [] })
  assert.ok(r.casosPasados < r.casosTotales)
  assert.match(r.nota ?? '', /Con esos datos tu código falló: .*hobbie.*\(línea \d+\)/)
  const roto = await revisarLocalmente(6, `${base}\nSI 1 > 0 ENTONCES`, { hobbies: [] })
  assert.doesNotMatch(roto.nota ?? '', /también se probó/)
})
