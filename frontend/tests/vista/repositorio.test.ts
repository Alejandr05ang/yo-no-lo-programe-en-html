import assert from 'node:assert/strict'
import { test } from 'node:test'
import './entorno.ts'

const { construirRepositorio, nombreDeArchivo, archivosComoZip, prepararRepositorio } = await import('../../src/lib/repositorio.ts')
const { crc32 } = await import('../../src/lib/zip.ts')

const html = '<style>:root { --color-fondo: #123456; }</style><div class="tutorias-grid" style="display: grid; gap: 0"><div style="grid-row: 1 / span 1"><h1>Ana</h1><p>Hola <a href="https://x.dev">mi sitio</a></p></div><div style="grid-row: 1 / span 1"><img src="a.png" alt="foto"></div></div><script>alert(1)</script>'

test('el repositorio separa html, css y js sin funciones del taller', () => {
  const r = construirRepositorio('Mi <portafolio>', html)
  assert.match(r['index.html'], /<title>Mi &lt;portafolio&gt;<\/title>/)
  assert.match(r['index.html'], /<link rel="stylesheet" href="styles.css">/)
  assert.match(r['index.html'], /<script src="script.js"><\/script>/)
  assert.doesNotMatch(r['index.html'], /style=|alert\(1\)|mostrar|agregarA/)
  assert.match(r['index.html'], /target="_blank" rel="noopener noreferrer"/)
  assert.match(r['styles.css'], /--color-fondo: #123456/)
  // Estilos iguales comparten una sola clase.
  assert.equal((r['styles.css'].match(/grid-row: 1 \/ span 1/g) ?? []).length, 1)
  assert.doesNotMatch(r['styles.css'], /@import/)
})

test('nombreDeArchivo limpia el título', () => {
  assert.equal(nombreDeArchivo('Mi Portafolio ¡Genial!'), 'mi-portafolio-genial')
  assert.equal(nombreDeArchivo('???'), 'mi-sitio')
})

test('el zip contiene los tres archivos', async () => {
  const bytes = new Uint8Array(await archivosComoZip(construirRepositorio('Ana', html)).arrayBuffer())
  const texto = new TextDecoder().decode(bytes)
  for (const nombre of ['index.html', 'styles.css', 'script.js']) assert.ok(texto.includes(nombre), nombre)
  assert.equal(new DataView(bytes.buffer).getUint32(0, true), 0x04034b50)
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926)
})

const { extraerLogica } = await import('../../src/lib/traduccionReal.ts')

const carrusel = `const destacados = proyectosDestacados(datos.proyectos)
const destacado = crearCarrusel()
mostrar(destacado)
mostrar(crearTitulo("Hola"))
cadaSegundo(destacado, destacados, proyecto =>
  crearImagen(proyecto.imagenUrl, proyecto.nombre)
)
const boton = crearBoton("Cambiar")
mostrar(boton)
boton.addEventListener('click', () => { cambiarColorTexto(boton, "red"); mostrar(crearParrafo("clic")) })`

test('extraerLogica conserva solo el comportamiento y traduce las funciones del taller', () => {
  const r = extraerLogica([{ nombre: 'portafolio.js', js: carrusel, tipo: 'unico' }])
  assert.ok(r.hayLogica && r.usaDatos)
  assert.doesNotMatch(r.script, /mostrar\(|crearImagen|crearCarrusel|crearBoton|cadaSegundo|proyectosDestacados|crearTitulo|cambiarColorTexto/)
  assert.match(r.script, /document\.getElementById\('destacado'\)/)
  assert.match(r.script, /setInterval\(avanzar, \(typeof datos !== 'undefined' && datos\.segundos > 0 \? datos\.segundos : 1\) \* 1000\)/)
  assert.match(r.script, /boton\.style\.color = "red"/)
  assert.match(r.script, /const parrafo = document\.createElement\('p'\);/)
  assert.match(r.script, /parrafo\.textContent = "clic";/)
  assert.match(r.script, /document\.body\.appendChild\(parrafo\)/)
  assert.doesNotMatch(r.script, /\bcrear(Titulo|Subtitulo|Parrafo|Item|Boton|Salto|Lista|Carrusel|Enlace|Imagen|Seccion)\b|\b(mostrar|agregarA|vaciar|cadaSegundo)\(/)
  assert.doesNotMatch(r.script, /Hola/)
  new Function(r.script) // sintaxis válida
  assert.equal(extraerLogica([{ nombre: 'a', js: 'mostrar(crearTitulo("x"))', tipo: 'unico' }]).hayLogica, false)
})

test('prepararRepositorio: el HTML trae el contenido y los ids; script.js, la lógica', async () => {
  const datos = { proyectos: [{ nombre: 'A', imagenUrl: 'a.png', destacado: true }, { nombre: 'B', imagenUrl: 'b.png', destacado: false }] }
  const r = await prepararRepositorio({ challenge_key: 'e1', draft_code: carrusel, datos, source_fingerprint: 'f' }, 'Ana', '<p>viejo</p>')
  assert.match(r['index.html'], /id="destacado"/)
  assert.match(r['index.html'], /<h1>Hola<\/h1>/)
  assert.match(r['index.html'], /<button[^>]*id="boton"[^>]*>Cambiar<\/button>/)
  assert.match(r['script.js'], /const datos = /)
  assert.match(r['script.js'], /"imagenUrl": "a.png"/)
  assert.doesNotMatch(r['script.js'], /mostrar\(|agregarA\(/)
})

test('prepararRepositorio con cuadrícula (Ju1): secciones con id y lógica por sección', async () => {
  const doc = {
    version: 1,
    estructura: { filas: 1, columnas: 2, celdas: [{ id: 'c1', fila: 0, columna: 0, expandeFilas: 1, expandeColumnas: 1, seccion: 'encabezado' }, { id: 'c2', fila: 0, columna: 1, expandeFilas: 1, expandeColumnas: 1, seccion: 'pie' }] },
    secciones: [
      { nombre: 'encabezado', contenido: 'const b = crearBoton("Hola")\nmostrar(b)\nb.addEventListener("click", () => cambiarColorFondo("tomato"))' },
      { nombre: 'pie', contenido: 'mostrar(crearParrafo("fin"))' },
    ],
    main: 'mostrar(encabezado)\nmostrar(pie)',
  }
  const r = await prepararRepositorio({ challenge_key: 'e13', draft_code: JSON.stringify(doc), datos: {}, source_fingerprint: 'f' }, 'Ana', '<p>x</p>')
  assert.match(r['index.html'], /id="seccion-encabezado"/)
  assert.match(r['index.html'], /<p>fin<\/p>/)
  assert.match(r['script.js'], /document\.getElementById\('seccion-encabezado'\)\.style\.backgroundColor = "tomato"/)
  new Function(r['script.js'])
})

test('generarEncabezado()/generarFooter() salen como <header>/<footer> y la altura de las filas queda en el CSS', () => {
  const html = '<div class="tutorias-grid" style="display: grid; grid-template-rows: auto minmax(auto, 1fr) auto"><div class="rol-encabezado" style="grid-row: 1 / span 1"><h1>Hola</h1></div><div style="grid-row: 2 / span 1"><p>cuerpo</p></div><div class="rol-pie" style="grid-row: 3 / span 1"><p>fin</p></div></div>'
  const r = construirRepositorio('Ana', html)
  assert.match(r['index.html'], /<header class="estilo-\d+">[\s\S]*<h1>Hola<\/h1>[\s\S]*<\/header>/)
  assert.match(r['index.html'], /<footer class="estilo-\d+">[\s\S]*<p>fin<\/p>[\s\S]*<\/footer>/)
  assert.doesNotMatch(r['index.html'], /rol-(encabezado|pie)/)
  assert.match(r['styles.css'], /grid-template-rows: auto minmax\(auto, 1fr\) auto/)
})

test('al repositorio solo llegan las imágenes https, igual que en la vista previa (http y relativas se descartan)', async () => {
  const codigo = 'mostrar(crearImagen("https://fotos.example.com/a.png", "Ana"))\nmostrar(crearImagen("http://fotos.example.com/b.png", "Beto"))\nmostrar(crearImagen("foto.jpg", "Local"))'
  const r = await prepararRepositorio({ challenge_key: 'e1', draft_code: codigo, datos: {}, source_fingerprint: 'f' }, 'Ana', '<p>sin imagenes</p>')
  assert.match(r['index.html'], /<img src="https:\/\/fotos\.example\.com\/a\.png" alt="Ana"/)
  assert.doesNotMatch(r['index.html'], /http:\/\/fotos\.example\.com\/b\.png/)
  assert.doesNotMatch(r['index.html'], /foto\.jpg/)
  assert.match(r['index.html'], /alt="Beto"/, 'la descripción queda para quien no ve la imagen')
  assert.doesNotMatch(r['index.html'], /sin imagenes/)
})
