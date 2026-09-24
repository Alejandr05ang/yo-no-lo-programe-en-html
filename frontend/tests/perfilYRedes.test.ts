import assert from 'node:assert/strict'
import test from 'node:test'
import type { BackendUser } from '../src/lib/backendTypes.ts'
import { componerAndamiaje } from '../src/lib/encargos.ts'
import { datosComoTexto } from '../src/lib/mockEncargo.ts'
import {
  borradorDesdePerfil,
  MAX_HOBBIES,
  perfilComoDatos,
  perfilDesdeBackend,
  perfilParaBackend,
  prepararPerfil,
  textoComoHobbies,
  type BorradorPerfil,
} from '../src/lib/perfil.ts'
import { revisarLocalmente } from '../src/lib/revisionLocal.ts'
import { enlaces, ejecutarReal } from './helpers/runtimeReal.ts'

const USUARIO: BackendUser = {
  id: 'u1', email: 'ana@ejemplo.com', full_name: 'Ana Rivas', display_name: 'Ana', description: '',
  hobbies: [], avatar_path: null, github_url: null, linkedin_url: null, website_url: null,
  role: 'student', email_verified: true, profile_completed_at: null, is_active: true,
}

/** Lo que haría el backend: guarda el payload de PUT /api/profile y lo devuelve en la sesión. */
function guardarYRehidratar(borrador: BorradorPerfil): BackendUser {
  const r = prepararPerfil(borrador)
  assert.equal(r.errores, null, JSON.stringify(r.errores))
  const payload = perfilParaBackend(r.perfil!, USUARIO)
  return { ...USUARIO, ...payload, github_url: payload.github_url, linkedin_url: payload.linkedin_url }
}

// ── Hobbies (bug de clase P0) ────────────────────────────────────────────────────

// El Enter tecla a tecla se prueba con el componente montado (tests/ui/misDatos.test.tsx);
// aquí, la conversión del texto a lista que se hace al guardar.
test('hobbies: el texto de varias líneas se convierte en la lista al guardar', () => {
  const borrador = { ...borradorDesdePerfil(perfilDesdeBackend(USUARIO)), hobbiesTexto: 'Ajedrez\nFútbol\nMúsica' }
  assert.deepEqual(prepararPerfil(borrador).perfil?.hobbies, ['Ajedrez', 'Fútbol', 'Música'])
})

test('perfil: los límites cuentan caracteres como el backend (un emoji es uno) y recortan como Python', () => {
  const base = borradorDesdePerfil(perfilDesdeBackend(USUARIO))
  assert.match(prepararPerfil({ ...base, nombre: '😀' }).errores?.nombre ?? '', /entre 2 y 80/)
  assert.equal(prepararPerfil({ ...base, nombre: '😀'.repeat(80) }).errores, null)
  assert.equal(prepararPerfil({ ...base, hobbiesTexto: '🎸'.repeat(80) }).errores, null)
  assert.match(prepararPerfil({ ...base, hobbiesTexto: '🎸'.repeat(81) }).errores?.hobbies ?? '', /80 caracteres/)
  // \x85 es espacio para Python: una línea con solo eso no es un hobby.
  assert.deepEqual(prepararPerfil({ ...base, hobbiesTexto: 'Ajedrez\n\x85\nMúsica' }).perfil?.hobbies, ['Ajedrez', 'Música'])
})

test('perfil: una dirección más larga de lo que acepta el backend se señala en su campo', () => {
  const base = borradorDesdePerfil(perfilDesdeBackend(USUARIO))
  assert.match(prepararPerfil({ ...base, github: `github.com/${'a'.repeat(2100)}` }).errores?.github ?? '', /demasiado larga/)
  assert.match(prepararPerfil({ ...base, linkedin: `linkedin.com/in/${'é'.repeat(400)}` }).errores?.linkedin ?? '', /demasiado larga/)
})

test('redes: un enlace vacío no cuenta como el enlace a una dirección que no se puede interpretar', async () => {
  const datos = { ...perfilComoDatos(perfilDesdeBackend(USUARIO)), redes: [{ nombre: 'Demo', url: 'https://demo.example' }, { nombre: 'Rota', url: 'no es una url' }] }
  // Correcta con datos imperfectos: no se le exige lo imposible.
  const buena = await revisarE4(datos)
  assert.equal(buena.revision.casosPasados, buena.revision.casosTotales, JSON.stringify(buena.revision.casos))
  // Incorrecta: pone un enlace vacío donde había una dirección válida.
  const mala = await revisarE4(datos, 'mostrar(crearEnlace("Demo", ""))\nmostrar(crearEnlace("Rota", ""))')
  assert.equal(mala.revision.casos.find((c) => /dirección correcta/.test(c.descripcion))?.estado, 'falla')
})

test('hobbies: el payload final lleva los tres, y tras rehidratar datos.js los muestra', () => {
  const guardado = guardarYRehidratar({ ...borradorDesdePerfil(perfilDesdeBackend(USUARIO)), hobbiesTexto: 'Ajedrez\nFútbol\n\n  Música  \n' })
  assert.deepEqual(guardado.hobbies, ['Ajedrez', 'Fútbol', 'Música'])
  const datosJs = datosComoTexto(perfilComoDatos(perfilDesdeBackend(guardado)))
  for (const h of ['Ajedrez', 'Fútbol', 'Música']) assert.match(datosJs, new RegExp(`"${h}"`))
})

test('hobbies: cero hobbies es válido', () => {
  const r = prepararPerfil({ ...borradorDesdePerfil(perfilDesdeBackend(USUARIO)), hobbiesTexto: '\n  \n' })
  assert.deepEqual(r.perfil?.hobbies, [])
})

test('hobbies: no se superan los límites del backend (20 hobbies, 80 caracteres)', () => {
  const base = borradorDesdePerfil(perfilDesdeBackend(USUARIO))
  const muchos = Array.from({ length: MAX_HOBBIES + 1 }, (_, i) => `Hobby ${i}`).join('\n')
  assert.match(prepararPerfil({ ...base, hobbiesTexto: muchos }).errores?.hobbies ?? '', /hasta 20/)
  assert.match(prepararPerfil({ ...base, hobbiesTexto: 'a'.repeat(81) }).errores?.hobbies ?? '', /80 caracteres/)
  const justos = Array.from({ length: MAX_HOBBIES }, (_, i) => `Hobby ${i}`).join('\n')
  assert.equal(prepararPerfil({ ...base, hobbiesTexto: justos }).perfil?.hobbies.length, MAX_HOBBIES)
  assert.deepEqual(textoComoHobbies('uno\r\ndos'), ['uno', 'dos'])
})

// ── Redes de Mi1 / E4 (bug de clase P0) ─────────────────────────────────────────────

const SOLUCION_E4 = [
  'for (const red of datos.redes) {',
  '  if (red.url !== "") {',
  '    mostrar(crearEnlace(red.nombre, red.url))',
  '  }',
  '}',
].join('\n')

async function revisarE4(datos: Record<string, unknown>, codigoNuevo = SOLUCION_E4) {
  // Arranque en frío: sin la solución de E3 guardada en este navegador.
  const codigo = `${componerAndamiaje(4, {})}\n${codigoNuevo}`
  const r = await ejecutarReal(codigo, datos)
  assert.equal(r.ok, true, r.error)
  return { revision: await revisarLocalmente(4, codigo, datos, r.html), html: r.html }
}

test('redes: GitHub y LinkedIn escritos sin https:// se guardan, llegan a datos.js y E4 acepta la solución', async () => {
  const guardado = guardarYRehidratar({
    ...borradorDesdePerfil(perfilDesdeBackend(USUARIO)),
    github: 'github.com/ana',
    linkedin: 'www.linkedin.com/in/ana',
  })
  // Lo que acepta el backend: https público (ver backend/tests/test_profile_links.py).
  assert.equal(guardado.github_url, 'https://github.com/ana')
  assert.equal(guardado.linkedin_url, 'https://www.linkedin.com/in/ana')

  const datos = perfilComoDatos(perfilDesdeBackend(guardado))
  assert.match(datosComoTexto(datos), /https:\/\/github\.com\/ana/)

  const { revision, html } = await revisarE4(datos)
  assert.equal(revision.casosPasados, revision.casosTotales, JSON.stringify(revision.casos))
  assert.deepEqual(enlaces(html).map((e) => e.href), [
    'https://github.com/ana',
    'https://www.linkedin.com/in/ana',
    'mailto:ana@ejemplo.com',
  ])
})

test('redes: con un campo opcional vacío, ese no aparece y E4 acepta', async () => {
  const datos = {
    ...perfilComoDatos(perfilDesdeBackend({ ...USUARIO, github_url: 'https://github.com/ana', linkedin_url: 'https://www.linkedin.com/in/ana' })),
  }
  datos.redes = [...(datos.redes as object[]), { nombre: 'Sitio web', url: '' }]
  const { revision, html } = await revisarE4(datos)
  assert.equal(revision.casosPasados, revision.casosTotales, JSON.stringify(revision.casos))
  assert.equal(enlaces(html).length, 3)
})

test('redes: LinkedIn vacío en el perfil también es válido', async () => {
  const datos = perfilComoDatos(perfilDesdeBackend({ ...USUARIO, github_url: 'https://github.com/ana' }))
  const { revision, html } = await revisarE4(datos)
  assert.equal(revision.casosPasados, revision.casosTotales, JSON.stringify(revision.casos))
  assert.deepEqual(enlaces(html).map((e) => e.texto), ['GitHub', 'Correo'])
})

test('redes: un correo con "%" también cuenta: normalizar dos veces da el mismo enlace', async () => {
  const datos = perfilComoDatos(perfilDesdeBackend({ ...USUARIO, email: 'ana%x@ejemplo.com' }))
  const { revision } = await revisarE4(datos)
  assert.equal(revision.casosPasados, revision.casosTotales, JSON.stringify(revision.casos))
})

test('redes: una dirección sin esquema en datos cuenta como la misma que su enlace normalizado', async () => {
  const datos = { ...perfilComoDatos(perfilDesdeBackend(USUARIO)), redes: [{ nombre: 'Blog', url: 'miblog.com' }] }
  const { revision } = await revisarE4(datos)
  assert.equal(revision.casosPasados, revision.casosTotales, JSON.stringify(revision.casos))
})

test('redes: la revisión no se vuelve permisiva — mostrar también las redes vacías falla', async () => {
  const datos = perfilComoDatos(perfilDesdeBackend({ ...USUARIO, github_url: 'https://github.com/ana' }))
  const { revision } = await revisarE4(datos, 'for (const red of datos.redes) {\n  mostrar(crearEnlace(red.nombre, red.url))\n}')
  assert.ok(revision.casosPasados < revision.casosTotales)
  assert.equal(revision.casos.find((c) => /un enlace por cada red/.test(c.descripcion))?.estado, 'falla')
})

test('redes: el arranque en frío de E4 hereda un subtítulo y lo dice como ejemplo, no como "tu código"', () => {
  const inicial = componerAndamiaje(4, {})
  assert.match(inicial, /crearSubtitulo/)
  assert.match(inicial, /Código de ejemplo del encargo 3/)
  assert.match(componerAndamiaje(4, { 3: 'mostrar(crearTitulo("Ana"))' }), /Tu código del encargo 3/)
})

test('perfil: un error de un campo se dice en ese campo, no como un fallo genérico del guardado', () => {
  const r = prepararPerfil({ ...borradorDesdePerfil(perfilDesdeBackend(USUARIO)), github: 'mi perfil de github', nombre: 'A' })
  assert.equal(r.perfil, null)
  assert.match(r.errores?.github ?? '', /dirección web/)
  assert.match(r.errores?.nombre ?? '', /entre 2 y 80/)
})
