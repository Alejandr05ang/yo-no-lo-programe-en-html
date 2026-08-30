// Documentación de cada herramienta del API del estudiante.
// Inspirado en las fichas de "The Farmer Was Replaced": qué hace, qué devuelve, un ejemplo.
// Texto para principiante cero — sin jerga. Ver docs/encargos.md §3 para el API completo.

export interface DocHerramienta {
  /** Firma legible, p. ej. "crearTitulo(texto)". */
  firma: string
  /** Una o dos frases: qué hace. */
  descripcion: string
  /** Qué devuelve o en qué se convierte. Vacío si no aplica. */
  devuelve?: string
  /** Fragmento de ejemplo (varias líneas permitidas). */
  ejemplo: string
  /** Nombres (clave del catálogo) de herramientas relacionadas. */
  relacionadas?: string[]
}

// La clave es el texto EXACTO del tag que se muestra en el panel de encargo.
export const API_DOCS: Record<string, DocHerramienta> = {
  'const': {
    firma: 'const nombre = valor',
    descripcion:
      'Guarda un valor con un nombre. Después usás ese nombre en vez de repetir el valor. El nombre lo elegís vos.',
    ejemplo: 'const titulo = crearTitulo("Ana Rivas")\nmostrar(titulo)',
    relacionadas: ['mostrar()'],
  },

  'crearTitulo()': {
    firma: 'crearTitulo(texto)',
    descripcion:
      'Arma un título grande con el texto que le pases. Todavía no aparece en la página: para eso está mostrar().',
    devuelve: 'el título, para guardarlo o mostrarlo',
    ejemplo: 'const t = crearTitulo("Mi portafolio")\nmostrar(t)',
    relacionadas: ['crearParrafo()', 'mostrar()'],
  },

  'crearParrafo()': {
    firma: 'crearParrafo(texto)',
    descripcion: 'Arma un bloque de texto normal con lo que le pases.',
    devuelve: 'el párrafo, para mostrarlo o agregarlo a algo',
    ejemplo: 'const p = crearParrafo("Estudio ingeniería en Bogotá.")\nmostrar(p)',
    relacionadas: ['crearTitulo()', 'mostrar()'],
  },

  'crearLista()': {
    firma: 'crearLista()',
    descripcion:
      'Crea una lista vacía. Los elementos se le agregan uno por uno con agregarA().',
    devuelve: 'la lista vacía',
    ejemplo:
      'const lista = crearLista()\nmostrar(lista)\nagregarA(lista, crearItem("Escalada"))',
    relacionadas: ['crearItem()', 'agregarA()'],
  },

  'crearItem()': {
    firma: 'crearItem(texto)',
    descripcion: 'Crea un elemento de lista. Va dentro de una lista con agregarA().',
    devuelve: 'el elemento de lista',
    ejemplo: 'agregarA(lista, crearItem("Ajedrez"))',
    relacionadas: ['crearLista()', 'agregarA()'],
  },

  'crearEnlace()': {
    firma: 'crearEnlace(texto, url)',
    descripcion:
      'Crea un enlace: el texto que se ve y la dirección a la que lleva al hacer clic.',
    devuelve: 'el enlace',
    ejemplo: 'mostrar(crearEnlace("GitHub", "https://github.com/ana"))',
    relacionadas: ['mostrar()'],
  },

  'mostrar()': {
    firma: 'mostrar(elemento)',
    descripcion: 'Pone un elemento en la página, al final de lo que ya haya.',
    ejemplo: 'const t = crearTitulo("Hola")\nmostrar(t)',
    relacionadas: ['agregarA()', 'crearTitulo()'],
  },

  'agregarA()': {
    firma: 'agregarA(contenedor, elemento)',
    descripcion:
      'Pone un elemento DENTRO de otro (por ejemplo, un item dentro de una lista). Distinto de mostrar(), que lo pone directo en la página.',
    ejemplo: 'const lista = crearLista()\nagregarA(lista, crearItem("Fotografía"))',
    relacionadas: ['mostrar()', 'crearLista()', 'crearItem()'],
  },

  'si / sino': {
    firma: 'if (condición) { … } else { … }',
    descripcion:
      'Hace algo solo cuando se cumple una condición. Con "else", hace otra cosa cuando no se cumple.',
    ejemplo:
      'if (datos.sobreMi === "") {\n  mostrar(crearParrafo("Página en construcción"))\n}',
  },

  'condición': {
    firma: 'if (condición) { … } else { … }',
    descripcion:
      'Hace algo solo cuando se cumple una condición. Con "else", hace otra cosa cuando no se cumple.',
    ejemplo:
      'if (datos.redes.github) {\n  mostrar(crearEnlace("GitHub", datos.redes.github))\n}',
  },

  'por cada': {
    firma: 'for (const x of lista) { … }',
    descripcion:
      'Repite lo mismo por cada elemento de una lista, sin importar cuántos haya. En cada vuelta, "x" es un elemento.',
    ejemplo:
      'for (const hobby of datos.hobbies) {\n  agregarA(lista, crearItem(hobby))\n}',
    relacionadas: ['crearLista()', 'crearItem()', 'agregarA()'],
  },

  'cadaSegundo()': {
    firma: 'cadaSegundo(() => { … })',
    descripcion:
      'Repite algo una vez por segundo, para siempre, mientras la página esté abierta. Sirve para un reloj o un saludo que cambia con la hora.',
    ejemplo:
      'cadaSegundo(() => {\n  const hora = new Date().getHours()\n  // ...mostrar el saludo según la hora\n})',
  },

  'función': {
    firma: 'function nombre(entrada) { … }',
    descripcion:
      'Guarda una serie de pasos con un nombre para no repetirlos. Después la "llamás" por su nombre las veces que haga falta.',
    ejemplo:
      'function tarjeta(proyecto) {\n  const t = crearTitulo(proyecto.nombre)\n  mostrar(t)\n}\n\ntarjeta(datos.proyectos[0])',
  },
}
