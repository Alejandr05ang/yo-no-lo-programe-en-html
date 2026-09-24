import { parse } from 'acorn'
import { aJavaScript } from './pseudocodigoAJS.ts'

// Traduce el código del estudiante (portafolio.js, ya escrito en el pseudocódigo de
// pseudocodigoAJS.ts) a dos vistas de solo lectura de su flujo de ejecución: un diagrama
// Mermaid (rombos de decisión, estilo PSeInt) y un pseudocódigo en español con las llamadas
// también traducidas a frases naturales ("Mostrar … en la página" en vez de "mostrar(…)").
//
// No es un intérprete ni cubre todo JS: traduce el subconjunto que enseña la API curada
// (const, si/sino, por cada, función, y las llamadas de lib/sandbox.ts — mismo vocabulario
// que lib/apiDocs.ts). Lo que no reconoce lo muestra tal cual en vez de fallar, así que nunca
// oculta información: en el peor caso no simplifica.

export interface ResultadoFlujo {
  ok: boolean
  mermaid: string
  pseudocodigo: string
  error?: string
}

// No tipamos el AST completo de acorn (fuera de alcance): leemos por duck-typing los campos
// de la forma ESTree que hacen falta para este subconjunto.
type Nodo = { type: string; start: number; end: number } & Record<string, any>

const MAX_TEXTO = 64

function acortar(texto: string): string {
  const limpio = texto.replace(/\s+/g, ' ').trim()
  return limpio.length > MAX_TEXTO ? limpio.slice(0, MAX_TEXTO - 1) + '…' : limpio
}

/** Para la vista de pseudocódigo (que tiene espacio): sin recortar nada, pero una sentencia
 *  que el estudiante partió en varias líneas se lee en una sola, así sus líneas de
 *  continuación no rompen la sangría ni dejan líneas en blanco sueltas. */
function enUnaLinea(texto: string): string {
  return texto.replace(/\s*\n\s*/g, ' ').trim()
}

/** El texto fuente de un nodo — un string literal se muestra entre comillas, el resto tal
 *  cual aparece en el código (una variable, una expresión, un member access…). */
function fuente(n: Nodo, codigo: string): string {
  if (n.type === 'Literal') return JSON.stringify(n.value)
  return codigo.slice(n.start, n.end)
}

function listaFuente(nodos: Nodo[], codigo: string): string[] {
  return nodos.map((n) => fuente(n, codigo))
}

function cuerpoDe(n: Nodo): Nodo[] {
  return n.type === 'BlockStatement' ? n.body : [n]
}

// Frases NOMINALES para "const x = crearAlgo(...)" → "Crear un título… y guardarlo como x".
const CREAR: Record<string, (a: string[]) => string> = {
  crearTitulo: (a) => `un título con el texto ${a[0] ?? ''}`,
  crearSubtitulo: (a) => `un subtítulo con el texto ${a[0] ?? ''}`,
  crearParrafo: (a) => `un párrafo con el texto ${a[0] ?? ''}`,
  crearSalto: () => `un espacio en blanco`,
  crearLista: () => `una lista vacía`,
  crearItem: (a) => `un elemento de lista con el texto ${a[0] ?? ''}`,
  // Sin comillas propias: fuente() ya las pone a los textos, y una variable (red.nombre) no las
  // lleva, como en el resto de frases.
  crearEnlace: (a) => `un enlace ${a[0] ?? ''} hacia ${a[1] ?? ''}`,
  crearImagen: (a) => `una imagen desde ${a[0] ?? ''}`,
  crearCarrusel: () => `un carrusel`,
  crearBoton: (a) => `un botón con el texto ${a[0] ?? ''}`,
  proyectosDestacados: (a) => `los proyectos destacados de ${a[0] ?? ''}`,
}

// Frases VERBALES para sentencias sueltas: "mostrar(x)" → "Mostrar x en la página".
const ACCION: Record<string, (a: string[]) => string> = {
  mostrar: (a) => `Mostrar ${a[0] ?? ''} en la página`,
  agregarA: (a) => `Agregar ${a[1] ?? ''} dentro de ${a[0] ?? ''}`,
  vaciar: (a) => `Vaciar ${a[0] ?? ''}`,
  cadaSegundo: () => `Repetir algo una vez por segundo`,
}

function textoLlamada(n: Nodo, codigo: string): string | null {
  if (n.type !== 'CallExpression' || n.callee.type !== 'Identifier') return null
  const nombre = n.callee.name as string
  const args = listaFuente(n.arguments, codigo)
  if (ACCION[nombre]) return ACCION[nombre](args)
  if (CREAR[nombre]) return `Crear ${CREAR[nombre](args)}`
  return `Llamar a ${nombre}(${args.join(', ')})`
}

/** "let x = 0" → "Guardar 0 en x"; "const t = crearTitulo(…)" → "Crear un título… y guardarlo como t". */
function textoDeclaracion(d: Nodo, codigo: string): string {
  const nombre = d.id.name ?? fuente(d.id, codigo)
  if (!d.init) return `Declarar ${nombre}`
  if (d.init.type === 'CallExpression' && d.init.callee.type === 'Identifier' && CREAR[d.init.callee.name]) {
    const frase = CREAR[d.init.callee.name](listaFuente(d.init.arguments, codigo))
    return `Crear ${frase} y guardarl${frase.startsWith('una ') ? 'a' : 'o'} como ${nombre}`
  }
  return `Guardar ${fuente(d.init, codigo)} en ${nombre}`
}

/** Traduce una sentencia "de hoja" (sin ramas propias) a una frase en español. `ajustar` es
 *  cómo se muestra lo que se copia tal cual: recortado en el diagrama, entero en el pseudocódigo. */
function textoSentencia(n: Nodo, codigo: string, ajustar: (t: string) => string = acortar): string {
  switch (n.type) {
    case 'VariableDeclaration':
      // "let x = 0, y = 10": cada variable cuenta, no solo la primera.
      return (n.declarations as Nodo[]).map((d) => textoDeclaracion(d, codigo)).join('; ')
    case 'ExpressionStatement': {
      const llamada = textoLlamada(n.expression, codigo)
      return llamada ?? ajustar(fuente(n, codigo))
    }
    case 'ReturnStatement':
      return n.argument ? `Devolver ${fuente(n.argument, codigo)}` : 'Terminar la función'
    case 'BreakStatement':
      return 'Cortar la repetición'
    case 'ContinueStatement':
      return 'Saltar a la próxima vuelta'
    default:
      return ajustar(fuente(n, codigo))
  }
}

/** Pregunta (para el diagrama) y encabezado (para el pseudocódigo) de un bucle. */
function descripcionBucle(s: Nodo, codigo: string): { pregunta: string; cabecera: string; cierre: string } {
  if (s.type === 'ForOfStatement') {
    const variable =
      s.left.type === 'VariableDeclaration'
        ? (s.left.declarations[0].id.name ?? fuente(s.left.declarations[0].id, codigo))
        : fuente(s.left, codigo)
    const iterable = fuente(s.right, codigo)
    return {
      pregunta: `¿Quedan elementos en ${iterable}?`,
      cabecera: `PARA CADA ${variable} EN ${iterable} HACER`,
      cierre: 'FIN PARA',
    }
  }
  if (s.type === 'WhileStatement') {
    const cond = fuente(s.test, codigo)
    return { pregunta: `¿${cond}?`, cabecera: `MIENTRAS ${cond} HACER`, cierre: 'FIN MIENTRAS' }
  }
  // for clásico: caso raro en este curso (solo se enseña "por cada" / for…of) — fallback simple.
  const cabeceraCruda = codigo.slice(s.start, s.body.start).trim()
  return {
    pregunta: `¿Sigue el bucle? (${acortar(cabeceraCruda)})`,
    cabecera: `REPETIR ${cabeceraCruda}`,
    cierre: 'FIN MIENTRAS',
  }
}

// ── Pseudocódigo (bloques con sangría, estilo PSeInt) ──────────────────────────────────

// "else if" en JS es un IfStatement anidado en `alternate`: se encadena como "SINO SI" en el
// mismo nivel (como PSeInt), en vez de anidar un SI dentro de otro. Toda la cadena cierra con
// un único "FIN SI" al final, sin importar cuántos "SINO SI" tenga en el medio.
function pseudoIf(s: Nodo, codigo: string, nivel: number, lineas: string[]) {
  const sangria = '    '.repeat(nivel)
  let actual: Nodo | null = s
  let primero = true
  while (actual) {
    lineas.push(`${sangria}${primero ? 'SI' : 'SINO SI'} ${enUnaLinea(fuente(actual.test, codigo))} ENTONCES`)
    lineas.push(...pseudoBloque(cuerpoDe(actual.consequent), codigo, nivel + 1))
    primero = false

    if (actual.alternate && actual.alternate.type === 'IfStatement') {
      actual = actual.alternate
      continue
    }
    if (actual.alternate) {
      lineas.push(`${sangria}SINO`)
      lineas.push(...pseudoBloque(cuerpoDe(actual.alternate), codigo, nivel + 1))
    }
    actual = null
  }
  lineas.push(`${sangria}FIN SI`)
}

/** ¿Dejó el estudiante al menos una línea en blanco entre dos sentencias seguidas? */
function hayLineaEnBlanco(codigo: string, desde: number, hasta: number): boolean {
  return /\n[ \t]*\r?\n/.test(codigo.slice(desde, hasta))
}

// Las líneas en blanco que separan partes del código (el título, las redes, los hobbies…) se
// conservan en el pseudocódigo, una sola aunque haya varias seguidas: así se lee por partes,
// igual que el código del estudiante, en vez de un bloque continuo. La sangría sí se
// normaliza (4 espacios por nivel), porque es la que muestra dónde empieza y acaba cada bloque.
function pseudoBloque(stmts: Nodo[], codigo: string, nivel: number): string[] {
  const sangria = '    '.repeat(nivel)
  const lineas: string[] = []
  let anterior: Nodo | null = null
  for (const s of stmts) {
    if (anterior && hayLineaEnBlanco(codigo, anterior.end, s.start)) lineas.push('')
    anterior = s
    if (s.type === 'IfStatement') {
      pseudoIf(s, codigo, nivel, lineas)
    } else if (s.type === 'ForOfStatement' || s.type === 'ForStatement' || s.type === 'WhileStatement') {
      const { cabecera, cierre } = descripcionBucle(s, codigo)
      lineas.push(`${sangria}${enUnaLinea(cabecera)}`)
      lineas.push(...pseudoBloque(cuerpoDe(s.body), codigo, nivel + 1))
      lineas.push(`${sangria}${cierre}`)
    } else if (s.type === 'FunctionDeclaration') {
      const params = (s.params as Nodo[]).map((p) => fuente(p, codigo)).join(', ')
      lineas.push(`${sangria}FUNCIÓN ${s.id.name}(${params})`)
      lineas.push(...pseudoBloque(cuerpoDe(s.body), codigo, nivel + 1))
      lineas.push(`${sangria}FIN FUNCIÓN`)
    } else {
      lineas.push(`${sangria}${enUnaLinea(textoSentencia(s, codigo, enUnaLinea))}`)
    }
  }
  return lineas
}

function generarPseudocodigo(programa: Nodo, codigo: string): string {
  return ['INICIO', ...pseudoBloque(programa.body, codigo, 1), 'FIN'].join('\n')
}

// ── Diagrama de flujo (Mermaid, flowchart TD) ──────────────────────────────────────────

interface Salida {
  id: string
  etiqueta?: string
}

function generarMermaid(programa: Nodo, codigo: string): string {
  let contador = 0
  const lineas: string[] = ['flowchart TD']
  const nuevoId = () => `n${contador++}`

  // Mermaid lee la etiqueta como HTML: un "<" pegado a una letra (contador<limite, i<lista.length)
  // se tomaba por el inicio de una etiqueta y la condición del rombo se cortaba. Se escriben
  // con los códigos de Mermaid (#lt; …), que se ven como el carácter.
  function escaparTexto(t: string): string {
    // "#" primero: Mermaid también lee "#algo;" del propio texto como un código ("Canal #1;").
    return acortar(t).replace(/#/g, '#35;').replace(/&/g, '#amp;').replace(/</g, '#lt;').replace(/>/g, '#gt;').replace(/"/g, "'")
  }

  function nodo(id: string, texto: string, forma: 'accion' | 'decision' | 'terminal') {
    const t = escaparTexto(texto)
    if (forma === 'decision') lineas.push(`  ${id}{"${t}"}`)
    else if (forma === 'terminal') lineas.push(`  ${id}(["${t}"])`)
    else lineas.push(`  ${id}["${t}"]`)
  }

  function arista(desde: string, hasta: string, etiqueta?: string) {
    lineas.push(etiqueta ? `  ${desde} -->|${etiqueta}| ${hasta}` : `  ${desde} --> ${hasta}`)
  }

  function conectar(salidas: Salida[], hastaId: string) {
    for (const s of salidas) arista(s.id, hastaId, s.etiqueta)
  }

  // Cada sentencia devuelve dónde entra el flujo y las "salidas abiertas" con las que hay
  // que conectar lo que sigue (más de una salida cuando hay ramas: if/else, decisión de bucle).
  function bloque(stmts: Nodo[]): { entrada: string | null; salidas: Salida[] } {
    let entrada: string | null = null
    let salidas: Salida[] = []
    for (const s of stmts) {
      const tramo = sentencia(s)
      if (entrada === null) entrada = tramo.entrada
      else conectar(salidas, tramo.entrada)
      salidas = tramo.salidas
    }
    return { entrada, salidas }
  }

  function sentencia(s: Nodo): { entrada: string; salidas: Salida[] } {
    if (s.type === 'IfStatement') {
      const d = nuevoId()
      nodo(d, `¿${fuente(s.test, codigo)}?`, 'decision')

      const si = bloque(cuerpoDe(s.consequent))
      let salidasSi: Salida[] = [{ id: d, etiqueta: 'Sí' }]
      if (si.entrada) {
        arista(d, si.entrada, 'Sí')
        salidasSi = si.salidas
      }

      let salidasNo: Salida[] = [{ id: d, etiqueta: 'No' }]
      if (s.alternate) {
        const no = bloque(cuerpoDe(s.alternate))
        if (no.entrada) {
          arista(d, no.entrada, 'No')
          salidasNo = no.salidas
        }
      }

      return { entrada: d, salidas: [...salidasSi, ...salidasNo] }
    }

    if (s.type === 'ForOfStatement' || s.type === 'ForStatement' || s.type === 'WhileStatement') {
      const d = nuevoId()
      nodo(d, descripcionBucle(s, codigo).pregunta, 'decision')
      const cuerpo = bloque(cuerpoDe(s.body))
      if (cuerpo.entrada) {
        arista(d, cuerpo.entrada, 'Sí')
        conectar(cuerpo.salidas, d)
      } else {
        arista(d, d, 'Sí') // bucle sin cuerpo: caso raro, se dibuja igual sin romper el diagrama
      }
      return { entrada: d, salidas: [{ id: d, etiqueta: 'No' }] }
    }

    if (s.type === 'FunctionDeclaration') {
      const id = nuevoId()
      const params = (s.params as Nodo[]).map((p) => fuente(p, codigo)).join(', ')
      nodo(id, `Función ${s.id.name}(${params}) — definida`, 'accion')
      return { entrada: id, salidas: [{ id }] }
    }

    const id = nuevoId()
    nodo(id, textoSentencia(s, codigo), 'accion')
    return { entrada: id, salidas: [{ id }] }
  }

  const raiz = bloque(programa.body)
  const inicio = nuevoId()
  const fin = nuevoId()
  nodo(inicio, 'Inicio', 'terminal')
  if (raiz.entrada) {
    arista(inicio, raiz.entrada)
    conectar(raiz.salidas, fin)
  } else {
    arista(inicio, fin)
  }
  nodo(fin, 'Fin', 'terminal')

  return lineas.join('\n')
}

/** Analiza el código del estudiante y arma el diagrama + pseudocódigo. Nunca lanza: un error
 *  vuelve como `{ ok: false, error }` con un mensaje pensado para quien recién empieza a
 *  programar, no el mensaje crudo del parser. */
export function analizarFlujo(codigoEstudiante: string): ResultadoFlujo {
  if (!codigoEstudiante.trim()) {
    return { ok: false, mermaid: '', pseudocodigo: '', error: 'Escribe algo de código para ver aquí su diagrama de flujo.' }
  }
  // El estudiante escribe pseudocódigo (SI/PARA CADA/MIENTRAS/FUNCIÓN — pseudocodigoAJS.ts);
  // acá hace falta JS real para poder parsearlo con acorn. Un pseudocódigo mal cerrado (falta
  // un FIN SI, etc.) es el mismo tipo de error que un paréntesis sin cerrar en JS: se muestra
  // igual, con su propio mensaje.
  const traduccion = aJavaScript(codigoEstudiante)
  if (!traduccion.ok) {
    // Con su línea: aquí el diálogo tapa el editor y "esta línea" sola no dice cuál es.
    const e = traduccion.error
    const error = !e ? 'Hay un error en tu código.' : e.linea ? `${e.mensaje} (línea ${e.linea})` : e.mensaje
    return { ok: false, mermaid: '', pseudocodigo: '', error }
  }
  const codigo = traduccion.js
  let programa: Nodo
  try {
    programa = parse(codigo, { ecmaVersion: 'latest', sourceType: 'script' }) as unknown as Nodo
  } catch {
    return {
      ok: false,
      mermaid: '',
      pseudocodigo: '',
      error: 'Tu código tiene un error de sintaxis. Corrígelo para ver el diagrama.',
    }
  }
  if (programa.body.length === 0) {
    return { ok: false, mermaid: '', pseudocodigo: '', error: 'Escribe algo de código para ver aquí su diagrama de flujo.' }
  }
  try {
    return {
      ok: true,
      mermaid: generarMermaid(programa, codigo),
      pseudocodigo: generarPseudocodigo(programa, codigo),
    }
  } catch {
    // Un programa enorme o anidadísimo puede agotar la pila al recorrerlo: se avisa en vez de
    // tumbar la pantalla del estudiante.
    return { ok: false, mermaid: '', pseudocodigo: '', error: 'Tu código es demasiado largo o anidado para dibujarlo.' }
  }
}
