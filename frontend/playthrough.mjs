// Recorrido acumulativo con el mismo iframe/runtime y corrector que usa la pantalla.
// El entorno sustituye solo el alojamiento del iframe que jsdom no implementa.
import './tests/vista/entorno.ts'
import assert from 'node:assert/strict'
import { ENCARGOS, NUMEROS_DE_ENCARGO } from './src/lib/encargos.ts'
import { revisarLocalmente } from './src/lib/revisionLocal.ts'
import { PERFIL_DEFECTO, perfilComoDatos } from './src/lib/perfil.ts'
import { crearDocumentoJu1Inicial, crearSeccion, serializarDocumentoJu1 } from './src/lib/estructuraDePagina.ts'
import { ejecutarPreviewJu1 } from './src/lib/sandbox.ts'

const datosPerfil = {
  ...perfilComoDatos(PERFIL_DEFECTO),
  hobbies: ['Ajedrez', 'Música', 'Ciclismo'],
  redes: [{ nombre: 'Wikipedia', url: 'wikipedia.com' }, { nombre: 'Opcional', url: '' }],
}
const nuevos = {
  1: 'mostrar(crearTitulo("Mi portafolio"))',
  2: 'mostrar(crearParrafo("Aprendo programación")); mostrar(crearParrafo("Este es mi proyecto"))',
  3: 'mostrar(crearSubtitulo("Sobre mí"))',
  4: 'for(const red of datos.redes) if(red.url) mostrar(crearEnlace(red.nombre,red.url))',
  5: 'const listaHobbies=crearLista(); mostrar(listaHobbies); agregarA(listaHobbies,crearItem("Uno")); agregarA(listaHobbies,crearItem("Dos")); agregarA(listaHobbies,crearItem("Tres"))',
  6: 'vaciar(listaHobbies); for(const hobby of datos.hobbies) agregarA(listaHobbies,crearItem(hobby))',
  7: 'if(datos.sobreMi.trim()) mostrar(crearParrafo(datos.sobreMi)); else mostrar(crearParrafo("En construcción"))',
  8: 'const carrusel=crearCarrusel(); mostrar(carrusel); cadaSegundo(carrusel,proyectosDestacados(datos.proyectos),p=>crearImagen(p.imagenUrl,p.nombre))',
  9: 'for(const p of datos.proyectos) if(p.terminado === true) mostrar(crearParrafo(p.nombre))',
  10: 'for(const grupo of datos.skills){ mostrar(crearSubtitulo(grupo.categoria)); const lista=crearLista();mostrar(lista); for(const item of grupo.items) agregarA(lista,crearItem(item)); }',
  11: String.raw`for(const p of datos.proyectos){
    const nombre=p.nombre || 'Proyecto sin nombre';
    if(p.tipo === 'demo' && /^https?:\/\//.test(p.url || '')) mostrar(crearEnlace(nombre,p.url));
    else mostrar(crearParrafo(nombre));
  }`,
}

let codigo = ''
let documento
let total = 0
for (const numero of NUMEROS_DE_ENCARGO) {
  const datos = { ...datosPerfil, ...ENCARGOS[numero].datosOverride }
  if (numero === 12) {
    documento = crearDocumentoJu1Inicial()
    const r = crearSeccion(documento, 0, 0, 0, 0, 'Presentación')
    assert.ok(r.ok)
    documento = r.valor
    documento.secciones[0].contenido = codigo
    documento.main = `mostrar(${documento.secciones[0].nombre})`
  } else if (numero === 13) {
    documento.main += '\ncambiarColorFondo("#f2ece0")'
  } else if (documento) {
    documento.main += `\n${nuevos[numero]}`
  } else {
    codigo += `\n${nuevos[numero]}`
  }

  if (numero === 12 || numero === 13) {
    const r = await ejecutarPreviewJu1(documento, datos)
    assert.ok(r.ok, r.error?.mensaje)
    assert.match(r.html, /Mi portafolio/)
    if (numero === 13) assert.equal(new DOMParser().parseFromString(r.html, 'text/html').querySelector('div')?.style.backgroundColor, 'rgb(242, 236, 224)')
    console.log(`PASS E${numero}: documento visual conserva el contenido${numero === 13 ? ' y el estilo' : ''}`)
  } else {
    const fuente = documento ? serializarDocumentoJu1(documento) : codigo
    const r = await revisarLocalmente(numero, fuente, datos)
    assert.ok(r.casosTotales > 0)
    assert.equal(r.casosPasados, r.casosTotales, `E${numero}: ${JSON.stringify(r)}`)
    console.log(`PASS E${numero}: ${r.casosPasados}/${r.casosTotales}, runtime real y variantes`)
  }
  total++
}
console.log(`PASS: ${total} encargos en orden curricular, E12/E13 conservados hasta E11`)
