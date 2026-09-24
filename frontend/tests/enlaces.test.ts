import assert from 'node:assert/strict'
import test from 'node:test'
import { esEnlaceExterno, normalizarEnlace, normalizarEnlacesDelHtml, normalizarUrlDePerfil } from '../src/lib/enlaces.ts'
import { enlaces, ejecutarReal, parser, URL_APP } from './helpers/runtimeReal.ts'

// Bug de clase: crearEnlace("Wikipedia", "wikipedia.com") llevaba a
// "tutoriasdeverano…/wikipedia.com", porque un dominio sin esquema es una ruta relativa.

const CASOS: [string, string | null][] = [
  ['https://wikipedia.com', 'https://wikipedia.com'],
  ['https://es.wikipedia.org/wiki/Cuenca_(Ecuador)', 'https://es.wikipedia.org/wiki/Cuenca_(Ecuador)'],
  ['http://ejemplo.com', 'http://ejemplo.com'], // se respeta lo escrito: no se degrada ni se reescribe
  ['wikipedia.com', 'https://wikipedia.com'],
  ['www.wikipedia.com', 'https://www.wikipedia.com'],
  ['  github.com/ana  ', 'https://github.com/ana'],
  ['ups.edu.ec/cuenca', 'https://ups.edu.ec/cuenca'],
  ['localhost.dev:8080/x?y=1', 'https://localhost.dev:8080/x?y=1'],
  ['//cdn.ejemplo.com/a', 'https://cdn.ejemplo.com/a'],
  // Una barra de menos (o invertida): el navegador lo resolvería contra la plataforma.
  ['https:/wikipedia.com', 'https://wikipedia.com/'],
  ['https:wikipedia.com', 'https://wikipedia.com/'],
  ['HTTPS:/wikipedia.com', 'https://wikipedia.com/'],
  ['https:\\wikipedia.com', 'https://wikipedia.com/'],
  ['persona@dominio.com', 'mailto:persona@dominio.com'],
  ['mailto:persona@dominio.com', 'mailto:persona@dominio.com'],
  ['ana%x@ejemplo.com', 'mailto:ana%25x@ejemplo.com'], // el % se lee de vuelta igual
  ['#proyectos', '#proyectos'],
  ['javascript:alert(1)', null],
  ['JavaScript:alert(1)', null],
  ['data:text/html,<b>x</b>', null],
  ['vbscript:x', null],
  ['file:///C:/x', null],
  ['mailto:no-es-correo', null],
  ['mailto:ana%@correo.com', null], // un % suelto no debe lanzar (antes: URIError)
  ['mailto:%E0%A4%A@x.com', null],
  ['', null],
  ['   ', null],
  ['#', null],
  ['hola mundo', null],
  ['wikipedia', null],
  ['https://', null],
]

test('normalizarEnlace: cada forma de escribir una dirección tiene un destino claro', () => {
  for (const [entrada, esperado] of CASOS) {
    assert.equal(normalizarEnlace(entrada), esperado, `normalizarEnlace(${JSON.stringify(entrada)})`)
  }
  assert.equal(normalizarEnlace(undefined), null)
  assert.equal(normalizarEnlace(42), null)
})

test('normalizarEnlace es idempotente: la vista previa y la revisión pueden aplicarla las dos', () => {
  for (const [entrada] of CASOS) {
    const una = normalizarEnlace(entrada)
    assert.equal(normalizarEnlace(una), una, `idempotencia de ${JSON.stringify(entrada)}`)
  }
})

test('solo lo externo (web o correo) se abre fuera de la vista previa', () => {
  assert.equal(esEnlaceExterno('https://x.com'), true)
  assert.equal(esEnlaceExterno('mailto:a@b.co'), true)
  assert.equal(esEnlaceExterno('#seccion'), false)
  assert.equal(esEnlaceExterno(null), false)
})

test('los campos de Mis datos aceptan direcciones sin https:// y las guardan como https', () => {
  assert.equal(normalizarUrlDePerfil('github.com/ana'), 'https://github.com/ana')
  assert.equal(normalizarUrlDePerfil('www.linkedin.com/in/ana'), 'https://www.linkedin.com/in/ana')
  assert.equal(normalizarUrlDePerfil('http://github.com/ana'), 'https://github.com/ana')
  assert.equal(normalizarUrlDePerfil('https://github.com/ana'), 'https://github.com/ana')
  assert.equal(normalizarUrlDePerfil(''), '')
  assert.equal(normalizarUrlDePerfil('   '), '')
  assert.equal(normalizarUrlDePerfil('ana@correo.com'), null)
  assert.equal(normalizarUrlDePerfil('mi perfil'), null)
  assert.equal(normalizarUrlDePerfil('https://localhost/x'), null)
  // El fragmento lo rechaza el backend, pero es la misma página: se quita.
  assert.equal(normalizarUrlDePerfil('github.com/ana#repos'), 'https://github.com/ana')
  assert.equal(normalizarUrlDePerfil('https://github.com/ana/portafolio#readme'), 'https://github.com/ana/portafolio')
})

test('los href de un HTML se normalizan y los inválidos dejan de navegar, con aviso', () => {
  const { html, avisos } = normalizarEnlacesDelHtml(
    '<p><a href="wikipedia.com">W</a><a href="javascript:alert(1)">X</a><a href="#arriba">Arriba</a></p>',
    parser,
  )
  const a = enlaces(html)
  assert.deepEqual(a.map((e) => e.href), ['https://wikipedia.com', null, '#arriba'])
  assert.equal(avisos.length, 1)
  assert.match(avisos[0], /"X" no tiene una dirección válida/)
})

test('crearEnlace con el runtime real: un dominio sin esquema abre el sitio externo, no una ruta de la plataforma', async () => {
  const r = await ejecutarReal(
    'mostrar(crearEnlace("Wikipedia", "wikipedia.com"))\nmostrar(crearEnlace("Correo", "ana@ejemplo.com"))\nmostrar(crearEnlace("Seguro", "https://ups.edu.ec"))\nmostrar(crearEnlace("Una barra", "https:/es.wikipedia.org"))',
    {},
  )
  assert.equal(r.ok, true, r.error)
  const a = enlaces(r.html)
  assert.deepEqual(a.map((e) => e.navegaA), ['https://wikipedia.com/', 'mailto:ana@ejemplo.com', 'https://ups.edu.ec/', 'https://es.wikipedia.org/'])
  const origenApp = new URL(URL_APP).origin
  assert.ok(a.every((e) => !e.navegaA?.startsWith(origenApp)), 'ningún enlace debe resolverse contra la plataforma')
})

test('crearEnlace con una dirección vacía no produce una navegación absurda', async () => {
  const r = await ejecutarReal('mostrar(crearEnlace("Nada", ""))', {})
  assert.equal(r.ok, true, r.error)
  assert.deepEqual(enlaces(r.html).map((e) => e.href), [null])
  assert.ok(r.logs.some((l) => /no tiene una dirección válida/.test(l)))
})

test('un % mal formado en un mailto no rompe la vista previa ni el formulario', async () => {
  const r = await ejecutarReal('mostrar(crearEnlace("Escríbeme", "mailto:ana%@correo.com"))', {})
  assert.equal(r.ok, true, r.error)
  assert.deepEqual(enlaces(r.html).map((e) => e.href), [null])
  assert.equal(normalizarUrlDePerfil('mailto:%zz@x.com'), null)
})

test('la normalización también reconoce <A> en mayúsculas', () => {
  const { html } = normalizarEnlacesDelHtml('<A HREF="javascript:alert(1)">x</A>', parser)
  assert.deepEqual(enlaces(html).map((e) => e.href), [null])
})
