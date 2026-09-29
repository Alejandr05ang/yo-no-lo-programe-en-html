import assert from 'node:assert/strict'
import test from 'node:test'
import { ventana } from './vista/entorno.ts'
import { ejecutarPreview } from '../src/lib/sandbox.ts'

test('el ejecutor ignora un resultado falsificado enviado desde otra ventana', async () => {
  const resultado = ejecutarPreview('mostrar(crearParrafo("Resultado real"))', {})
  ventana.dispatchEvent(new ventana.MessageEvent('message', {
    source: ventana,
    data: { tipo: 'preview-ok', html: '<p>Resultado falsificado</p>' },
  }))
  const r = await resultado
  assert.equal(r.ok, true)
  assert.match(r.html, /Resultado real/)
  assert.doesNotMatch(r.html, /Resultado falsificado/)
})
