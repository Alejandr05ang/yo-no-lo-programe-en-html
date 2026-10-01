// Traduce el código del taller (crearTitulo(), mostrar(), cadaSegundo()…) a JavaScript "de
// verdad" para el repositorio descargable. Una página real reparte el trabajo así:
//   - index.html: lo que se VE (el contenido ya construido, lo genera repositorio.ts);
//   - script.js: la LÓGICA que sigue viva (carruseles, temporizadores, eventos);
//   - styles.css: el diseño.
// Por eso acá NO se reconstruye la página: solo se extrae del programa lo que sigue pasando
// después de que carga (las "raíces dinámicas") y todo lo que ese comportamiento necesita.
// El resto (mostrar(titulo), cambiarColorTexto(...) sueltos) ya está reflejado en el HTML/CSS.
//
// Las funciones del taller dejan de existir: cada llamada se reescribe con la API del
// navegador (document.createElement, appendChild, style.color, setInterval…).
import { parse } from 'acorn'

export interface UnidadCodigo {
  nombre: string
  /** JavaScript (ya sin pseudocódigo). */
  js: string
  tipo: 'unico' | 'seccion' | 'main'
  /** Solo en secciones de la cuadrícula: el nombre de la sección. */
  seccion?: string
}

export interface ResultadoLogica {
  hayLogica: boolean
  /** Código de cada unidad con `id`s puestos a los elementos que la lógica necesita, para
   *  volver a correr el programa y que esos ids aparezcan en el HTML. */
  ejecutables: Map<string, string>
  /** Cuerpo de script.js (sin `datos`). */
  script: string
  usaDatos: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Nodo = any

const CREADORES: Record<string, string> = {
  crearTitulo: 'h1', crearSubtitulo: 'h2', crearParrafo: 'p', crearItem: 'li', crearBoton: 'button',
}
const CREADORES_ELEMENTO = new Set([
  ...Object.keys(CREADORES), 'crearSalto', 'crearLista', 'crearCarrusel', 'crearEnlace', 'crearImagen', 'crearSeccion',
])
const SECCIONES_CLASE: Record<string, string> = {
  encabezado: 'fila', cuerpo: 'card', 'cuadricula-2': 'grid grid-2', 'cuadricula-3': 'grid grid-3',
}
const TAMANOS: Record<string, string> = { 'pequeño': '0.85em', normal: '1em', grande: '1.3em', 'muy grande': '1.8em' }
const FUENTES: Record<string, string> = {
  'clásica': '"Lora", Georgia, serif',
  elegante: '"Cormorant Garamond", Georgia, serif',
  moderna: '"Inter", Arial, sans-serif',
  manuscrita: '"Caveat", cursive',
}
const ALINEACIONES: Record<string, string> = { izquierda: 'left', centro: 'center', derecha: 'right', justificado: 'justify' }

const comillas = (valor: string) => `'${valor.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

/** Hijos AST en el orden del código fuente. Se saltan los nombres que no son variables
 *  (la propiedad de `a.b`, la clave de `{ b: 1 }`) para no confundirlos con identificadores. */
function hijos(nodo: Nodo): Nodo[] {
  const salida: Nodo[] = []
  for (const [clave, valor] of Object.entries(nodo)) {
    if (clave === 'type' || clave === 'start' || clave === 'end') continue
    if (nodo.type === 'MemberExpression' && clave === 'property' && !nodo.computed) continue
    if ((nodo.type === 'Property' || nodo.type === 'MethodDefinition' || nodo.type === 'PropertyDefinition') && clave === 'key' && !nodo.computed) continue
    for (const v of Array.isArray(valor) ? valor : [valor]) {
      if (v && typeof v === 'object' && typeof (v as Nodo).type === 'string') salida.push(v)
    }
  }
  return salida.sort((a, b) => a.start - b.start)
}

function recorrer(nodo: Nodo, visita: (n: Nodo) => void): void {
  visita(nodo)
  for (const h of hijos(nodo)) recorrer(h, visita)
}

function identificadores(nodo: Nodo): Set<string> {
  const nombres = new Set<string>()
  recorrer(nodo, (n) => { if (n.type === 'Identifier') nombres.add(n.name) })
  return nombres
}

function esLlamadaA(n: Nodo, nombres: ReadonlySet<string> | string): boolean {
  if (n.type !== 'CallExpression' || n.callee.type !== 'Identifier') return false
  return typeof nombres === 'string' ? n.callee.name === nombres : nombres.has(n.callee.name)
}

/** ¿Algo de adentro sigue ocurriendo DESPUÉS de cargar la página? */
function esRaizDinamica(nodo: Nodo): boolean {
  let hay = false
  recorrer(nodo, (n) => {
    if (n.type === 'CallExpression') {
      if (n.callee.type === 'Identifier' && ['cadaSegundo', 'setInterval', 'setTimeout', 'requestAnimationFrame'].includes(n.callee.name)) hay = true
      if (n.callee.type === 'MemberExpression' && !n.callee.computed && n.callee.property.name === 'addEventListener') hay = true
    }
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && !n.left.computed && /^on[a-z]+$/.test(n.left.property.name ?? '')) hay = true
  })
  return hay
}

interface Contexto {
  src: string
  /** Nombres ya usados en el código del estudiante y los que se generan (para no chocar). */
  nombres: Set<string>
  contenedor: string
  fondo: (color: string) => string
}

function llamadaTraducida(n: Nodo, ctx: Contexto): string | null {
  if (!esLlamadaA(n, new Set([...CREADORES_ELEMENTO, 'mostrar', 'agregarA', 'vaciar', 'proyectosDestacados', 'cadaSegundo',
    'cambiarTamano', 'cambiarFuente', 'cambiarColorTexto', 'cambiarAlineacion', 'cambiarColorFondo']))) return null
  const nombre: string = n.callee.name
  const nodos: Nodo[] = n.arguments
  const a = nodos.map((x) => texto(x, ctx, n))
  const arg = (i: number) => a[i] ?? 'undefined'
  const literal = (i: number): string | null => (nodos[i]?.type === 'Literal' && typeof nodos[i].value === 'string' ? nodos[i].value : null)
  const crear = (tag: string, propiedades?: string) =>
    propiedades ? `Object.assign(document.createElement('${tag}'), { ${propiedades} })` : `document.createElement('${tag}')`
  const mapa = (tabla: Record<string, string>, i: number, defecto: string) => {
    const valor = literal(i)
    if (valor !== null) return comillas(tabla[valor] ?? defecto)
    return `${JSON.stringify(tabla).replace(/"/g, "'")}[${arg(i)}] ?? ${comillas(defecto)}`
  }

  if (nombre in CREADORES) return crear(CREADORES[nombre]!, `textContent: ${arg(0)}`)
  switch (nombre) {
    case 'crearSalto': return crear('div', "className: 'salto'")
    case 'crearLista': return crear('ul')
    case 'crearCarrusel': return crear('section')
    case 'crearEnlace': return crear('a', `textContent: ${arg(0)}, href: ${arg(1)}`)
    case 'crearImagen': return crear('img', `src: ${arg(0)}, alt: ${arg(1)}`)
    case 'crearSeccion': {
      const tipo = literal(0)
      return tipo !== null ? crear('div', `className: ${comillas(SECCIONES_CLASE[tipo] ?? '')}`) : crear('div')
    }
    case 'mostrar': return `${ctx.contenedor}.appendChild(${arg(0)})`
    case 'agregarA': return `${arg(0)}.appendChild(${arg(1)})`
    case 'vaciar': return `${arg(0)}.replaceChildren()`
    case 'proyectosDestacados': return `${arg(0)}.filter((proyecto) => proyecto.destacado === true)`
    case 'cambiarTamano': return `${arg(0)}.style.fontSize = ${mapa(TAMANOS, 1, '1em')}`
    case 'cambiarFuente': return `${arg(0)}.style.fontFamily = ${mapa(FUENTES, 1, FUENTES['clásica']!)}`
    case 'cambiarAlineacion': return `${arg(0)}.style.textAlign = ${mapa(ALINEACIONES, 1, 'left')}`
    case 'cambiarColorTexto': return `${arg(0)}.style.color = ${arg(1)}`
    case 'cambiarColorFondo': return nodos.length >= 2 ? `${arg(0)}.style.backgroundColor = ${arg(1)}` : ctx.fondo(arg(0))
    case 'cadaSegundo': {
      if (nodos.length < 3) {
        return `(() => { const accion = ${arg(0)}; accion(); setInterval(accion, 1000); })()`
      }
      return `(() => {
  const destino = ${arg(0)};
  const elementos = ${arg(1)};
  const crearElemento = ${arg(2)};
  if (elementos.length === 0) {
    destino.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'Todavía no hay proyectos destacados.' }));
    return;
  }
  let indice = 0;
  const avanzar = () => {
    destino.replaceChildren(crearElemento(elementos[indice]));
    indice = (indice + 1) % elementos.length;
  };
  avanzar();
  setInterval(avanzar, 1000);
})()`
    }
  }
  return null
}

const NOMBRE_BASE: Record<string, string> = {
  h1: 'titulo', h2: 'subtitulo', p: 'parrafo', li: 'item', button: 'boton', ul: 'lista', section: 'carrusel', a: 'enlace', img: 'imagen', div: 'contenedor',
}

/** Propiedades (una por línea) de un elemento recién creado, o null si no es un crearX(). */
function creacion(n: Nodo, ctx: Contexto): { tag: string; propiedades: [string, string][] } | null {
  if (!esLlamadaA(n, CREADORES_ELEMENTO)) return null
  const nombre: string = n.callee.name
  const a = (n.arguments as Nodo[]).map((x) => texto(x, ctx, n))
  const arg = (i: number) => a[i] ?? 'undefined'
  if (nombre in CREADORES) return { tag: CREADORES[nombre]!, propiedades: [['textContent', arg(0)]] }
  switch (nombre) {
    case 'crearSalto': return { tag: 'div', propiedades: [['className', "'salto'"]] }
    case 'crearLista': return { tag: 'ul', propiedades: [] }
    case 'crearCarrusel': return { tag: 'section', propiedades: [] }
    case 'crearEnlace': return { tag: 'a', propiedades: [['textContent', arg(0)], ['href', arg(1)]] }
    case 'crearImagen': return { tag: 'img', propiedades: [['src', arg(0)], ['alt', arg(1)]] }
    case 'crearSeccion': {
      const tipo = n.arguments[0]?.type === 'Literal' && typeof n.arguments[0].value === 'string' ? n.arguments[0].value : null
      return { tag: 'div', propiedades: tipo !== null && SECCIONES_CLASE[tipo] ? [['className', comillas(SECCIONES_CLASE[tipo]!)]] : [] }
    }
  }
  return null
}

function nombreNuevo(ctx: Contexto, tag: string): string {
  const base = NOMBRE_BASE[tag] ?? tag
  let nombre = base
  for (let i = 2; ctx.nombres.has(nombre); i++) nombre = `${base}${i}`
  ctx.nombres.add(nombre)
  return nombre
}

/** `const x = document.createElement('img'); x.src = …; x.alt = …;` — una instrucción por línea. */
function comoInstrucciones(variable: string, c: { tag: string; propiedades: [string, string][] }, declarar: string): string[] {
  return [`${declarar} ${variable} = document.createElement('${c.tag}');`, ...c.propiedades.map(([k, v]) => `${variable}.${k} = ${v};`)]
}

/** Espacios con los que empieza la línea donde está el nodo: lo que se genera se alinea con eso. */
function sangriaDe(nodo: Nodo, ctx: Contexto): string {
  const inicio = ctx.src.lastIndexOf('\n', nodo.start - 1) + 1
  return /^[ \t]*/.exec(ctx.src.slice(inicio))![0]
}

const esCuerpoDeInstrucciones = (padre: Nodo | null) => !padre || ['Program', 'BlockStatement', 'SwitchCase', 'StaticBlock'].includes(padre.type)

/** Reescribe un nodo conservando el resto del código tal cual lo escribió el estudiante. */
function texto(nodo: Nodo, ctx: Contexto, padre: Nodo | null = null): string {
  // const x = crearImagen(...)  →  const x = document.createElement('img'); x.src = …
  if (nodo.type === 'VariableDeclaration' && esCuerpoDeInstrucciones(padre)) {
    const d = nodo.declarations.length === 1 ? nodo.declarations[0] : null
    const c = d && d.id.type === 'Identifier' && d.init ? creacion(d.init, ctx) : null
    if (c) return comoInstrucciones(d.id.name, c, nodo.kind).join('\n' + sangriaDe(nodo, ctx))
  }
  // agregarA(lista, crearItem(x)) / mostrar(crearParrafo(x))  →  crear, configurar y agregar.
  if (nodo.type === 'ExpressionStatement' && esCuerpoDeInstrucciones(padre) && esLlamadaA(nodo.expression, new Set(['agregarA', 'mostrar']))) {
    const llamada = nodo.expression
    const esAgregar = llamada.callee.name === 'agregarA'
    const c = creacion(llamada.arguments[esAgregar ? 1 : 0] ?? {}, ctx)
    if (c) {
      const variable = nombreNuevo(ctx, c.tag)
      const destino = esAgregar ? texto(llamada.arguments[0], ctx, llamada) : ctx.contenedor
      return [...comoInstrucciones(variable, c, 'const'), `${destino}.appendChild(${variable});`].join('\n' + sangriaDe(nodo, ctx))
    }
  }
  // cadaSegundo(carrusel, lista, funcion)  →  el ciclo con setInterval, escrito a mano.
  if (nodo.type === 'ExpressionStatement' && esCuerpoDeInstrucciones(padre) && esLlamadaA(nodo.expression, 'cadaSegundo') && nodo.expression.arguments.length >= 3) {
    const sangria = sangriaDe(nodo, ctx)
    const antes: string[] = []
    const [d, l, f] = (nodo.expression.arguments as Nodo[]).map((x, i) => {
      const t = texto(x, ctx, nodo.expression)
      if (x.type === 'Identifier' || (x.type === 'MemberExpression' && !x.computed)) return t
      const unico = nombreNuevo(ctx, ['destino', 'elementos', 'crearElemento'][i]!)
      antes.push(`const ${unico} = ${t};`)
      return unico
    })
    const indice = nombreNuevo(ctx, 'indice')
    const avanzar = nombreNuevo(ctx, 'avanzar')
    const lineas = [
      ...antes,
      `if (${l}.length === 0) {`,
      `  ${d}.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'Todavía no hay proyectos destacados.' }));`,
      '} else {',
      `  let ${indice} = 0;`,
      `  const ${avanzar} = () => {`,
      `    ${d}.replaceChildren(${f}(${l}[${indice}]));`,
      `    ${indice} = (${indice} + 1) % ${l}.length;`,
      '  };',
      `  ${avanzar}();`,
      `  setInterval(${avanzar}, 1000);`,
      '}',
    ]
    return lineas.join('\n' + sangria)
  }
  // proyecto => crearImagen(...)  →  proyecto => { const imagen = …; return imagen; }
  if (nodo.type === 'ArrowFunctionExpression' && nodo.expression) {
    const c = creacion(nodo.body, ctx)
    if (c) {
      const variable = nombreNuevo(ctx, c.tag)
      const parametros = ctx.src.slice(nodo.start, nodo.body.start).replace(/\s*=>\s*$/, '')
      const sangria = sangriaDe(nodo, ctx)
      return `${parametros} => {\n${[...comoInstrucciones(variable, c, 'const'), `return ${variable};`].map((l) => `${sangria}  ${l}`).join('\n')}\n${sangria}}`
    }
  }
  // Un nombre del taller pasado como valor (lista.map(crearParrafo)) → su función real.
  if (nodo.type === 'Identifier' && padre && !(padre.type === 'CallExpression' && padre.callee === nodo) && nodo.name in CREADORES) {
    return `(texto) => Object.assign(document.createElement('${CREADORES[nodo.name]}'), { textContent: texto })`
  }
  const traducida = llamadaTraducida(nodo, ctx)
  if (traducida !== null) return traducida
  let salida = ''
  let cursor = nodo.start
  for (const h of hijos(nodo)) {
    if (h.start < cursor) continue
    salida += ctx.src.slice(cursor, h.start) + texto(h, ctx, nodo)
    cursor = h.end
  }
  return salida + ctx.src.slice(cursor, nodo.end)
}

const slug = (nombre: string) => nombre.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9-]+/g, '-')

function declarados(sentencia: Nodo): string[] {
  if (sentencia.type === 'FunctionDeclaration') return [sentencia.id.name]
  if (sentencia.type === 'VariableDeclaration') return sentencia.declarations.flatMap((d: Nodo) => (d.id.type === 'Identifier' ? [d.id.name] : []))
  return []
}

interface Analizada {
  unidad: UnidadCodigo
  ast: Nodo
  conservadas: Nodo[]
  /** Declaraciones de elementos creados con crearX(): en script.js se buscan por id. */
  elementos: Map<Nodo, string>
}

function analizar(unidad: UnidadCodigo): Analizada | null {
  let ast: Nodo
  try { ast = parse(unidad.js, { ecmaVersion: 'latest', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true }) } catch { return null }
  const sentencias: Nodo[] = ast.body
  const conservadas = new Set<Nodo>(sentencias.filter((s) => !['VariableDeclaration', 'FunctionDeclaration'].includes(s.type) && esRaizDinamica(s)))
  // Una declaración con una raíz dinámica adentro (p. ej. una función con un temporizador) también cuenta.
  for (const s of sentencias) if (declarados(s).length && esRaizDinamica(s) && s.type === 'VariableDeclaration') conservadas.add(s)

  // Cierre: se conserva todo lo que el comportamiento nombra (variables, funciones, y a su vez lo que ellas nombran).
  const porNombre = new Map<string, Nodo>()
  for (const s of sentencias) for (const nombre of declarados(s)) porNombre.set(nombre, s)
  const pendientes = [...conservadas]
  while (pendientes.length) {
    for (const nombre of identificadores(pendientes.pop()!)) {
      const declaracion = porNombre.get(nombre)
      if (declaracion && !conservadas.has(declaracion)) { conservadas.add(declaracion); pendientes.push(declaracion) }
    }
  }

  const elementos = new Map<Nodo, string>()
  for (const s of sentencias) {
    if (!conservadas.has(s) || s.type !== 'VariableDeclaration') continue
    for (const d of s.declarations) {
      if (d.id.type === 'Identifier' && d.init && esLlamadaA(d.init, CREADORES_ELEMENTO)) elementos.set(d, d.id.name)
    }
  }
  return { unidad, ast, conservadas: sentencias.filter((s) => conservadas.has(s)), elementos }
}

export function extraerLogica(unidades: UnidadCodigo[]): ResultadoLogica {
  const analizadas = unidades.map(analizar).filter((x): x is Analizada => x !== null && x.conservadas.length > 0)
  const vacio: ResultadoLogica = { hayLogica: false, ejecutables: new Map(), script: '', usaDatos: false }
  if (analizadas.length === 0) return vacio

  const idsUsados = new Set<string>()
  const idUnico = (base: string) => {
    let id = slug(base) || 'elemento'
    for (let n = 2; idsUsados.has(id); n++) id = `${slug(base)}-${n}`
    idsUsados.add(id)
    return id
  }

  // Secciones de la cuadrícula que el main usa por su nombre (necesitan id para encontrarlas).
  const main = analizadas.find((x) => x.unidad.tipo === 'main')
  const nombresDelMain = main ? new Set(main.conservadas.flatMap((s) => [...identificadores(s)])) : new Set<string>()
  const seccionesUsadas = unidades.flatMap((u) => (u.tipo === 'seccion' && u.seccion && nombresDelMain.has(u.seccion) ? [u.seccion] : []))

  const ejecutables = new Map<string, string>()
  const bloques: string[] = []
  let usaDatos = false

  for (const x of analizadas) {
    const { unidad } = x
    const idContenedor = unidad.tipo === 'seccion' ? `seccion-${unidad.seccion}` : null
    const contenedor = unidad.tipo === 'unico' ? 'document.body'
      : unidad.tipo === 'main' ? "document.querySelector('.tutorias-grid')"
        : `document.getElementById('${idContenedor}')`
    const ctx: Contexto = {
      src: unidad.js,
      nombres: identificadores(x.ast),
      contenedor,
      fondo: (color) => (unidad.tipo === 'unico' ? `document.documentElement.style.setProperty('--color-fondo', ${color})` : `${contenedor}.style.backgroundColor = ${color}`),
    }

    // Código para volver a correr el programa y que los elementos de la lógica traigan su id.
    const ids = new Map<Nodo, string>()
    for (const [declarador, nombre] of x.elementos) ids.set(declarador, idUnico(unidad.tipo === 'unico' || unidad.tipo === 'main' ? nombre : `${unidad.seccion}-${nombre}`))
    const inserciones = new Map<number, string>()
    for (const s of x.conservadas) {
      if (s.type !== 'VariableDeclaration') continue
      const extra = s.declarations.filter((d: Nodo) => ids.has(d)).map((d: Nodo) => `; ${d.id.name}.id = ${comillas(ids.get(d)!)};`).join('')
      if (extra) inserciones.set(s.end, extra)
    }
    let ejecutable = ''
    let cursor = 0
    for (const [pos, extra] of [...inserciones].sort((a, b) => a[0] - b[0])) { ejecutable += unidad.js.slice(cursor, pos) + extra; cursor = pos }
    ejecutable += unidad.js.slice(cursor)
    const necesitaContenedor = idContenedor && (seccionesUsadas.includes(unidad.seccion!) || x.conservadas.length > 0)
    ejecutables.set(unidad.nombre, (necesitaContenedor ? `pagina.id = ${comillas(idContenedor)}; ` : '') + ejecutable)

    // Código final de script.js para esta unidad.
    const lineas: string[] = []
    for (const s of x.conservadas) {
      if (s.type === 'VariableDeclaration') {
        for (const d of s.declarations) {
          const valor = ids.has(d) ? `document.getElementById(${comillas(ids.get(d)!)})` : d.init ? texto(d.init, ctx, d) : null
          lineas.push(`${s.kind} ${ctx.src.slice(d.id.start, d.id.end)}${valor !== null ? ` = ${valor}` : ''};`)
        }
      } else {
        lineas.push(texto(s, ctx, x.ast).replace(/([^;}\s])$/, '$1;'))
      }
    }
    const cuerpo = lineas.join('\n')
    if (/\bdatos\b/.test(cuerpo)) usaDatos = true
    bloques.push(`// ── ${unidad.nombre} ──\n{\n${cuerpo.split('\n').map((l) => (l ? `  ${l}` : l)).join('\n')}\n}`)
  }

  // Secciones que el main usa pero que no traen lógica propia: solo necesitan su id.
  for (const u of unidades) {
    if (u.tipo === 'seccion' && u.seccion && seccionesUsadas.includes(u.seccion) && !ejecutables.has(u.nombre)) {
      ejecutables.set(u.nombre, `pagina.id = ${comillas(`seccion-${u.seccion}`)}; ${u.js}`)
    }
  }

  const referencias = seccionesUsadas.map((s) => `const ${s} = document.getElementById('seccion-${s}');`)
  const script = [...(referencias.length ? [referencias.join('\n')] : []), ...bloques].join('\n\n')
  return { hayLogica: true, ejecutables, script, usaDatos }
}
