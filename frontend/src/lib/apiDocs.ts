// Documentación de cada herramienta del API del estudiante.
// Inspirado en las fichas de "The Farmer Was Replaced": qué hace, qué devuelve, un ejemplo.
//
// REGLA: los ejemplos son de JUGUETE y de un contexto ajeno al portafolio (recetas, clima,
// una lista de compras). Enseñan la forma y el comportamiento de la herramienta, NUNCA la
// solución del encargo. El estudiante todavía tiene que deducir qué dato usar y cómo combinar.

export interface DocHerramienta {
  /** Firma legible, p. ej. "crearTitulo(texto)". */
  firma: string
  /** Una o dos frases: qué hace. */
  descripcion: string
  /** Qué devuelve o en qué se convierte. Vacío si no aplica. */
  devuelve?: string
  /** Fragmento de ejemplo — contexto de juguete, no del portafolio. */
  ejemplo: string
  /** Nombres (clave del catálogo) de herramientas relacionadas. */
  relacionadas?: string[]
}

// La clave es el texto EXACTO del tag que se muestra en el panel de encargo.
export const API_DOCS: Record<string, DocHerramienta> = {
  'const': {
    firma: 'const nombre = valor',
    descripcion:
      'Guarda un valor con un nombre que elegís vos. Después usás ese nombre en vez de repetir el valor.',
    ejemplo: 'const ciudad = "Lima"\nconst saludo = "hola"',
    relacionadas: ['mostrar()'],
  },

  'crearTitulo()': {
    firma: 'crearTitulo(texto)',
    descripcion:
      'Arma un título grande con el texto que le pases. Todavía no aparece en la página: para eso está mostrar().',
    devuelve: 'el título, para guardarlo o mostrarlo',
    ejemplo: 'const t = crearTitulo("Mi diario de viaje")\nmostrar(t)',
    relacionadas: ['crearSubtitulo()', 'crearParrafo()', 'mostrar()'],
  },

  'crearSubtitulo()': {
    firma: 'crearSubtitulo(texto)',
    descripcion:
      'Arma un título de sección, más chico que el título principal. Sirve para separar la página en partes.',
    devuelve: 'el subtítulo',
    ejemplo: 'const s = crearSubtitulo("Capítulo 1")\nmostrar(s)',
    relacionadas: ['crearTitulo()', 'crearParrafo()', 'mostrar()'],
  },

  'crearParrafo()': {
    firma: 'crearParrafo(texto)',
    descripcion: 'Arma un bloque de texto normal con lo que le pases.',
    devuelve: 'el párrafo, para mostrarlo o agregarlo a algo',
    ejemplo: 'const p = crearParrafo("Hoy llovió toda la tarde.")\nmostrar(p)',
    relacionadas: ['crearTitulo()', 'crearSubtitulo()', 'mostrar()'],
  },

  'crearLista()': {
    firma: 'crearLista()',
    descripcion:
      'Crea una lista vacía. Los elementos se le agregan uno por uno con agregarA().',
    devuelve: 'la lista vacía',
    ejemplo:
      'const compras = crearLista()\nmostrar(compras)\nagregarA(compras, crearItem("2 huevos"))',
    relacionadas: ['crearItem()', 'agregarA()'],
  },

  'crearItem()': {
    firma: 'crearItem(texto)',
    descripcion: 'Crea un elemento de lista. Va dentro de una lista con agregarA().',
    devuelve: 'el elemento de lista',
    ejemplo: 'agregarA(compras, crearItem("1 litro de leche"))',
    relacionadas: ['crearLista()', 'agregarA()'],
  },

  'crearEnlace()': {
    firma: 'crearEnlace(texto, url)',
    descripcion:
      'Crea un enlace: el texto que se ve y la dirección a la que lleva al hacer clic.',
    devuelve: 'el enlace',
    ejemplo: 'mostrar(crearEnlace("Ver la receta completa", "https://ejemplo.com/receta"))',
    relacionadas: ['mostrar()'],
  },

  'mostrar()': {
    firma: 'mostrar(elemento)',
    descripcion: 'Pone un elemento en la página, al final de lo que ya haya.',
    ejemplo: 'const t = crearTitulo("Recetas")\nmostrar(t)',
    relacionadas: ['agregarA()', 'crearTitulo()'],
  },

  'agregarA()': {
    firma: 'agregarA(contenedor, elemento)',
    descripcion:
      'Pone un elemento DENTRO de otro (por ejemplo, un item dentro de una lista). Distinto de mostrar(), que lo pone directo en la página.',
    ejemplo: 'const compras = crearLista()\nagregarA(compras, crearItem("pan"))',
    relacionadas: ['mostrar()', 'crearLista()', 'crearItem()'],
  },

  'si / sino': {
    firma: 'if (condición) { … } else { … }',
    descripcion:
      'Hace algo solo cuando se cumple una condición. Con "else", hace otra cosa cuando no se cumple.',
    ejemplo:
      'const temperatura = 32\nif (temperatura > 30) {\n  mostrar(crearParrafo("Hace calor"))\n} else {\n  mostrar(crearParrafo("Está fresco"))\n}',
  },

  'condición': {
    firma: 'if (condición) { … } else { … }',
    descripcion:
      'Hace algo solo cuando se cumple una condición. Con "else", hace otra cosa cuando no se cumple.',
    ejemplo:
      'const temperatura = 32\nif (temperatura > 30) {\n  mostrar(crearParrafo("Hace calor"))\n} else {\n  mostrar(crearParrafo("Está fresco"))\n}',
  },

  'por cada': {
    firma: 'for (const x of lista) { … }',
    descripcion:
      'Repite lo mismo por cada elemento de una lista, sin importar cuántos haya. En cada vuelta, "x" es un elemento.',
    ejemplo:
      'const frutas = ["manzana", "pera", "uva"]\nfor (const fruta of frutas) {\n  mostrar(crearParrafo(fruta))\n}',
    relacionadas: ['crearLista()', 'crearItem()', 'agregarA()'],
  },

  'cadaSegundo()': {
    firma: 'cadaSegundo(() => { … })',
    descripcion:
      'Repite algo una vez por segundo, para siempre, mientras la página esté abierta. Sirve para un reloj o algo que se actualiza solo.',
    ejemplo: 'let cuenta = 0\ncadaSegundo(() => {\n  cuenta = cuenta + 1\n  console.log(cuenta)\n})',
  },

  'función': {
    firma: 'function nombre(entrada) { … }',
    descripcion:
      'Guarda una serie de pasos con un nombre para no repetirlos. Después la "llamás" por su nombre las veces que haga falta.',
    ejemplo:
      'function saludar(quien) {\n  mostrar(crearParrafo("Hola, " + quien))\n}\n\nsaludar("Sofía")\nsaludar("Marcos")',
  },
}
