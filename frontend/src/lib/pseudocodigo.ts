export interface EjemploCurado {
  pseudocodigo: string
  javascript: string
}

export const EJEMPLOS_PEDAGOGICOS: Record<number, EjemploCurado> = {
  // e4: Listas y Redes
  4: {
    pseudocodigo: `definir lista = crearLista()

Para cada red en redes Hacer
  Si red.url tiene una dirección Entonces
    definir enlace = crearEnlace(red.nombre, red.url)
    definir item = crearItem("")
    agregarA(item, enlace)
    agregarA(lista, item)
  FinSi
FinPara

mostrar(lista)`,
    javascript: `const lista = crearLista()

for (const red of redes) {
  if (red.url) {
    const enlace = crearEnlace(red.nombre, red.url)
    const item = crearItem("")
    agregarA(item, enlace)
    agregarA(lista, item)
  }
}

mostrar(lista)`
  },
  
  // e5: Proyectos con for..of
  5: {
    pseudocodigo: `definir lista = crearLista()

Para cada proyecto en datos.proyectos Hacer
  agregarA(lista, crearItem(proyecto.nombre))
FinPara

mostrar(lista)`,
    javascript: `const lista = crearLista()

for (const proyecto of datos.proyectos) {
  agregarA(lista, crearItem(proyecto.nombre))
}

mostrar(lista)`
  },
  
  // e6: Hobbies
  6: {
    pseudocodigo: `definir lista = crearLista()

Para cada hobby en datos.hobbies Hacer
  agregarA(lista, crearItem(hobby))
FinPara

mostrar(lista)`,
    javascript: `const lista = crearLista()

for (const hobby of datos.hobbies) {
  agregarA(lista, crearItem(hobby))
}

mostrar(lista)`
  },
  
  // e8: Carrusel (Imágenes)
  8: {
    pseudocodigo: `definir carrusel = crearCarrusel()

Para cada proyecto en proyectosDestacados(datos.proyectos) Hacer
  agregarA(carrusel, crearImagen(proyecto.imagenUrl, proyecto.nombre))
FinPara

mostrar(carrusel)`,
    javascript: `const carrusel = crearCarrusel()

for (const proyecto of proyectosDestacados(datos.proyectos)) {
  agregarA(carrusel, crearImagen(proyecto.imagenUrl, proyecto.nombre))
}

mostrar(carrusel)`
  }
}
