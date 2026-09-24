// Lógica pura de la cuadrícula visual de Ju1 (ver plan "Cuadrícula visual + pestañas por
// sección"). Sin React ni DOM acá — la herramienta visual (features/estructura/) es una
// capa fina sobre estas funciones, así que las reglas (qué selección es válida, cómo se
// saneia un nombre de sección) se pueden probar solas, sin montar ningún componente.
//
// Invariante que mantienen TODAS las funciones de acá: `celdas` siempre tiene una cobertura
// completa y sin superposiciones del rectángulo filas×columnas — cada posición (f, c) de la
// cuadrícula pertenece a EXACTAMENTE una celda (1x1, o combinada más grande).
import type { Celda, DocumentoJu1, EstructuraDePagina } from './tipos'

let idSeq = 0
function nuevoId(): string {
  idSeq += 1
  return `celda-${idSeq}`
}

function celdaVacia(fila: number, columna: number): Celda {
  return { id: nuevoId(), fila, columna, expandeFilas: 1, expandeColumnas: 1, seccion: null }
}

export function crearEstructuraInicial(): EstructuraDePagina {
  return { filas: 1, columnas: 1, celdas: [celdaVacia(0, 0)] }
}

export function agregarFila(estructura: EstructuraDePagina): EstructuraDePagina {
  const fila = estructura.filas
  const nuevas = Array.from({ length: estructura.columnas }, (_, columna) => celdaVacia(fila, columna))
  return { ...estructura, filas: fila + 1, celdas: [...estructura.celdas, ...nuevas] }
}

export function agregarColumna(estructura: EstructuraDePagina): EstructuraDePagina {
  const columna = estructura.columnas
  const nuevas = Array.from({ length: estructura.filas }, (_, fila) => celdaVacia(fila, columna))
  return { ...estructura, columnas: columna + 1, celdas: [...estructura.celdas, ...nuevas] }
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string }

export function eliminarFila(estructura: EstructuraDePagina): Resultado<EstructuraDePagina> {
  if (estructura.filas <= 1) return { ok: false, error: 'Tiene que quedar al menos una fila.' }
  const ultima = estructura.filas - 1
  const invade = estructura.celdas.some((c) => c.fila < ultima && c.fila + c.expandeFilas - 1 >= ultima)
  if (invade) {
    return { ok: false, error: 'Una sección combinada ocupa parte de la última fila — separala antes de quitarla.' }
  }
  return {
    ok: true,
    valor: { ...estructura, filas: ultima, celdas: estructura.celdas.filter((c) => c.fila < ultima) },
  }
}

export function eliminarColumna(estructura: EstructuraDePagina): Resultado<EstructuraDePagina> {
  if (estructura.columnas <= 1) return { ok: false, error: 'Tiene que quedar al menos una columna.' }
  const ultima = estructura.columnas - 1
  const invade = estructura.celdas.some((c) => c.columna < ultima && c.columna + c.expandeColumnas - 1 >= ultima)
  if (invade) {
    return { ok: false, error: 'Una sección combinada ocupa parte de la última columna — separala antes de quitarla.' }
  }
  return {
    ok: true,
    valor: { ...estructura, columnas: ultima, celdas: estructura.celdas.filter((c) => c.columna < ultima) },
  }
}

/** Las celdas que ocupan el rectángulo (filaMin..filaMax, columnaMin..columnaMax) — cada una
 *  ENTERA adentro, nunca una que se salga (eso es lo que corta una sección ya combinada más
 *  grande que la selección). Lo comparten combinarCeldas() y extenderSeccion(): la única
 *  diferencia entre "crear una sección nueva" y "agrandar una que ya existe" es qué celdas con
 *  `seccion` ya puesto se aceptan, no cómo se valida el rectángulo en sí. */
function celdasDelRectangulo(
  estructura: EstructuraDePagina,
  filaMin: number,
  filaMax: number,
  columnaMin: number,
  columnaMax: number,
): Resultado<Celda[]> {
  const cubiertas: Celda[] = []
  for (const c of estructura.celdas) {
    const cFilaMax = c.fila + c.expandeFilas - 1
    const cColumnaMax = c.columna + c.expandeColumnas - 1
    const seSuperpone = c.fila <= filaMax && cFilaMax >= filaMin && c.columna <= columnaMax && cColumnaMax >= columnaMin
    if (!seSuperpone) continue
    const contenidaDelTodo = c.fila >= filaMin && cFilaMax <= filaMax && c.columna >= columnaMin && cColumnaMax <= columnaMax
    if (!contenidaDelTodo) {
      return { ok: false, error: 'La selección corta una sección ya combinada — elegí un rectángulo completo.' }
    }
    cubiertas.push(c)
  }
  // Defensivo: por el invariante del módulo esto siempre debería dar exacto, sin huecos.
  const areaSeleccion = (filaMax - filaMin + 1) * (columnaMax - columnaMin + 1)
  const areaCubierta = cubiertas.reduce((total, c) => total + c.expandeFilas * c.expandeColumnas, 0)
  if (areaCubierta !== areaSeleccion) {
    return { ok: false, error: 'La selección no forma un rectángulo completo.' }
  }
  return { ok: true, valor: cubiertas }
}

function celdaCombinada(filaMin: number, columnaMin: number, filaMax: number, columnaMax: number, seccion: string | null): Celda {
  return {
    id: nuevoId(),
    fila: filaMin,
    columna: columnaMin,
    expandeFilas: filaMax - filaMin + 1,
    expandeColumnas: columnaMax - columnaMin + 1,
    seccion,
  }
}

/** Combina el rectángulo entre (filaInicio, columnaInicio) y (filaFin, columnaFin), inclusive,
 *  en una sola celda VACÍA — como "combinar celdas" en una planilla: rechaza cualquier
 *  selección que no sea un rectángulo completo, así nunca se llega a una cuadrícula inválida.
 *  Si alguna celda de la selección ya tiene sección, rechaza (para eso está extenderSeccion:
 *  agrandar una sección ya nombrada es un caso distinto de crear una nueva). */
export function combinarCeldas(
  estructura: EstructuraDePagina,
  filaInicio: number,
  columnaInicio: number,
  filaFin: number,
  columnaFin: number,
): Resultado<EstructuraDePagina> {
  const filaMin = Math.min(filaInicio, filaFin)
  const filaMax = Math.max(filaInicio, filaFin)
  const columnaMin = Math.min(columnaInicio, columnaFin)
  const columnaMax = Math.max(columnaInicio, columnaFin)

  if (filaMin === filaMax && columnaMin === columnaMax) {
    return { ok: false, error: 'Seleccioná más de una celda para combinar.' }
  }

  const r = celdasDelRectangulo(estructura, filaMin, filaMax, columnaMin, columnaMax)
  if (!r.ok) return r
  if (r.valor.some((c) => c.seccion !== null)) {
    return { ok: false, error: 'Separá primero las secciones ya nombradas antes de combinarlas de nuevo.' }
  }

  const idsCubiertas = new Set(r.valor.map((c) => c.id))
  const combinada = celdaCombinada(filaMin, columnaMin, filaMax, columnaMax, null)
  return {
    ok: true,
    valor: { ...estructura, celdas: [...estructura.celdas.filter((c) => !idsCubiertas.has(c.id)), combinada] },
  }
}

/** Agranda una sección YA nombrada (`celdaId`) para que también ocupe el resto del rectángulo —
 *  a diferencia de combinarCeldas()/crearSeccion(), conserva el nombre de la sección (y por lo
 *  tanto su pestaña y su código) tal cual: no hace falta separar y volver a escribir nada para
 *  agrandar algo que ya se armó, solo para cambiarle la forma desde cero. */
export function extenderSeccion(
  doc: DocumentoJu1,
  celdaId: string,
  filaInicio: number,
  columnaInicio: number,
  filaFin: number,
  columnaFin: number,
): Resultado<DocumentoJu1> {
  const celda = doc.estructura.celdas.find((c) => c.id === celdaId)
  if (!celda || celda.seccion === null) return { ok: false, error: 'Esa sección ya no existe.' }

  const filaMin = Math.min(filaInicio, filaFin)
  const filaMax = Math.max(filaInicio, filaFin)
  const columnaMin = Math.min(columnaInicio, columnaFin)
  const columnaMax = Math.max(columnaInicio, columnaFin)

  const r = celdasDelRectangulo(doc.estructura, filaMin, filaMax, columnaMin, columnaMax)
  if (!r.ok) return r
  if (r.valor.some((c) => c.id !== celdaId && c.seccion !== null)) {
    return { ok: false, error: 'No se pueden juntar dos secciones ya nombradas — separá una primero.' }
  }

  const idsCubiertas = new Set(r.valor.map((c) => c.id))
  const combinada = celdaCombinada(filaMin, columnaMin, filaMax, columnaMax, celda.seccion)
  return {
    ok: true,
    valor: {
      ...doc,
      estructura: { ...doc.estructura, celdas: [...doc.estructura.celdas.filter((c) => !idsCubiertas.has(c.id)), combinada] },
    },
  }
}

/** Deshace una combinación: la celda vuelve a ser sus 1x1 originales, vacías (se pierde el
 *  contenido que tuviera esa sección — se avisa en la UI antes de llamar a esto). */
export function separarCelda(estructura: EstructuraDePagina, celdaId: string): EstructuraDePagina {
  const celda = estructura.celdas.find((c) => c.id === celdaId)
  if (!celda || (celda.expandeFilas === 1 && celda.expandeColumnas === 1)) return estructura
  const nuevas: Celda[] = []
  for (let f = celda.fila; f < celda.fila + celda.expandeFilas; f++) {
    for (let c = celda.columna; c < celda.columna + celda.expandeColumnas; c++) {
      nuevas.push(celdaVacia(f, c))
    }
  }
  return { ...estructura, celdas: [...estructura.celdas.filter((c) => c.id !== celdaId), ...nuevas] }
}

const PALABRAS_RESERVADAS = new Set([
  'datos', 'const', 'let', 'var', 'function', 'if', 'else', 'for', 'while', 'return',
  'true', 'false', 'null', 'undefined', 'class', 'new', 'this', 'mostrar', 'agregarA',
])

/** Convierte la etiqueta que escribe el estudiante ("Sobre mí") en un identificador JS válido
 *  y sin choques ("sobreMi") — es el nombre con el que esa sección va a estar disponible
 *  adentro de portafolio.js, igual que `datos` sale de datos.js. */
export function sanearNombreDeSeccion(etiqueta: string, existentes: string[]): string {
  const sinTildes = etiqueta.normalize('NFD').replace(/[̀-ͯ]/g, '')
  // "SobreMi" (sin espacio, ya en PascalCase) tiene que separarse en palabras IGUAL que "Sobre
  // mí" — si no, al no haber ningún separador se trataba como una sola palabra y se perdía la
  // mayúscula interna (quedaba "sobremi", que ya no es el mismo identificador que el código
  // de la sección espera). Se inserta un separador antes de cada mayúscula que sigue a una
  // minúscula o dígito, y de ahí en más el split de siempre hace el resto.
  const conSeparadores = sinTildes.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  const palabras = conSeparadores.split(/[^a-zA-Z0-9]+/).filter(Boolean)
  let base = palabras
    .map((p, i) => (i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
    .join('')
  if (!base) base = 'seccion'
  else if (/^[0-9]/.test(base)) base = `seccion${base.charAt(0).toUpperCase()}${base.slice(1)}`
  if (PALABRAS_RESERVADAS.has(base)) base = `${base}Seccion`

  if (!existentes.includes(base)) return base
  let sufijo = 2
  while (existentes.includes(`${base}${sufijo}`)) sufijo += 1
  return `${base}${sufijo}`
}

export function crearDocumentoJu1Inicial(): DocumentoJu1 {
  return { version: 1, estructura: crearEstructuraInicial(), secciones: [], main: '' }
}

export function serializarDocumentoJu1(doc: DocumentoJu1): string {
  return JSON.stringify(doc)
}

/** Etiqueta una celda (le pone nombre a la sección) y le abre su pestaña de código, vacía. El
 *  nombre real puede diferir de `etiqueta` si hace falta sanearlo o ya existe otra sección con
 *  ese nombre — devuelve el documento con todo ya consistente (estructura + secciones). */
export function etiquetarCelda(doc: DocumentoJu1, celdaId: string, etiqueta: string): DocumentoJu1 {
  const celda = doc.estructura.celdas.find((c) => c.id === celdaId)
  if (!celda || celda.seccion !== null) return doc
  const nombre = sanearNombreDeSeccion(etiqueta, doc.secciones.map((s) => s.nombre))
  return {
    ...doc,
    estructura: {
      ...doc.estructura,
      celdas: doc.estructura.celdas.map((c) => (c.id === celdaId ? { ...c, seccion: nombre } : c)),
    },
    secciones: [...doc.secciones, { nombre, contenido: '' }],
  }
}

/** Convierte el rectángulo entre las dos esquinas en una sección con ese nombre — si ya es una
 *  sola celda (las dos esquinas coinciden) la etiqueta directo, sin pasar por combinarCeldas().
 *  Esto es lo que respalda el botón "Crear sección" de la herramienta visual (EditorEstructura). */
export function crearSeccion(
  doc: DocumentoJu1,
  filaInicio: number,
  columnaInicio: number,
  filaFin: number,
  columnaFin: number,
  etiqueta: string,
): Resultado<DocumentoJu1> {
  if (filaInicio === filaFin && columnaInicio === columnaFin) {
    const celda = doc.estructura.celdas.find((c) => c.fila === filaInicio && c.columna === columnaInicio)
    if (!celda) return { ok: false, error: 'Esa celda ya no existe.' }
    return { ok: true, valor: etiquetarCelda(doc, celda.id, etiqueta) }
  }
  const combinado = combinarCeldas(doc.estructura, filaInicio, columnaInicio, filaFin, columnaFin)
  if (!combinado.ok) return combinado
  const filaMin = Math.min(filaInicio, filaFin)
  const columnaMin = Math.min(columnaInicio, columnaFin)
  const nueva = combinado.valor.celdas.find((c) => c.fila === filaMin && c.columna === columnaMin)!
  return { ok: true, valor: etiquetarCelda({ ...doc, estructura: combinado.valor }, nueva.id, etiqueta) }
}

/** Deshace la combinación de una celda Y borra la pestaña de esa sección si tenía una (se
 *  pierde su contenido — la UI avisa antes de llegar acá). */
export function separarCeldaDelDocumento(doc: DocumentoJu1, celdaId: string): DocumentoJu1 {
  const celda = doc.estructura.celdas.find((c) => c.id === celdaId)
  if (!celda) return doc
  return {
    ...doc,
    estructura: separarCelda(doc.estructura, celdaId),
    secciones: celda.seccion ? doc.secciones.filter((s) => s.nombre !== celda.seccion) : doc.secciones,
  }
}

export function actualizarContenidoDeSeccion(doc: DocumentoJu1, nombre: string, contenido: string): DocumentoJu1 {
  return { ...doc, secciones: doc.secciones.map((s) => (s.nombre === nombre ? { ...s, contenido } : s)) }
}

export function actualizarMain(doc: DocumentoJu1, main: string): DocumentoJu1 {
  return { ...doc, main }
}

/** Nunca falla: un texto que no es un DocumentoJu1 (un borrador de antes de este cambio, o
 *  cualquier cosa irreconocible) se trata como el "main" de un documento nuevo — migración
 *  silenciosa en vez de perder lo que el estudiante ya tenía escrito. */
export function parsearDocumentoJu1(texto: string): DocumentoJu1 {
  if (texto) {
    try {
      const datos: unknown = JSON.parse(texto)
      if (
        datos && typeof datos === 'object' && (datos as { version?: unknown }).version === 1 &&
        (datos as { estructura?: unknown }).estructura && Array.isArray((datos as { secciones?: unknown }).secciones)
      ) {
        return datos as DocumentoJu1
      }
    } catch {
      /* no era JSON: es texto de portafolio.js de antes de este cambio */
    }
  }
  return { ...crearDocumentoJu1Inicial(), main: texto }
}
