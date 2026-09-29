import assert from 'node:assert/strict'
import { test } from 'node:test'
import './entorno.ts'
import * as sandbox from '../../src/lib/sandbox.ts'
import { crearDocumentoJu1Inicial, serializarDocumentoJu1 } from '../../src/lib/estructuraDePagina.ts'

test('la revisión observa cuatro estados del runtime aislado sin acumular imágenes', async () => {
  assert.equal(typeof sandbox.ejecutarPreviewEvolucion, 'function')
  const source = 'const c=crearCarrusel();mostrar(c);cadaSegundo(c, datos.proyectos, p=>crearImagen(p.imagen,p.titulo))'
  const data = { proyectos: [{ imagen: 'https://example.org/a.png', titulo: 'A' }, { imagen: 'https://example.org/b.png', titulo: 'B' }] }
  for (const code of [source, serializarDocumentoJu1({ ...crearDocumentoJu1Inicial(), main: source })]) {
    const frames = await sandbox.ejecutarPreviewEvolucion(code, data, 3)
    assert.equal(frames.length, 4)
    const titles = frames.map(r => {
      assert.equal(r.ok, true)
      const doc = new DOMParser().parseFromString(r.html, 'text/html')
      assert.equal(doc.querySelectorAll('[data-carrusel] img').length, 1)
      return doc.querySelector('img')!.getAttribute('alt')
    })
    assert.deepEqual(titles, ['A', 'B', 'A', 'B'])
    assert.equal(document.querySelectorAll('iframe[style*="display: none"]').length, 0)
  }
})

test('la revisión temporal informa error dentro del callback y retira su iframe', async () => {
  assert.equal(typeof sandbox.ejecutarPreviewEvolucion, 'function')
  const frames = await sandbox.ejecutarPreviewEvolucion('let i=0; cadaSegundo(()=>{ if(i++) throw new Error("callback falló"); mostrar(crearParrafo("inicio")) })', {}, 2)
  assert.equal(frames.at(-1)?.ok, false)
  assert.match(frames.at(-1)?.error?.mensaje ?? '', /callback falló/)
  assert.equal(document.querySelectorAll('iframe[style*="display: none"]').length, 0)
})
