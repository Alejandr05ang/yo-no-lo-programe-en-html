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

// Auditoría final: las frases de arriba no tienen la forma COMPLETA de una línea de
// pseudocódigo ("… EN lista HACER"), así que no probaban el caso real: un alumno que comenta
// con /* … */ una parte de su pseudocódigo, o que escribe una línea así dentro de un texto.
test('una línea de pseudocódigo completa dentro de un comentario o un texto no se traduce', async () => {
  const js = [
    '/*\nPARA CADA h EN datos.hobbies HACER\n*/\nmostrar(crearTitulo("a"))',
    '/*\n  FIN SI\n*/\nmostrar(crearTitulo("a"))',
    '/*\nSINO\n*/',
    'const t = `\nSI 1 > 0 ENTONCES\n`\nmostrar(crearParrafo(t))',
    'const t = `hola\nFIN PARA\n`',
    'const t = "a\\\nSINO"',
  ]
  for (const codigo of js) assert.equal(ok(codigo), codigo)

  // Y mezclado con pseudocódigo de verdad: lo comentado queda comentado, lo demás se traduce.
  const comentado = [
    '/*',
    'PARA CADA h EN datos.hobbies HACER',
    '  mostrar(crearItem(h))',
    '*/',
    'SI datos.hobbies.length > 0 ENTONCES',
    '  mostrar(crearParrafo(`Mis hobbies:',
    'SINO',
    'FIN SI`))',
    '/*',
    'SINO',
    '*/',
    'FIN SI',
  ].join('\n')
  const traducido = ok(comentado).split('\n')
  assert.equal(traducido.length, 12)
  assert.deepEqual(traducido.slice(0, 4), ['/*', 'PARA CADA h EN datos.hobbies HACER', '  mostrar(crearItem(h))', '*/'])
  assert.equal(traducido[4], 'if (datos.hobbies.length > 0) {')
  assert.deepEqual(traducido.slice(6, 11), ['SINO', 'FIN SI`))', '/*', 'SINO', '*/'])
  assert.equal(traducido[11], '}')
  const r = await ejecutarReal(comentado, datos)
  assert.equal(r.ok, true, r.error)
  assert.equal(r.html, '<p>Mis hobbies:\nSINO\nFIN SI</p>')
})

// Auditoría final: con un error de sintaxis en OTRA línea (aquí, falta un ")"), una variable o
// clave llamada si/sino/mientras se acusaba de "mezcla" y el mensaje mandaba a la línea
// equivocada. Ese error lo explica el motor al ejecutar, con su línea.
test('un nombre si/sino/mientras no se toma por mezcla cuando el error está en otra línea', () => {
  const faltaParentesis = '\nmostrar(crearParrafo("a")'
  for (const codigo of [
    'const o = {\n  sino: 1,\n}',
    'const o = {\n  si: {\n    a: 1,\n  },\n}',
    'const o = {\n  mientras: {\n  },\n}',
    'const sino = []\nsino.push(1)',
    'let sino = 1\nsino = 2',
    'let si = 1\nsi + 1',
    'let finSi = 0\nfinSi = 1',
  ]) {
    const r = aJavaScript(codigo + faltaParentesis)
    assert.equal(r.ok, true, `${JSON.stringify(codigo)} → ${r.error?.mensaje} (línea ${r.error?.linea})`)
  }
  // Las mezclas de verdad se siguen señalando.
  falla('SINO {\nmostrar(crearParrafo("a")', 1, /"SINO" va solo en su línea/)
  falla('SI (1 > 0) {\n  mostrar(crearParrafo("a"))\n}', 1, /mezcla pseudocódigo y JavaScript/)
  falla('MIENTRAS 1 > 2 {\n}', 1, /MIENTRAS condición HACER/)
})

test('los nombres con tilde o ñ valen en PARA CADA y FUNCIÓN, igual que en JavaScript', async () => {
  const codigo = [
    'FUNCIÓN mostrarAño(año)',
    '  mostrar(crearParrafo(año))',
    'FIN FUNCIÓN',
    'PARA CADA opción EN datos.hobbies HACER',
    '  mostrarAño(opción)',
    'FIN PARA',
  ].join('\n')
  assert.equal(ok(codigo), 'function mostrarAño(año) {\n  mostrar(crearParrafo(año))\n}\nfor (const opción of datos.hobbies) {\n  mostrarAño(opción)\n}')
  assert.equal((await ejecutarReal(codigo, datos)).html, '<p>Ajedrez</p><p>Fútbol</p>')
})

test('saltos de línea de Windows (\\r\\n): las líneas con comentario final se reconocen igual', () => {
  const codigo = 'PARA CADA h EN datos.hobbies HACER // cada uno\r\n  mostrar(crearItem(h))\r\nFIN PARA // listo\r\n'
  assert.equal(ok(codigo), 'for (const h of datos.hobbies) { // cada uno\r\n  mostrar(crearItem(h))\r\n} // listo\r\n')
  falla('SI 1 > 0 ENTONCES\r\n  mostrar(crearParrafo("a"))\r\n}\r\n', 3, /ciérralo con "FIN SI", no con "}"/)
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
