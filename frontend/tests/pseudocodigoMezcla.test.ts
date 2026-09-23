import assert from 'node:assert/strict'
import test from 'node:test'
import { aJavaScript } from '../src/lib/pseudocodigoAJS.ts'
import { ejecutarReal } from './helpers/runtimeReal.ts'

// Bug de clase: quien ya sabe JavaScript mezcla SI/PARA CADA/MIENTRAS/FUNCIÓN con
// if/for/while/function, y a veces abre un bloque con una sintaxis y lo cierra con la otra.
// Lo válido tiene que seguir funcionando; lo inválido tiene que decir qué choca y dónde.

const datos = { hobbies: ['Ajedrez', 'Fútbol'], nombre: 'Ana' }

function ok(codigo: string) {
  const r = aJavaScript(codigo)
  assert.equal(r.ok, true, `${JSON.stringify(codigo)} → ${r.error?.mensaje} (línea ${r.error?.linea})`)
  return r.js
}
function falla(codigo: string, linea: number, mensaje: RegExp) {
  const r = aJavaScript(codigo)
  assert.equal(r.ok, false, `${JSON.stringify(codigo)} debería dar error`)
  assert.equal(r.error?.linea, linea, r.error?.mensaje)
  assert.match(r.error?.mensaje ?? '', mensaje)
}

test('pseudocódigo puro sigue funcionando y se ejecuta', async () => {
  const codigo = [
    'PARA CADA h EN datos.hobbies HACER',
    '  SI h = "Ajedrez" ENTONCES',
    '    mostrar(crearParrafo(h))',
    '  SINO',
    '    mostrar(crearItem(h))',
    '  FIN SI',
    'FIN PARA',
  ].join('\n').replace(' = ', ' === ')
  ok(codigo)
  const r = await ejecutarReal(codigo, datos)
  assert.equal(r.ok, true, r.error)
  assert.equal(r.html, '<p>Ajedrez</p><li>Fútbol</li>')
})

test('JavaScript puro se ejecuta tal cual, sin tocarlo', async () => {
  const codigo = 'for (const h of datos.hobbies) {\n  if (h.length > 6) {\n    mostrar(crearParrafo(h))\n  } else {\n    mostrar(crearItem(h))\n  }\n}'
  assert.equal(ok(codigo), codigo)
  const r = await ejecutarReal(codigo, datos)
  assert.equal(r.html, '<p>Ajedrez</p><li>Fútbol</li>')
})

test('JavaScript dentro de un bloque de pseudocódigo es válido', async () => {
  const codigo = 'PARA CADA h EN datos.hobbies HACER\n  if (h === "Fútbol") {\n    mostrar(crearParrafo(h))\n  }\nFIN PARA'
  ok(codigo)
  assert.equal((await ejecutarReal(codigo, datos)).html, '<p>Fútbol</p>')
})

test('pseudocódigo dentro de un bloque de JavaScript es válido', async () => {
  const codigo = 'for (const h of datos.hobbies) {\n  SI h = "Ajedrez" ENTONCES\n    mostrar(crearParrafo(h))\n  FIN SI\n}'.replace(' = ', ' === ')
  ok(codigo)
  assert.equal((await ejecutarReal(codigo, datos)).html, '<p>Ajedrez</p>')
})

test('abrir con SI … ENTONCES y cerrar con } explica que se cierra con FIN SI', () => {
  falla('SI 1 > 0 ENTONCES\n  mostrar(crearParrafo("a"))\n}', 3, /Abriste este bloque con "SI … ENTONCES" en la línea 1; ciérralo con "FIN SI", no con "}"/)
})

test('abrir con for (…) { y cerrar con FIN PARA explica que se cierra con }', () => {
  falla('for (const h of datos.hobbies) {\n  mostrar(crearParrafo(h))\nFIN PARA', 3, /Abriste este bloque con "for \(…\) \{" en la línea 1; ciérralo con "}", no con "FIN PARA"/)
})

test('cerrar un SI mientras hay un for abierto dentro señala el for', () => {
  falla('SI 1 > 0 ENTONCES\n  for (const h of datos.hobbies) {\n    mostrar(crearParrafo(h))\n  FIN SI\n}', 4, /"for \(…\) \{" en la línea 2; ciérralo con "}" antes del "FIN SI"/)
})

test('SINO dentro de un if de JavaScript sugiere "} else {"', () => {
  falla('if (1 > 0) {\n  mostrar(crearParrafo("a"))\nSINO\n  mostrar(crearParrafo("b"))\n}', 3, /"if \(…\) \{" en la línea 1: para la otra rama escribe "} else \{"/)
})

test('"} else {" dentro de un SI de pseudocódigo sugiere SINO', () => {
  falla('SI 1 > 0 ENTONCES\n  mostrar(crearParrafo("a"))\n} else {\n  mostrar(crearParrafo("b"))\nFIN SI', 3, /para la otra rama escribe "SINO"/)
})

test('una línea que empieza como pseudocódigo y termina como JS se señala como mezcla', () => {
  falla('SI 1 > 0 ENTONCES {\n  mostrar(crearParrafo("a"))\n}', 1, /mezcla pseudocódigo y JavaScript/)
  falla('PARA CADA h EN datos.hobbies {\n}', 1, /PARA CADA elemento EN lista HACER/)
  falla('MIENTRAS 1 > 2 {\n}', 1, /MIENTRAS condición HACER/)
  falla('función saludar(x) {\n}', 1, /FUNCIÓN nombre\(entrada\)/)
  falla('SI 1 > 0 ENTONCES\n  mostrar(crearParrafo("a"))\nFIN SI }', 3, /"FIN …" va solo en su línea/)
})

test('anidación de SI, PARA CADA, MIENTRAS y FUNCIÓN, con y sin mezcla', async () => {
  const codigo = [
    'FUNCIÓN mostrarTodos(lista)',
    '  PARA CADA x EN lista HACER',
    '    let veces = 0',
    '    MIENTRAS veces < 1 HACER',
    '      SI x !== "" ENTONCES',
    '        if (x.length > 0) {',
    '          mostrar(crearItem(x))',
    '        }',
    '      FIN SI',
    '      veces = veces + 1',
    '    FIN MIENTRAS',
    '  FIN PARA',
    'FIN FUNCIÓN',
    'mostrarTodos(datos.hobbies)',
  ].join('\n')
  ok(codigo)
  assert.equal((await ejecutarReal(codigo, datos)).html, '<li>Ajedrez</li><li>Fútbol</li>')
  falla(codigo.replace('    FIN MIENTRAS', '    FIN PARA'), 11, /Aquí esperaba "FIN MIENTRAS"/)
  falla(codigo.replace('        }', '        FIN SI'), 8, /"if \(…\) \{" en la línea 6; ciérralo con "}"/)
})

test('las llaves dentro de textos, plantillas y comentarios no cuentan como bloques', () => {
  ok('SI 1 > 0 ENTONCES\n  mostrar(crearParrafo("{ no es un bloque }"))\n  // } tampoco esto\n  const t = `${datos.nombre} {`\nFIN SI')
  ok('const o = {\n  a: 1,\n}\nPARA CADA h EN datos.hobbies HACER\n  mostrar(crearItem(`${h}`))\nFIN PARA')
})

test('falta cerrar un bloque: se señala dónde se abrió', () => {
  falla('SI 1 > 0 ENTONCES\n  mostrar(crearParrafo("a"))', 1, /Te falta "FIN SI"/)
  falla('PARA CADA h EN datos.hobbies HACER\n  if (h) {\n    mostrar(crearItem(h))\nFIN PARA', 4, /línea 2; ciérralo con "}" antes del "FIN PARA"/)
})

// Revisión adversarial: JavaScript válido que una primera versión rechazaba como "mezcla".
test('JS válido nunca se toma por pseudocódigo: comentarios, textos, claves y variables', () => {
  const validos = [
    '/*\nPara cada red de la lista, muestro un enlace\n*/\nmostrar(crearTitulo("a"))',
    '/*\nSi no hay redes, entonces no muestro nada\n*/',
    'mostrar(crearParrafo(`\nSi te gusta programar, entonces sigue.\n`))',
    'SI 1 > 0 ENTONCES\n  mostrar(crearParrafo(`\nPara cada día un reto.\n`))\nFIN SI',
    'const r = {\n  si: "yes",\n  sino: "otherwise",\n}',
    'const r = {\n  si: {\n    x: 1,\n  },\n}',
    'const si = [1, 2]\nsi.forEach((x) => {\n  mostrar(crearParrafo(String(x)))\n})',
    'const sino = [1]\nsino.forEach(mostrar)',
    'let mientras = [1]\nmientras.map((x) => {\n  return x\n})',
    'let finPara = 0\nfinPara = 1',
    'function funcion(x) { return x }\nfuncion (1)',
  ]
  for (const codigo of validos) ok(codigo)
})

test('un salto de línea Unicode pegado en un texto no descoloca las líneas', () => {
  ok('const s = "a\u2028b"\nSI 1 > 0 ENTONCES\n  mostrar(crearParrafo(s))\nFIN SI')
  ok('const s = "a\u2029b"\nfor (const h of datos.hobbies) {\n  mostrar(crearParrafo(s))\n}')
})

test('un comentario al final de una línea de pseudocódigo está permitido', async () => {
  const codigo = 'SI 1 > 0 ENTONCES // reviso\n  mostrar(crearParrafo("a"))\nFIN SI // listo'
  assert.equal(ok(codigo), 'if (1 > 0) { // reviso\n  mostrar(crearParrafo("a"))\n} // listo')
  assert.equal((await ejecutarReal(codigo, datos)).html, '<p>a</p>')
})

test('falta ENTONCES o HACER: se señala la línea donde falta', () => {
  falla('SI 1 > 0\n  mostrar(crearParrafo("a"))\nFIN SI', 1, /Te falta "ENTONCES" al final de esta línea/)
  falla('PARA CADA h EN datos.hobbies\n  mostrar(crearItem(h))\nFIN PARA', 1, /Te falta "HACER" al final de esta línea/)
  falla('MIENTRAS 1 < 0\nFIN MIENTRAS', 1, /Te falta "HACER"/)
})

test('"} else if" dentro de un SI de pseudocódigo sugiere SINO SI', () => {
  falla('SI 1 > 0 ENTONCES\n  mostrar(crearParrafo("a"))\n} else if (2 > 1) {\n  mostrar(crearParrafo("b"))\nFIN SI', 3, /escribe "SINO SI condición ENTONCES"/)
})

test('"</script>" en los datos o en el código no rompe la vista previa', async () => {
  const r = await ejecutarReal('mostrar(crearTitulo(datos.nombre))\nmostrar(crearParrafo("</script> no corta nada"))', { nombre: 'Ana</script>' })
  assert.equal(r.ok, true, r.error)
  assert.match(r.html, /<h1>Ana&lt;\/script&gt;<\/h1>/)
})
