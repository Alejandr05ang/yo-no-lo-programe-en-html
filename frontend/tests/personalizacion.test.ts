// Las herramientas de personalización visual (Ju1: crearSeccion/cambiarColorTexto/
// cambiarTamano/cambiarFuente/cambiarColorFondo) corren con el runtime REAL del sandbox
// (helpers/runtimeReal.ts), no con un mock — así se prueba lo mismo que ejecuta un estudiante,
// sin necesitar un navegador ni la app completa (útil cuando no hay forma de levantar
// `npm run dev`, p. ej. sin credenciales de Firebase a mano).
import assert from 'node:assert/strict'
import test from 'node:test'
import { ejecutarReal, parser } from './helpers/runtimeReal.ts'

function doc(html: string) {
  return parser.parseFromString(`<body>${html}</body>`, 'text/html')
}

test('crearSeccion: cada tipo trae la clase esperada; uno desconocido no rompe la página', async () => {
  const r = await ejecutarReal(
    `
mostrar(crearSeccion("encabezado"))
mostrar(crearSeccion("cuerpo"))
mostrar(crearSeccion("cuadricula-2"))
mostrar(crearSeccion("cuadricula-3"))
mostrar(crearSeccion("no existe"))
`,
    {},
  )
  assert.equal(r.ok, true, r.error)
  const divs = [...doc(r.html).querySelectorAll('div')]
  assert.equal(divs.length, 5)
  assert.equal(divs[0].className, 'fila')
  assert.equal(divs[1].className, 'card')
  assert.equal(divs[2].className, 'grid grid-2')
  assert.equal(divs[3].className, 'grid grid-3')
  assert.equal(divs[4].className, '', 'un tipo desconocido no agrega ninguna clase, no revienta')
})

test('cambiarColorTexto/cambiarTamano/cambiarFuente devuelven el mismo elemento con el estilo puesto', async () => {
  const r = await ejecutarReal(
    `
const p1 = crearParrafo("uno")
mostrar(cambiarColorTexto(p1, "#2b6a4f"))
const p2 = crearParrafo("dos")
mostrar(cambiarTamano(p2, "grande"))
const t = crearTitulo("tres")
mostrar(cambiarFuente(t, "manuscrita"))
`,
    {},
  )
  assert.equal(r.ok, true, r.error)
  const d = doc(r.html)
  const [p1, p2] = d.querySelectorAll('p')
  assert.equal((p1 as HTMLElement).style.color, 'rgb(43, 106, 79)')
  assert.equal((p2 as HTMLElement).style.fontSize, '1.3em')
  assert.match((d.querySelector('h1') as HTMLElement).style.fontFamily, /Caveat/)
})

test('cambiarTamano/cambiarFuente con un valor no listado usan el valor por defecto, no rompen', async () => {
  const r = await ejecutarReal(
    `
const p = crearParrafo("x")
cambiarTamano(p, "gigante")
cambiarFuente(p, "picasso")
mostrar(p)
`,
    {},
  )
  assert.equal(r.ok, true, r.error)
  const p = doc(r.html).querySelector('p') as HTMLElement
  assert.equal(p.style.fontSize, '1em')
  assert.match(p.style.fontFamily, /Lora/)
})

test('cambiarColorFondo(color) cambia el fondo de toda la página, y sobrevive en el HTML devuelto', async () => {
  const r = await ejecutarReal('cambiarColorFondo("#f2ece0")\nmostrar(crearTitulo("hola"))', {})
  assert.equal(r.ok, true, r.error)
  const estilo = doc(r.html).querySelector('style')
  assert.ok(estilo, 'debe quedar un <style> dentro del HTML devuelto, no solo en el documento efímero de la ejecución')
  assert.match(estilo!.textContent ?? '', /--color-fondo:\s*#f2ece0/)
})

test('cambiarColorFondo(elemento, color) cambia el fondo de ESE elemento nada más', async () => {
  const r = await ejecutarReal(
    `
const recuadro = crearSeccion("cuerpo")
mostrar(recuadro)
cambiarColorFondo(recuadro, "#eef1e6")
`,
    {},
  )
  assert.equal(r.ok, true, r.error)
  const div = doc(r.html).querySelector('div.card') as HTMLElement
  assert.equal(div.style.backgroundColor, 'rgb(238, 241, 230)')
})

test('cambiarAlineacion pone el text-align esperado; un valor no listado usa "izquierda"', async () => {
  const r = await ejecutarReal(
    `
const p1 = crearParrafo("uno")
mostrar(cambiarAlineacion(p1, "centro"))
const p2 = crearParrafo("dos")
mostrar(cambiarAlineacion(p2, "no existe"))
`,
    {},
  )
  assert.equal(r.ok, true, r.error)
  const [p1, p2] = doc(r.html).querySelectorAll('p')
  assert.equal((p1 as HTMLElement).style.textAlign, 'center')
  assert.equal((p2 as HTMLElement).style.textAlign, 'left')
})
