export interface EjemploCurado {
  pseudocodigo: string
  javascript: string
}

export const EJEMPLOS_PEDAGOGICOS: Record<number, EjemploCurado> = {
  // e4: redes — todavía no se enseñó crearLista()/crearItem() (eso arranca en e5), así que
  // el ejemplo no los usa: mostrar(crearEnlace(...)) directo, uno por red, como pide la pista
  // real del encargo (lib/encargos.ts).
  4: {
    pseudocodigo: `Para cada red en datos.redes Hacer
  Si red.url tiene una dirección Entonces
    mostrar el enlace de red.nombre hacia red.url
  FinSi
FinPara`,
    javascript: `for (const red of datos.redes) {
  if (red.url) {
    mostrar(crearEnlace(red.nombre, red.url))
  }
}`
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
  
  // e8: carrusel — la pista real pide cadaSegundo() (lib/encargos.ts), no un bucle que
  // agregue todas las imágenes de una vez: un carrusel muestra un proyecto a la vez y va
  // cambiando solo. Un for…of + agregarA() acumularía todas las imágenes juntas, que es
  // justo lo que este encargo no pide.
  8: {
    pseudocodigo: `definir destacados = los proyectos de datos.proyectos que están destacados
definir carrusel = crearCarrusel()
mostrar(carrusel)

Cada segundo, con el próximo proyecto de destacados Hacer
  mostrar su imagen en el carrusel
FinCada`,
    javascript: `const destacados = proyectosDestacados(datos.proyectos)
const carrusel = crearCarrusel()
mostrar(carrusel)

cadaSegundo(carrusel, destacados, proyecto =>
  crearImagen(proyecto.imagenUrl, proyecto.nombre)
)`
  }
}
