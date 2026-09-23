import assert from 'node:assert/strict'
import test from 'node:test'
import { analizarFlujo } from '../src/lib/flujo.ts'

// Bug de clase: la pestaña "Pseudocódigo" del diagrama de flujo aplastaba todo en un bloque
// continuo; el estudiante había separado su código por partes con líneas en blanco.

test('las líneas en blanco del estudiante separan las partes del pseudocódigo', () => {
  const codigo = [
    'const titulo = crearTitulo("Ana")',
    'mostrar(titulo)',
    '',
    '// Mis redes',
    'PARA CADA red EN datos.redes HACER',
    '    mostrar(crearParrafo(red.nombre))',
    'FIN PARA',
    '',
    '',
    '',
    'mostrar(crearParrafo("fin"))',
  ].join('\n')
  const r = analizarFlujo(codigo)
  assert.equal(r.ok, true, r.error)
  assert.equal(r.pseudocodigo, [
    'INICIO',
    '    Crear un título con el texto "Ana" y guardarlo como titulo',
    '    Mostrar titulo en la página',
    '',
    '    PARA CADA red EN datos.redes HACER',
    '        Mostrar crearParrafo(red.nombre) en la página',
    '    FIN PARA',
    '',
    '    Mostrar crearParrafo("fin") en la página',
    'FIN',
  ].join('\n'))
})

test('dentro de un bloque también se conserva la separación, y la sangría es coherente', () => {
  const codigo = 'for (const h of datos.hobbies) {\n  mostrar(crearItem(h))\n\n  if (h === "x") {\n    mostrar(crearParrafo(h))\n  }\n}'
  const lineas = analizarFlujo(codigo).pseudocodigo.split('\n')
  assert.deepEqual(lineas, [
    'INICIO',
    '    PARA CADA h EN datos.hobbies HACER',
    '        Mostrar crearItem(h) en la página',
    '',
    '        SI h === "x" ENTONCES',
    '            Mostrar crearParrafo(h) en la página',
    '        FIN SI',
    '    FIN PARA',
    'FIN',
  ])
})

test('sin líneas en blanco no se inventan separaciones', () => {
  const r = analizarFlujo('mostrar(crearTitulo("a"))\nmostrar(crearParrafo("b"))')
  assert.doesNotMatch(r.pseudocodigo, /\n\n/)
})
