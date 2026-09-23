// "Mis datos" montado de verdad con React en jsdom: el bug de clase vivía en el estado del
// componente (el Enter desaparecía en el re-render), así que no basta con probar funciones.
import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://tutoriasdeverano.netlify.app/portafolio?e=6' })
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
})

const { act, createElement } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MisDatos } = await import('../../src/features/perfil/MisDatos.tsx')
const { PERFIL_DEFECTO } = await import('../../src/lib/perfil.ts')
type Perfil = typeof PERFIL_DEFECTO

async function montar(onGuardar: (p: Perfil) => Promise<void>) {
  const contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  const raiz = createRoot(contenedor)
  await act(async () => {
    raiz.render(createElement(MisDatos, {
      perfil: { ...PERFIL_DEFECTO, hobbies: [], redes: { ...PERFIL_DEFECTO.redes, github: '' } },
      onGuardar,
      onCerrar: () => {},
    }))
  })
  return {
    campo: <T extends HTMLElement>(id: string) => contenedor.querySelector(`#${id}`) as T,
    boton: (texto: string) => [...contenedor.querySelectorAll('button')].find((b) => b.textContent === texto)!,
    contenedor,
    desmontar: () => act(() => raiz.unmount()),
  }
}

/** Escribe como lo haría el navegador: cambia el valor y dispara el evento input. */
async function escribir(el: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto = el.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, valor)
    el.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  })
}

test('hobbies: Ajedrez ⏎ Fútbol ⏎ Música se puede escribir tecla a tecla y se guardan los tres', async () => {
  const guardados: Perfil[] = []
  const ui = await montar(async (p) => { guardados.push(p) })
  const hobbies = ui.campo<HTMLTextAreaElement>('md-hobbies')

  let texto = ''
  for (const tecla of 'Ajedrez\nFútbol\nMúsica') {
    texto += tecla
    await escribir(hobbies, texto)
    // El salto recién escrito no puede desaparecer en el re-render.
    assert.equal(hobbies.value, texto)
  }
  await act(async () => { ui.boton('Guardar').click() })
  assert.equal(guardados.length, 1)
  assert.deepEqual(guardados[0].hobbies, ['Ajedrez', 'Fútbol', 'Música'])
  await ui.desmontar()
})

test('redes: "github.com/ana" se guarda como https://github.com/ana', async () => {
  const guardados: Perfil[] = []
  const ui = await montar(async (p) => { guardados.push(p) })
  await escribir(ui.campo<HTMLInputElement>('md-github'), 'github.com/ana')
  await act(async () => { ui.boton('Guardar').click() })
  assert.equal(guardados[0]?.redes.github, 'https://github.com/ana')
  await ui.desmontar()
})

test('un dato inválido se señala en su campo y no se envía nada', async () => {
  let llamadas = 0
  const ui = await montar(async () => { llamadas++ })
  const github = ui.campo<HTMLInputElement>('md-github')
  await escribir(github, 'mi perfil')
  await act(async () => { ui.boton('Guardar').click() })
  assert.equal(llamadas, 0)
  assert.equal(github.getAttribute('aria-invalid'), 'true')
  const error = ui.contenedor.querySelector('#md-github-error')
  assert.match(error?.textContent ?? '', /dirección web/)
  assert.equal(github.getAttribute('aria-describedby'), 'md-github-error')
  assert.equal(document.activeElement, github)
  await ui.desmontar()
})

test('si el servidor rechaza el guardado, el formulario sigue abierto y lo dice', async () => {
  const ui = await montar(async () => { throw new Error('sin red') })
  await act(async () => { ui.boton('Guardar').click() })
  assert.ok(ui.contenedor.querySelector('[role="alert"]'))
  assert.equal(ui.boton('Guardar').disabled, false)
  await ui.desmontar()
})

test('el foco no salta a "Nombre" cuando el editor de fondo se vuelve a dibujar', async () => {
  const contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  const raiz = createRoot(contenedor)
  const dibujar = () => raiz.render(createElement(MisDatos, {
    perfil: PERFIL_DEFECTO,
    onGuardar: async () => {},
    // Una función nueva en cada render, como la que pasa VistaEstudiante.
    onCerrar: () => {},
  }))
  await act(async () => { dibujar() })
  const hobbies = contenedor.querySelector('#md-hobbies') as HTMLTextAreaElement
  hobbies.focus()
  await act(async () => { dibujar() }) // p. ej. el autoguardado actualiza el estado del padre
  assert.equal(document.activeElement, hobbies)
  await act(() => raiz.unmount())
})
