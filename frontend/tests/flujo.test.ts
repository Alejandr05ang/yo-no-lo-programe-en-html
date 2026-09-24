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
  // Mermaid lee la etiqueta como HTML: "<" y ">" van con sus códigos (#lt; #gt;).
  assert.match(r.mermaid, /\{"¿temperatura #gt; 30\?"\}/)
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

// El código real de un estudiante llega en el pseudocódigo que escribe en el editor
// (SI/PARA CADA/…, sin "()" ni "{}" — lib/pseudocodigoAJS.ts), no en JS con llaves: acá se
// confirma que el diagrama funciona igual sobre ESE código, no solo sobre JS de juguete.
test('el diagrama funciona sobre el pseudocódigo real que el estudiante escribe (sin llaves)', () => {
  const r = analizarFlujo(
    'const temperatura = 32\nSI temperatura > 30 ENTONCES\n    mostrar(crearParrafo("Hace calor"))\nSINO\n    mostrar(crearParrafo("Está fresco"))\nFIN SI',
  )
  assert.equal(r.ok, true)
  assert.match(r.pseudocodigo, /SI temperatura > 30 ENTONCES/)
  assert.match(r.mermaid, /-->\|Sí\|/)
})

test('un pseudocódigo mal cerrado (falta FIN SI) da el mismo tipo de error amigable', () => {
  const r = analizarFlujo('SI a > 1 ENTONCES\n  mostrar(a)')
  assert.equal(r.ok, false)
  assert.match(r.error ?? '', /FIN SI/)
})

// Auditoría final (revisión adversarial de la vista de flujo).

test('una condición con "<" pegado a un nombre no se corta en el rombo del diagrama', () => {
  const r = analizarFlujo('let contador = 0\nconst limite = 3\nSI contador<limite ENTONCES\n  mostrar(crearParrafo("sí"))\nFIN SI')
  assert.equal(r.ok, true, r.error)
  assert.match(r.mermaid, /\{"¿contador#lt;limite\?"\}/)
  for (const [, etiqueta] of r.mermaid.matchAll(/"([^"\n]*)"/g)) {
    assert.doesNotMatch(etiqueta, /[<>]/, `etiqueta con "<" o ">" crudos: ${etiqueta}`)
  }
  assert.match(r.pseudocodigo, /SI contador<limite ENTONCES/)
})

test('crearEnlace: la variable va sin comillas y el texto con las suyas, sin duplicarlas', () => {
  const r = analizarFlujo('PARA CADA red EN datos.redes HACER\n  const enlace = crearEnlace(red.nombre, red.url)\nFIN PARA\nconst wiki = crearEnlace("Wikipedia", "https://wikipedia.org")\nconst lista = crearLista()')
  assert.equal(r.ok, true, r.error)
  assert.match(r.pseudocodigo, /Crear un enlace red\.nombre hacia red\.url y guardarlo como enlace/)
  assert.match(r.pseudocodigo, /Crear un enlace "Wikipedia" hacia "https:\/\/wikipedia\.org" y guardarlo como wiki/)
  assert.match(r.pseudocodigo, /Crear una lista vacía y guardarla como lista/)
})

test('el error de la vista de flujo dice en qué línea está', () => {
  const r = analizarFlujo('mostrar(crearTitulo("a"))\nSI 1 > 0\n  mostrar(crearParrafo("b"))\nFIN SI')
  assert.equal(r.ok, false)
  assert.match(r.error ?? '', /\(línea 2\)$/)
})

test('una sentencia partida en varias líneas se lee en una, sin romper la sangría ni duplicar blancos', () => {
  const codigo = [
    'PARA CADA h EN datos.hobbies HACER',
    '  agregarA(lista, crearItem(',
    '    h',
    '  ))',
    'FIN PARA',
    'const colores = [',
    '  "rojo",',
    '',
    '',
    '  "azul",',
    ']',
    'let x = 0, y = 10',
  ].join('\n')
  const r = analizarFlujo(codigo)
  assert.equal(r.ok, true, r.error)
  assert.deepEqual(r.pseudocodigo.split('\n'), [
    'INICIO',
    '    PARA CADA h EN datos.hobbies HACER',
    '        Agregar crearItem( h ) dentro de lista',
    '    FIN PARA',
    '    Guardar [ "rojo", "azul", ] en colores',
    '    Guardar 0 en x; Guardar 10 en y',
    'FIN',
  ])
})

test('el pseudocódigo no recorta lo que se copia tal cual (solo el diagrama lo acorta)', () => {
  const largo = 'titulo.textContent = "Bienvenidos a mi portafolio personal, donde cuento lo que aprendí este verano"'
  const r = analizarFlujo(`const titulo = crearTitulo("a")\n${largo}`)
  assert.ok(r.pseudocodigo.includes(largo))
  assert.ok(r.mermaid.includes('…'))
})

test('un programa larguísimo o anidadísimo no tumba la pantalla: vuelve un error amable', () => {
  const cadena = ['if (a === 0) {', '  mostrar(a)'].concat(Array.from({ length: 3000 }, (_, i) => `} else if (a === ${i + 1}) {\n  mostrar(a)`), ['}']).join('\n')
  let r: ReturnType<typeof analizarFlujo> | undefined
  assert.doesNotThrow(() => { r = analizarFlujo(cadena) })
  assert.ok(r)
})
