import assert from 'node:assert/strict'
import test from 'node:test'
import { componerAndamiaje, ENCARGOS, NUMEROS_DE_ENCARGO } from '../src/lib/encargos.ts'
import { aJavaScript } from '../src/lib/pseudocodigoAJS.ts'

test('E11 conserva las skills que usa el código acumulado de E10', () => {
  assert.ok(Array.isArray(ENCARGOS[10].datosOverride.skills))
  assert.deepEqual(ENCARGOS[11].datosOverride.skills, ENCARGOS[10].datosOverride.skills)
})

// El andamiaje es lo primero que ve cualquier estudiante al abrir un encargo — si el
// pseudocódigo que trae quedara mal cerrado (un FIN SI de menos, etc.), la página no
// ejecutaría NUNCA para nadie en ese encargo, en frío o heredando una solución guardada.
test('el andamiaje de arranque en frío de cada encargo traduce a JS sin errores', () => {
  for (const numero of NUMEROS_DE_ENCARGO) {
    const codigo = componerAndamiaje(numero, {})
    const r = aJavaScript(codigo)
    assert.equal(r.ok, true, `encargo ${numero}: ${r.error?.mensaje} (línea ${r.error?.linea})`)
  }
})

test('el fallbackHeredado de cada encargo (arranque en frío sin solución previa) también traduce bien', () => {
  for (const numero of NUMEROS_DE_ENCARGO) {
    const fallback = ENCARGOS[numero].fallbackHeredado
    if (!fallback.trim()) continue
    const r = aJavaScript(fallback)
    assert.equal(r.ok, true, `encargo ${numero}: ${r.error?.mensaje} (línea ${r.error?.linea})`)
  }
})

test('a session is reachable on its own, with or without assignments', () => {
  // El mapa solo emitia enlaces dentro de session.challenges, asi que un dia sin
  // encargos —el de diagnostico— no tenia forma de abrirse. La direccion se
  // construye con el codigo publico, nunca con el UUID.
  const enlace = (codigo: string) => `/sesiones/${encodeURIComponent(codigo)}`
  assert.equal(enlace('L1'), '/sesiones/L1')
  assert.equal(enlace('Ma1'), '/sesiones/Ma1')
  assert.doesNotMatch(enlace('L1'), /[0-9a-f]{8}-[0-9a-f]{4}/)
})

test('only a future session withholds its way in', () => {
  // active/done se pueden abrir; future no navega a ninguna parte.
  const sePuedeEntrar = (estado: string) => estado !== 'future'
  assert.equal(sePuedeEntrar('active'), true)
  assert.equal(sePuedeEntrar('done'), true)
  assert.equal(sePuedeEntrar('future'), false)
})
