import assert from 'node:assert/strict'
import test from 'node:test'
import { analizarFlujo } from '../src/lib/flujo.ts'

test('un if/else se traduce a SI/SINO/FIN SI y a un rombo de decisión', () => {
  const r = analizarFlujo(
    'const temperatura = 32\nif (temperatura > 30) {\n  mostrar(crearParrafo("Hace calor"))\n} else {\n  mostrar(crearParrafo("Está fresco"))\n}',
  )
  assert.equal(r.ok, true)
  assert.match(r.pseudocodigo, /SI temperatura > 30 ENTONCES/)
  assert.match(r.pseudocodigo, /SINO/)
  assert.match(r.pseudocodigo, /FIN SI/)
  assert.match(r.mermaid, /flowchart TD/)
  assert.match(r.mermaid, /\{"¿temperatura > 30\?"\}/)
  assert.match(r.mermaid, /-->\|Sí\|/)
  assert.match(r.mermaid, /-->\|No\|/)
})

test('un for…of se traduce a PARA CADA/FIN PARA y vuelve sobre la decisión', () => {
  const r = analizarFlujo(
    'const frutas = ["manzana", "pera"]\nfor (const fruta of frutas) {\n  mostrar(crearParrafo(fruta))\n}',
  )
  assert.equal(r.ok, true)
  assert.match(r.pseudocodigo, /PARA CADA fruta EN frutas HACER/)
  assert.match(r.pseudocodigo, /FIN PARA/)
  // El nodo de decisión del bucle recibe una arista "Sí" desde sí mismo hacia el cuerpo y
  // una arista de vuelta del cuerpo hacia el mismo nodo (el ciclo del diagrama).
  const idDecision = r.mermaid.match(/(n\d+)\{"¿Quedan elementos/)?.[1]
  assert.ok(idDecision)
  assert.match(r.mermaid, new RegExp(`--> ${idDecision}\\b`))
})

test('if/else if/else encadenado no anida un SI dentro de otro', () => {
  const r = analizarFlujo(
    'if (a > 10) {\n  mostrar(a)\n} else if (a > 5) {\n  mostrar(a)\n} else {\n  mostrar(a)\n}',
  )
  assert.equal(r.ok, true)
  assert.match(r.pseudocodigo, /SINO SI a > 5 ENTONCES/)
  // Un solo cierre para toda la cadena, no uno por eslabón.
  assert.equal(r.pseudocodigo.match(/FIN SI/g)?.length, 1)
})

test('una llamada de la API curada se traduce a español', () => {
  const r = analizarFlujo('const titulo = crearTitulo("Ana Rivas")\nmostrar(titulo)')
  assert.equal(r.ok, true)
  assert.match(r.pseudocodigo, /Crear un título con el texto "Ana Rivas" y guardarlo como titulo/)
  assert.match(r.pseudocodigo, /Mostrar titulo en la página/)
})

test('un error de sintaxis no revienta: vuelve un mensaje amigable', () => {
  const r = analizarFlujo('if (x > 1 {\n  mostrar(x)\n}')
  assert.equal(r.ok, false)
  assert.ok(r.error && r.error.length > 0)
})

test('código vacío pide escribir algo, en vez de mostrar un diagrama vacío', () => {
  const r = analizarFlujo('   \n')
  assert.equal(r.ok, false)
})
