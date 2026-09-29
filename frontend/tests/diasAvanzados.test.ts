import assert from 'node:assert/strict'
import test from 'node:test'
import './vista/entorno.ts'
import { revisarLocalmente } from '../src/lib/revisionLocal.ts'
import { ejecutarPreview } from '../src/lib/sandbox.ts'

const soluciones: Record<number, string> = {
  7: 'if (datos.sobreMi.trim()) mostrar(crearParrafo(datos.sobreMi)); else mostrar(crearParrafo("En construcción"))',
  8: 'const c=crearCarrusel(); mostrar(c); cadaSegundo(c, proyectosDestacados(datos.proyectos), p=>crearImagen(p.imagenUrl,p.nombre))',
  9: 'for(const p of datos.proyectos) if(p.terminado === true) mostrar(crearParrafo(p.nombre))',
  10: 'for(const g of datos.skills){mostrar(crearSubtitulo(g.categoria)); const l=crearLista(); mostrar(l); for(const item of g.items) agregarA(l,crearItem(item));}',
  11: String.raw`for(const p of datos.proyectos){
    const nombre=p.nombre || 'Proyecto sin nombre';
    if(p.tipo==='demo' && p.url && /^https?:\/\//.test(p.url)) mostrar(crearEnlace(nombre,p.url));
    else mostrar(crearParrafo(nombre));
  }`,
}
const proyecto = (nombre: string, terminado = true) => ({ nombre, terminado, destacado: true, imagenUrl: `https://example.com/${nombre}.png`, tipo: 'texto' })

for (const [numero, datos] of [
  [7, { sobreMi: '' }], [7, { sobreMi: 'Mi biografía' }], [7, { sobreMi: '  ' }],
  [8, { proyectos: [] }], [8, { proyectos: [proyecto('Uno')] }],
  [8, { proyectos: [proyecto('Uno'), { ...proyecto('Dos'), destacado: false }, proyecto('Tres')] }],
  [8, { proyectos: Array.from({ length: 15 }, (_, i) => proyecto(`Proyecto ${i}`)) }],
  [9, { proyectos: [] }], [9, { proyectos: [proyecto('Pendiente', false)] }],
  [9, { proyectos: [proyecto('Uno')] }], [9, { proyectos: [proyecto('Web'), proyecto('Web grande'), proyecto('Oculto', false)] }],
  [10, { skills: [] }], [10, { skills: [{ categoria: 'Vacía', items: [] }] }],
  [10, { skills: [{ categoria: 'Una', items: ['Uno'] }, { categoria: 'Varias', items: ['Uno', 'Dos', 'Tres'] }] }],
  [11, { proyectos: [] }], [11, { proyectos: [proyecto('Solo texto')] }],
  [11, { proyectos: [{ nombre: 'Demo', tipo: 'demo', url: 'https://example.com/demo' }] }],
  [11, { proyectos: [{ nombre: 'Sin URL', tipo: 'demo' }, { nombre: 'Rota', tipo: 'demo', url: 'javascript:alert(1)' }, { nombre: 'Otro', tipo: 'futuro' }, {}] }],
] as const) {
  test(`E${numero}: acepta solución general con datos ${JSON.stringify(datos)}`, async () => {
    const r = await revisarLocalmente(numero, soluciones[numero], datos)
    assert.equal(r.casosPasados, r.casosTotales, JSON.stringify(r))
  })
}

for (const [numero, codigo, datos] of [
  [7, 'mostrar(crearParrafo("En construcción"))', { sobreMi: '' }],
  [8, 'const c=crearCarrusel(); mostrar(c); agregarA(c,crearImagen("https://example.com/Uno.png","Uno"))', { proyectos: [proyecto('Uno')] }],
  [9, 'mostrar(crearParrafo("Uno"))', { proyectos: [proyecto('Uno')] }],
  [10, 'mostrar(crearSubtitulo("Una")); const l=crearLista();mostrar(l);agregarA(l,crearItem("Uno"))', { skills: [{ categoria: 'Una', items: ['Uno'] }] }],
  [11, 'mostrar(crearParrafo("Uno"))', { proyectos: [proyecto('Uno')] }],
] as const) {
  test(`E${numero}: rechaza una solución escrita solo para la muestra visible`, async () => {
    const r = await revisarLocalmente(numero, codigo, datos)
    assert.ok(r.casosPasados < r.casosTotales, JSON.stringify(r))
  })
}

test('E9 conserva el orden de los proyectos terminados', async () => {
  const datos = { proyectos: [proyecto('Uno'), proyecto('Dos')] }
  const codigo = 'for(const p of [...datos.proyectos].reverse()) mostrar(crearParrafo(p.nombre))'
  const html = (await ejecutarPreview(codigo, datos)).html
  const r = await revisarLocalmente(9, codigo, datos, html)
  assert.ok(r.casosPasados < r.casosTotales)
})

test('E10 no acepta listas intercambiadas entre categorías', async () => {
  const datos = { skills: [{ categoria: 'A', items: ['uno'] }, { categoria: 'B', items: ['dos'] }] }
  const r = await revisarLocalmente(10, '', datos, '<h2>A</h2><ul><li>dos</li></ul><h2>B</h2><ul><li>uno</li></ul>')
  assert.ok(r.casosPasados < r.casosTotales)
})

test('E8 rechaza un carrusel estático aunque tome el primer destacado de datos', async () => {
  const codigo = 'const c=crearCarrusel();mostrar(c);const destacados=proyectosDestacados(datos.proyectos);if(destacados.length) agregarA(c,crearImagen(destacados[0].imagenUrl,destacados[0].nombre))'
  const r = await revisarLocalmente(8, codigo, { proyectos: [proyecto('Uno'), proyecto('Dos')] })
  assert.ok(r.casosPasados < r.casosTotales, JSON.stringify(r))
})

test('E8 rechaza un temporizador que acumula imágenes', async () => {
  const codigo = 'const c=crearCarrusel();mostrar(c);const destacados=proyectosDestacados(datos.proyectos);let i=0; cadaSegundo(()=>{if(destacados.length){const p=destacados[i++%destacados.length];agregarA(c,crearImagen(p.imagenUrl,p.nombre))}})'
  const r = await revisarLocalmente(8, codigo, { proyectos: [proyecto('Uno'), proyecto('Dos')] })
  assert.ok(r.casosPasados < r.casosTotales, JSON.stringify(r))
})

test('E12 y E13 no se aceptan automáticamente por tener cero casos de revisión visual', async () => {
  for (const numero of [12, 13]) {
    const r = await revisarLocalmente(numero, '', {})
    assert.ok(r.casosPasados < r.casosTotales, JSON.stringify(r))
    assert.match(r.nota ?? '', /visual|instructor/i)
  }
})
