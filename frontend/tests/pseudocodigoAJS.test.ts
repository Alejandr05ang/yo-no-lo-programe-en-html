import assert from 'node:assert/strict'
import test from 'node:test'
import { aJavaScript } from '../src/lib/pseudocodigoAJS.ts'

test('SI ENTONCES / SINO / FIN SI se traduce a if/else real', () => {
  const r = aJavaScript(
    'SI temperatura > 30 ENTONCES\n    mostrar(crearParrafo("Hace calor"))\nSINO\n    mostrar(crearParrafo("Está fresco"))\nFIN SI',
  )
  assert.equal(r.ok, true)
  assert.equal(
    r.js,
    'if (temperatura > 30) {\n    mostrar(crearParrafo("Hace calor"))\n} else {\n    mostrar(crearParrafo("Está fresco"))\n}',
  )
})

test('SI sin SINO también traduce bien', () => {
  const r = aJavaScript('SI hobbies.length === 0 ENTONCES\n    mostrar(crearParrafo("vacío"))\nFIN SI')
  assert.equal(r.ok, true)
  assert.equal(r.js, 'if (hobbies.length === 0) {\n    mostrar(crearParrafo("vacío"))\n}')
})

test('SINO SI encadena como else if, un solo FIN SI cierra toda la cadena', () => {
  const r = aJavaScript(
    'SI nota >= 90 ENTONCES\n    mostrar(a)\nSINO SI nota >= 70 ENTONCES\n    mostrar(b)\nSINO\n    mostrar(c)\nFIN SI',
  )
  assert.equal(r.ok, true)
  assert.equal(
    r.js,
    'if (nota >= 90) {\n    mostrar(a)\n} else if (nota >= 70) {\n    mostrar(b)\n} else {\n    mostrar(c)\n}',
  )
})

test('PARA CADA … EN … HACER / FIN PARA se traduce a for…of real', () => {
  const r = aJavaScript('PARA CADA hobby EN datos.hobbies HACER\n    agregarA(lista, crearItem(hobby))\nFIN PARA')
  assert.equal(r.ok, true)
  assert.equal(r.js, 'for (const hobby of datos.hobbies) {\n    agregarA(lista, crearItem(hobby))\n}')
})

test('MIENTRAS … HACER / FIN MIENTRAS se traduce a while real', () => {
  const r = aJavaScript('MIENTRAS intentos < 3 HACER\n    intentos = intentos + 1\nFIN MIENTRAS')
  assert.equal(r.ok, true)
  assert.equal(r.js, 'while (intentos < 3) {\n    intentos = intentos + 1\n}')
})

test('FUNCIÓN … / FIN FUNCIÓN se traduce a function real, con o sin tilde', () => {
  const r1 = aJavaScript('FUNCIÓN saludar(quien)\n    mostrar(crearParrafo("Hola, " + quien))\nFIN FUNCIÓN')
  const r2 = aJavaScript('FUNCION saludar(quien)\n    mostrar(crearParrafo("Hola, " + quien))\nFIN FUNCION')
  assert.equal(r1.ok, true)
  assert.equal(r1.js, r2.js)
  assert.equal(r1.js, 'function saludar(quien) {\n    mostrar(crearParrafo("Hola, " + quien))\n}')
})

test('estructuras anidadas (SI dentro de PARA CADA) traducen bien', () => {
  const r = aJavaScript(
    'PARA CADA red EN datos.redes HACER\n    SI red.url ENTONCES\n        mostrar(crearEnlace(red.nombre, red.url))\n    FIN SI\nFIN PARA',
  )
  assert.equal(r.ok, true)
  assert.equal(
    r.js,
    'for (const red of datos.redes) {\n    if (red.url) {\n        mostrar(crearEnlace(red.nombre, red.url))\n    }\n}',
  )
})

test('cada línea de entrada produce exactamente una línea de salida (los números de línea de un error no se corren)', () => {
  const entrada = 'SI a ENTONCES\nmostrar(1)\nSINO\nmostrar(2)\nFIN SI'
  const r = aJavaScript(entrada)
  assert.equal(r.ok, true)
  assert.equal(r.js.split('\n').length, entrada.split('\n').length)
})

test('código sin ninguna estructura pasa intacto (sigue siendo JS real, como antes)', () => {
  const codigo = 'const titulo = crearTitulo("Ana Rivas")\nmostrar(titulo)'
  const r = aJavaScript(codigo)
  assert.equal(r.ok, true)
  assert.equal(r.js, codigo)
})

test('un FIN SI sin SI da un error amigable, con el número de línea', () => {
  const r = aJavaScript('mostrar(1)\nFIN SI')
  assert.equal(r.ok, false)
  assert.equal(r.error?.linea, 2)
  assert.match(r.error!.mensaje, /de más/)
})

test('un SI sin FIN SI da un error que señala dónde se abrió', () => {
  const r = aJavaScript('SI a ENTONCES\nmostrar(1)')
  assert.equal(r.ok, false)
  assert.equal(r.error?.linea, 1)
  assert.match(r.error!.mensaje, /FIN SI/)
})

test('cerrar con el bloque equivocado (FIN PARA para un SI) da un error claro', () => {
  const r = aJavaScript('SI a ENTONCES\nmostrar(1)\nFIN PARA')
  assert.equal(r.ok, false)
  assert.equal(r.error?.linea, 3)
  assert.match(r.error!.mensaje, /FIN SI/)
})
