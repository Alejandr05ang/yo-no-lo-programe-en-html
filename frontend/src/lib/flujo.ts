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
  crearEnlace: (a) => `un enlace "${a[0] ?? ''}" hacia ${a[1] ?? ''}`,
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

/** Traduce una sentencia "de hoja" (sin ramas propias) a una frase en español. */
function textoSentencia(n: Nodo, codigo: string): string {
  switch (n.type) {
    case 'VariableDeclaration': {
      const d = n.declarations[0]
      const nombre = d.id.name ?? fuente(d.id, codigo)
      if (!d.init) return `Declarar ${nombre}`
      if (d.init.type === 'CallExpression' && d.init.callee.type === 'Identifier' && CREAR[d.init.callee.name]) {
        const args = listaFuente(d.init.arguments, codigo)
        return `Crear ${CREAR[d.init.callee.name](args)} y guardarlo como ${nombre}`
      }
      return `Guardar ${fuente(d.init, codigo)} en ${nombre}`
    }
    case 'ExpressionStatement': {
      const llamada = textoLlamada(n.expression, codigo)
      return llamada ?? acortar(fuente(n, codigo))
    }
    case 'ReturnStatement':
      return n.argument ? `Devolver ${fuente(n.argument, codigo)}` : 'Terminar la función'
    case 'BreakStatement':
      return 'Cortar la repetición'
    case 'ContinueStatement':
      return 'Saltar a la próxima vuelta'
    default:
      return acortar(fuente(n, codigo))
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
    lineas.push(`${sangria}${primero ? 'SI' : 'SINO SI'} ${fuente(actual.test, codigo)} ENTONCES`)
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

function pseudoBloque(stmts: Nodo[], codigo: string, nivel: number): string[] {
  const sangria = '    '.repeat(nivel)
  const lineas: string[] = []
  for (const s of stmts) {
    if (s.type === 'IfStatement') {
      pseudoIf(s, codigo, nivel, lineas)
    } else if (s.type === 'ForOfStatement' || s.type === 'ForStatement' || s.type === 'WhileStatement') {
      const { cabecera, cierre } = descripcionBucle(s, codigo)
      lineas.push(`${sangria}${cabecera}`)
      lineas.push(...pseudoBloque(cuerpoDe(s.body), codigo, nivel + 1))
      lineas.push(`${sangria}${cierre}`)
    } else if (s.type === 'FunctionDeclaration') {
      const params = (s.params as Nodo[]).map((p) => fuente(p, codigo)).join(', ')
      lineas.push(`${sangria}FUNCIÓN ${s.id.name}(${params})`)
      lineas.push(...pseudoBloque(cuerpoDe(s.body), codigo, nivel + 1))
      lineas.push(`${sangria}FIN FUNCIÓN`)
    } else {
      lineas.push(`${sangria}${textoSentencia(s, codigo)}`)
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

  function escaparTexto(t: string): string {
    return acortar(t).replace(/"/g, "'")
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
    return { ok: false, mermaid: '', pseudocodigo: '', error: 'Escribí algo de código para ver acá su diagrama de flujo.' }
  }
  // El estudiante escribe pseudocódigo (SI/PARA CADA/MIENTRAS/FUNCIÓN — pseudocodigoAJS.ts);
  // acá hace falta JS real para poder parsearlo con acorn. Un pseudocódigo mal cerrado (falta
  // un FIN SI, etc.) es el mismo tipo de error que un paréntesis sin cerrar en JS: se muestra
  // igual, con su propio mensaje.
  const traduccion = aJavaScript(codigoEstudiante)
  if (!traduccion.ok) {
    return { ok: false, mermaid: '', pseudocodigo: '', error: traduccion.error?.mensaje ?? 'Hay un error en tu código.' }
  }
  const codigo = traduccion.js
  let programa: Nodo
  try {
    programa = parse(codigo, { ecmaVersion: 2023, sourceType: 'script' }) as unknown as Nodo
  } catch {
    return {
      ok: false,
      mermaid: '',
      pseudocodigo: '',
      error: 'Tu código tiene un error de sintaxis. Corregilo para ver el diagrama.',
    }
  }
  if (programa.body.length === 0) {
    return { ok: false, mermaid: '', pseudocodigo: '', error: 'Escribí algo de código para ver acá su diagrama de flujo.' }
  }
  return {
    ok: true,
    mermaid: generarMermaid(programa, codigo),
    pseudocodigo: generarPseudocodigo(programa, codigo),
  }
}
