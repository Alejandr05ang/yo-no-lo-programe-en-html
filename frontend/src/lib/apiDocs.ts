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
  /** Fragmento de ejemplo — contexto de juguete, no del portafolio. Para condicionales,
   *  bucles y función, esto YA es lo que el estudiante escribe en el editor (el pseudocódigo
   *  de lib/pseudocodigoAJS.ts: "SI … ENTONCES", "PARA CADA … HACER" — sin "()" ni "{}"), no
   *  una explicación aparte del código real: acá no hay dos variantes que puedan confundirse
   *  entre sí, solo una. */
  ejemplo: string
  /** Nombres (clave del catálogo) de herramientas relacionadas. */
  relacionadas?: string[]
  /** Mini ejemplo VISUAL (no el código): un fragmento de HTML de confianza, escrito a mano
   *  acá — nunca a partir de datos del estudiante — para mostrar cómo se ve, no solo cómo se
   *  escribe. Sin gradientes ni emojis, mismo criterio que el resto de la plataforma. */
  previsualizacion?: string
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

  'crearSalto()': {
    firma: 'crearSalto()',
    descripcion:
      'Crea un espacio en blanco para separar dos cosas, aunque no sean párrafos (por ejemplo, dos enlaces seguidos). Usalo cuantas veces quieras.',
    devuelve: 'el espacio',
    ejemplo: 'mostrar(crearParrafo("Ingredientes"))\nmostrar(crearSalto())\nmostrar(crearParrafo("Instrucciones"))',
    relacionadas: ['crearParrafo()', 'mostrar()'],
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

  'crearImagen()': {
    firma: 'crearImagen(url, descripcion)',
    descripcion:
      'Crea una imagen a partir de una dirección web. La descripción es para quien no puede ver la imagen — contá qué muestra.',
    devuelve: 'la imagen',
    ejemplo: 'mostrar(crearImagen("https://ejemplo.com/foto.jpg", "Vista de la ciudad de noche"))',
    relacionadas: ['mostrar()', 'agregarA()'],
  },

  'crearCarrusel()': {
    firma: 'crearCarrusel()',
    descripcion:
      'Prepara un espacio para mostrar un proyecto destacado a la vez. Primero mostralo con mostrar().',
    devuelve: 'el espacio donde va cambiando el proyecto',
    ejemplo: 'const destacado = crearCarrusel()\nmostrar(destacado)',
    relacionadas: ['cadaSegundo()', 'mostrar()'],
  },

  'proyectosDestacados()': {
    firma: 'proyectosDestacados(proyectos)',
    descripcion:
      'De una lista de proyectos, conserva solo los que vienen marcados como destacados. Así el carrusel no muestra los demás.',
    devuelve: 'una lista de proyectos destacados',
    ejemplo: 'const destacados = proyectosDestacados(datos.proyectos)',
    relacionadas: ['cadaSegundo()'],
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

  'vaciar()': {
    firma: 'vaciar(contenedor)',
    descripcion:
      'Quita lo que hay dentro de un contenedor, pero conserva el contenedor para volver a llenarlo.',
    ejemplo: 'vaciar(compras)\nagregarA(compras, crearItem("pan"))',
    relacionadas: ['agregarA()', 'crearLista()'],
  },

  'si / sino': {
    firma: 'SI condición ENTONCES … SINO SI condición ENTONCES … SINO … FIN SI',
    descripcion:
      'Hace algo solo cuando se cumple una condición. "SINO SI" agrega otra condición para cuando la primera no se cumplió. "SINO" (opcional, sin condición) es lo que pasa si ninguna de las anteriores se cumplió. Un solo FIN SI cierra toda la cadena, sin importar cuántos SINO SI tenga en el medio.',
    ejemplo:
      'const temperatura = 32\nSI temperatura > 30 ENTONCES\n    const p = crearParrafo("Hace calor")\n    mostrar(p)\nSINO SI temperatura > 15 ENTONCES\n    const p = crearParrafo("Templado")\n    mostrar(p)\nSINO\n    const p = crearParrafo("Está fresco")\n    mostrar(p)\nFIN SI',
  },

  'condición': {
    firma: 'SI condición ENTONCES … SINO SI condición ENTONCES … SINO … FIN SI',
    descripcion:
      'Hace algo solo cuando se cumple una condición. "SINO SI" agrega otra condición para cuando la primera no se cumplió. "SINO" (opcional, sin condición) es lo que pasa si ninguna de las anteriores se cumplió. Un solo FIN SI cierra toda la cadena, sin importar cuántos SINO SI tenga en el medio.',
    ejemplo:
      'const temperatura = 32\nSI temperatura > 30 ENTONCES\n    const p = crearParrafo("Hace calor")\n    mostrar(p)\nSINO SI temperatura > 15 ENTONCES\n    const p = crearParrafo("Templado")\n    mostrar(p)\nSINO\n    const p = crearParrafo("Está fresco")\n    mostrar(p)\nFIN SI',
  },

  'por cada': {
    firma: 'PARA CADA x EN lista HACER … FIN PARA',
    descripcion:
      'Repite lo mismo por cada elemento de una lista, sin importar cuántos haya. En cada vuelta, "x" es un elemento.',
    ejemplo:
      'const frutas = ["manzana", "pera", "uva"]\nPARA CADA fruta EN frutas HACER\n    const p = crearParrafo(fruta)\n    mostrar(p)\nFIN PARA',
    relacionadas: ['crearLista()', 'crearItem()', 'agregarA()', 'mientras'],
  },

  // Todavía no la desbloquea ningún encargo (no hay tag en ninguna sesión de
  // HERRAMIENTAS_POR_SESION en lib/encargos.ts) — el traductor de pseudocodigoAJS.ts ya la
  // soporta, pero se accede a esta ficha solo desde "relacionadas" de otras (por cada, si/
  // sino), no desde un tag propio en ningún encargo.
  'mientras': {
    firma: 'MIENTRAS condición HACER … FIN MIENTRAS',
    descripcion:
      'Repite lo que pongas adentro mientras la condición sea cierta. A diferencia de "por cada", no sabés de antemano cuántas vueltas va a dar — por eso algo adentro tiene que poder volver la condición falsa, o no termina nunca.',
    ejemplo:
      'let intentos = 0\nMIENTRAS intentos < 3 HACER\n    const p = crearParrafo("Intento " + intentos)\n    mostrar(p)\n    intentos = intentos + 1\nFIN MIENTRAS',
    relacionadas: ['por cada'],
  },

  'cadaSegundo()': {
    firma: 'cadaSegundo(carrusel, lista, proyecto => crearImagen(...))',
    descripcion:
      'En un carrusel, cambia al siguiente elemento de una lista una vez por segundo y vuelve al primero al llegar al final. Si la lista está vacía, muestra un aviso.',
    ejemplo:
      'cadaSegundo(destacado, destacados, proyecto =>\n  crearImagen(proyecto.imagenUrl, proyecto.nombre)\n)',
    relacionadas: ['crearCarrusel()', 'proyectosDestacados()', 'crearImagen()'],
  },

  'crearSeccion()': {
    firma: 'crearSeccion(tipo)',
    descripcion:
      'Crea un contenedor vacío para agrupar cosas. "encabezado" pone lo de adentro en fila; "cuerpo" le da un recuadro; "cuadricula-2" y "cuadricula-3" reparten lo de adentro en 2 o 3 columnas. Después agregale contenido con agregarA().',
    devuelve: 'el contenedor vacío',
    ejemplo:
      'const fila = crearSeccion("encabezado")\nmostrar(fila)\nagregarA(fila, crearParrafo("Lima"))\nagregarA(fila, crearParrafo("18°C"))',
    relacionadas: ['agregarA()', 'mostrar()'],
    previsualizacion:
      '<div style="display:flex;flex-direction:column;gap:6px">' +
      '<div style="display:flex;gap:6px"><div style="flex:1;height:14px;border-radius:3px;background:#ece4d6"></div><div style="flex:1;height:14px;border-radius:3px;background:#ece4d6"></div></div>' +
      '<div style="height:24px;border-radius:6px;border:1px solid #cfc6b8"></div>' +
      '<div style="display:flex;gap:6px"><div style="flex:1;height:18px;border-radius:3px;border:1px solid #cfc6b8"></div><div style="flex:1;height:18px;border-radius:3px;border:1px solid #cfc6b8"></div><div style="flex:1;height:18px;border-radius:3px;border:1px solid #cfc6b8"></div></div>' +
      '</div>',
  },

  'cambiarColorTexto()': {
    firma: 'cambiarColorTexto(elemento, color)',
    descripcion:
      'Cambia el color del texto de un título, párrafo o cualquier otro elemento. El color se escribe como en CSS (un nombre como "tomato" o un código como "#2b6a4f").',
    devuelve: 'el mismo elemento, ya con el color puesto',
    ejemplo: 'const p = crearParrafo("Hoy amaneció despejado")\nmostrar(p)\ncambiarColorTexto(p, "#2b6a4f")',
    relacionadas: ['cambiarTamano()', 'cambiarFuente()', 'cambiarColorFondo()', 'cambiarAlineacion()'],
    previsualizacion:
      '<div style="display:flex;flex-direction:column;gap:4px;font-size:13px">' +
      '<span>Texto normal</span><span style="color:#2b6a4f">Texto con color</span>' +
      '</div>',
  },

  'cambiarTamano()': {
    firma: 'cambiarTamano(elemento, tamaño)',
    descripcion:
      'Cambia qué tan grande se ve un elemento. "tamaño" es uno de estos cuatro, siempre entre comillas: "pequeño", "normal", "grande", "muy grande".',
    devuelve: 'el mismo elemento, ya con el tamaño puesto',
    ejemplo: 'const p = crearParrafo("Aviso importante")\nmostrar(p)\ncambiarTamano(p, "grande")',
    relacionadas: ['cambiarColorTexto()', 'cambiarFuente()'],
    previsualizacion:
      '<div style="display:flex;align-items:baseline;gap:10px">' +
      '<span style="font-size:11px">pequeño</span><span style="font-size:14px">normal</span>' +
      '<span style="font-size:18px">grande</span><span style="font-size:23px">muy grande</span>' +
      '</div>',
  },

  'cambiarFuente()': {
    firma: 'cambiarFuente(elemento, fuente)',
    descripcion:
      'Cambia el tipo de letra de un elemento. "fuente" es una de estas cuatro, siempre entre comillas: "clásica", "elegante", "moderna", "manuscrita".',
    devuelve: 'el mismo elemento, ya con la fuente puesta',
    ejemplo: 'const t = crearTitulo("Mi diario")\nmostrar(t)\ncambiarFuente(t, "manuscrita")',
    relacionadas: ['cambiarTamano()', 'cambiarColorTexto()'],
    previsualizacion:
      '<div style="display:flex;flex-direction:column;gap:4px;font-size:14px">' +
      '<span style="font-family:\'Lora\',Georgia,serif">clásica</span>' +
      '<span style="font-family:\'Cormorant Garamond\',Georgia,serif">elegante</span>' +
      '<span style="font-family:\'Inter\',Arial,sans-serif">moderna</span>' +
      '<span style="font-family:\'Caveat\',cursive;font-size:18px">manuscrita</span>' +
      '</div>',
  },

  'cambiarColorFondo()': {
    firma: 'cambiarColorFondo(color) — o cambiarColorFondo(elemento, color)',
    descripcion:
      'Con un solo color, cambia el fondo de TODA la página. Pasándole un elemento antes del color (un título, una sección con crearSeccion()…), cambia el fondo de ESE elemento nada más. El color se escribe como en CSS, igual que en cambiarColorTexto().',
    devuelve: 'con elemento: el mismo elemento, ya con el fondo puesto. Sin elemento: nada.',
    ejemplo:
      'cambiarColorFondo("#f2ece0")\n\nconst recuadro = crearSeccion("cuerpo")\nmostrar(recuadro)\ncambiarColorFondo(recuadro, "#eef1e6")',
    relacionadas: ['cambiarColorTexto()', 'crearSeccion()'],
    previsualizacion:
      '<div style="width:100%;height:28px;border-radius:6px;border:1px solid #cfc6b8;background:#f2ece0"></div>',
  },

  'cambiarAlineacion()': {
    firma: 'cambiarAlineacion(elemento, alineacion)',
    descripcion:
      'Cambia cómo se alinea el texto adentro de un elemento. "alineacion" es una de estas cuatro, siempre entre comillas: "izquierda", "centro", "derecha", "justificado".',
    devuelve: 'el mismo elemento, ya con la alineación puesta',
    ejemplo: 'const p = crearParrafo("Un texto más largo, para notar el efecto.")\nmostrar(p)\ncambiarAlineacion(p, "centro")',
    relacionadas: ['cambiarColorTexto()', 'cambiarTamano()', 'cambiarFuente()'],
    previsualizacion:
      '<div style="display:flex;flex-direction:column;gap:6px;font-size:12px">' +
      '<div style="text-align:left;border:1px solid #cfc6b8;border-radius:4px;padding:4px 6px">izquierda</div>' +
      '<div style="text-align:center;border:1px solid #cfc6b8;border-radius:4px;padding:4px 6px">centro</div>' +
      '<div style="text-align:right;border:1px solid #cfc6b8;border-radius:4px;padding:4px 6px">derecha</div>' +
      '<div style="text-align:justify;border:1px solid #cfc6b8;border-radius:4px;padding:4px 6px">justificado justificado justificado justificado</div>' +
      '</div>',
  },

  'función': {
    firma: 'FUNCIÓN nombre(entrada) … FIN FUNCIÓN',
    descripcion:
      'Guarda una serie de pasos con un nombre para no repetirlos. Después la "llamás" por su nombre las veces que haga falta.',
    ejemplo:
      'FUNCIÓN saludar(quien)\n    const p = crearParrafo("Hola, " + quien)\n    mostrar(p)\nFIN FUNCIÓN\n\nsaludar("Sofía")\nsaludar("Marcos")',
  },
}
