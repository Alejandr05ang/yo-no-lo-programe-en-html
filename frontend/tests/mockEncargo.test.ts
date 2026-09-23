import assert from 'node:assert/strict'
import test from 'node:test'
import { datosComoTexto, pareceContenidoDeDatos } from '../src/lib/mockEncargo.ts'

test('el texto de datos.js siempre se detecta como contenido de datos', () => {
  const texto = datosComoTexto({ nombre: 'Ana' })
  assert.equal(pareceContenidoDeDatos(texto), true)
})

test('el código normal de un estudiante no se confunde con datos.js', () => {
  const codigo = 'const titulo = crearTitulo("Ana Rivas")\nmostrar(titulo)'
  assert.equal(pareceContenidoDeDatos(codigo), false)
})

test('espacio en blanco inicial no engaña la detección', () => {
  const texto = '\n\n  ' + datosComoTexto({ nombre: 'Ana' })
  assert.equal(pareceContenidoDeDatos(texto), true)
})
