export interface EjemploCurado {
  pseudocodigo: string
  javascript: string
}

export const EJEMPLOS_PEDAGOGICOS: Record<number, EjemploCurado> = {
  // e4: Listas y Redes
  4: {
    pseudocodigo: `definir lista = crearLista()

Para cada red en datos.redes Hacer
  Si red.url tiene una dirección Entonces
    definir enlace = crearEnlace(red.nombre, red.url)
    definir item = crearItem("")
    agregarA(item, enlace)
    agregarA(lista, item)
  FinSi
FinPara

mostrar(lista)`,
    javascript: `const lista = crearLista()

for (const red of datos.redes) {
  if (red.url) {
    const enlace = crearEnlace(red.nombre, red.url)
    const item = crearItem("")
    agregarA(item, enlace)
    agregarA(lista, item)
  }
}

mostrar(lista)`
  },
  
  // e5: Proyectos con for..of -> Ahora es construcción manual para introducir a las listas generadas.
  5: {
    pseudocodigo: `definir lista = crearLista()
mostrar(lista)

agregarA(lista, crearItem("Fútbol"))
agregarA(lista, crearItem("Música"))
agregarA(lista, crearItem("Programar"))`,
    javascript: `const lista = crearLista()
mostrar(lista)

agregarA(lista, crearItem("Fútbol"))
agregarA(lista, crearItem("Música"))
agregarA(lista, crearItem("Programar"))`
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
