// Lógica pura de la cuadrícula visual de Ju1 (ver plan "Cuadrícula visual + pestañas por
// sección"). Sin React ni DOM acá — la herramienta visual (features/estructura/) es una
// capa fina sobre estas funciones, así que las reglas (qué selección es válida, cómo se
// saneia un nombre de sección) se pueden probar solas, sin montar ningún componente.
//
// Invariante que mantienen TODAS las funciones de acá: `celdas` siempre tiene una cobertura
// completa y sin superposiciones del rectángulo filas×columnas — cada posición (f, c) de la
// cuadrícula pertenece a EXACTAMENTE una celda (1x1, o combinada más grande).
import type { Celda, DocumentoJu1, EstructuraDePagina } from './tipos'

// Los ids se guardan con el documento: un contador que arranca en 0 en cada carga de la página
// repetía "celda-3" de una sesión anterior, y todas las operaciones que buscan por id (combinar,
// mover, etiquetar) tocaban DOS celdas — una sección podía desaparecer de la cuadrícula. Por eso
// el id lleva una parte aleatoria; el contador solo ordena los de una misma sesión.
let idSeq = 0
function nuevoId(): string {
  idSeq += 1
  const azar = Math.floor(Math.random() * 0xffffff).toString(36).padStart(4, '0')
  return `celda-${azar}${idSeq}`
}

/** Documentos guardados con ids repetidos (por el contador de antes): se les da un id nuevo a las
 *  repetidas para que ninguna operación vuelva a tocar dos celdas a la vez. */
function conIdsUnicos(doc: DocumentoJu1): DocumentoJu1 {
  const vistos = new Set<string>()
  let hubo = false
  const celdas = doc.estructura.celdas.map((c) => {
    if (!vistos.has(c.id)) { vistos.add(c.id); return c }
    hubo = true
    const id = nuevoId()
    vistos.add(id)
    return { ...c, id }
  })
  return hubo ? { ...doc, estructura: { ...doc.estructura, celdas } } : doc
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

/** Dónde cae una sección (celdaId) si se suelta con su esquina de arriba a la izquierda en
 *  (fila, columna): se corre lo justo para no salirse de la cuadrícula, así soltarla "cerca del
 *  borde" funciona sin apuntar al milímetro. null si la celda no existe o no es una sección. */
export function ubicarSeccion(
  estructura: EstructuraDePagina,
  celdaId: string,
  fila: number,
  columna: number,
): { fila: number; columna: number; expandeFilas: number; expandeColumnas: number } | null {
  const celda = estructura.celdas.find((c) => c.id === celdaId)
  if (!celda || celda.seccion === null) return null
  return {
    fila: Math.max(0, Math.min(fila, estructura.filas - celda.expandeFilas)),
    columna: Math.max(0, Math.min(columna, estructura.columnas - celda.expandeColumnas)),
    expandeFilas: celda.expandeFilas,
    expandeColumnas: celda.expandeColumnas,
  }
}

/** Mueve una sección (con su nombre, por lo tanto con su pestaña y su código) a otro lugar de la
 *  cuadrícula. Sirve para hacerle lugar a secciones nuevas en el medio: por ejemplo, bajar el pie
 *  a la última fila y dejar libre lo que ocupaba. Dos casos válidos:
 *  - el destino son solo celdas vacías (o parte de la misma sección): se mueve y lo que quedó
 *    libre vuelve a ser celdas vacías;
 *  - el destino es OTRA sección exactamente del mismo tamaño y en esa misma posición: se
 *    intercambian. Cualquier otra cosa se rechaza con el motivo, sin tocar nada. */
export function moverSeccion(
  estructura: EstructuraDePagina,
  celdaId: string,
  fila: number,
  columna: number,
): Resultado<EstructuraDePagina> {
  const origen = estructura.celdas.find((c) => c.id === celdaId)
  const destino = ubicarSeccion(estructura, celdaId, fila, columna)
  if (!origen || !destino) return { ok: false, error: 'Esa sección ya no existe.' }
  if (destino.fila === origen.fila && destino.columna === origen.columna) return { ok: true, valor: estructura }

  const filaFin = destino.fila + destino.expandeFilas - 1
  const columnaFin = destino.columna + destino.expandeColumnas - 1
  // La sección que se mueve no cuenta como obstáculo: su lugar de antes se trata como celdas
  // vacías, así un destino que se superpone con su propio lugar (bajarla una fila) es válido.
  const huecoPropio: Celda[] = []
  for (let f = origen.fila; f < origen.fila + origen.expandeFilas; f++) {
    for (let c = origen.columna; c < origen.columna + origen.expandeColumnas; c++) huecoPropio.push(celdaVacia(f, c))
  }
  const sinOrigen = { ...estructura, celdas: [...estructura.celdas.filter((c) => c.id !== celdaId), ...huecoPropio] }
  const otras = celdasDelRectangulo(sinOrigen, destino.fila, filaFin, destino.columna, columnaFin)
  if (!otras.ok) {
    return { ok: false, error: 'Ahí hay una sección de otro tamaño — mové o agrandá/separá esa primero.' }
  }

  // Intercambio: justo una sección, del mismo tamaño y en el mismo lugar que el destino.
  const nombradas = otras.valor.filter((c) => c.seccion !== null)
  if (nombradas.length > 0) {
    const otra = nombradas[0]!
    const mismoLugar =
      nombradas.length === 1 && otras.valor.length === 1 && otra.fila === destino.fila && otra.columna === destino.columna &&
      otra.expandeFilas === origen.expandeFilas && otra.expandeColumnas === origen.expandeColumnas
    if (!mismoLugar) {
      return { ok: false, error: 'Ahí hay una sección: solo se puede cambiar de lugar con otra del mismo tamaño.' }
    }
    return {
      ok: true,
      valor: {
        ...estructura,
        celdas: estructura.celdas.map((c) =>
          c.id === origen.id ? { ...c, fila: otra.fila, columna: otra.columna }
            : c.id === otra.id ? { ...c, fila: origen.fila, columna: origen.columna }
              : c),
      },
    }
  }

  const idsReales = new Set(estructura.celdas.map((c) => c.id))
  const ocupadas = new Set(otras.valor.map((c) => c.id).filter((id) => idsReales.has(id)))
  const movida: Celda = { ...origen, fila: destino.fila, columna: destino.columna }
  const liberadas: Celda[] = []
  for (let f = origen.fila; f < origen.fila + origen.expandeFilas; f++) {
    for (let c = origen.columna; c < origen.columna + origen.expandeColumnas; c++) {
      const dentroDelDestino = f >= destino.fila && f <= filaFin && c >= destino.columna && c <= columnaFin
      if (!dentroDelDestino) liberadas.push(celdaVacia(f, c))
    }
  }
  return {
    ok: true,
    valor: { ...estructura, celdas: [...estructura.celdas.filter((c) => c.id !== celdaId && !ocupadas.has(c.id)), movida, ...liberadas] },
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
  const conCelda = new Set(doc.estructura.celdas.flatMap((c) => (c.seccion ? [c.seccion] : [])))
  const existentes = doc.secciones.map((s) => s.nombre)
  // Si la etiqueta es justo el nombre de una sección que perdió su lugar en la cuadrícula, se
  // reconecta a ella (con su código) en vez de crear "nombre2" y dejar la pestaña vieja huérfana.
  const base = sanearNombreDeSeccion(etiqueta, existentes.filter((n) => conCelda.has(n)))
  if (existentes.includes(base)) {
    return {
      ...doc,
      estructura: { ...doc.estructura, celdas: doc.estructura.celdas.map((c) => (c.id === celdaId ? { ...c, seccion: base } : c)) },
    }
  }
  const nombre = sanearNombreDeSeccion(etiqueta, existentes)
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
  // Una celda 1x1 no se "separa" en nada (separarCelda la deja igual): hay que soltarle el nombre
  // a mano, si no la celda seguía diciendo "footer" sin que existiera su pestaña y la página
  // se rompía en el mostrar() del main.
  const estructura = celda.expandeFilas === 1 && celda.expandeColumnas === 1
    ? { ...doc.estructura, celdas: doc.estructura.celdas.map((c) => (c.id === celdaId ? { ...c, seccion: null } : c)) }
    : separarCelda(doc.estructura, celdaId)
  const sinCelda = { ...doc, estructura, secciones: celda.seccion ? doc.secciones.filter((s) => s.nombre !== celda.seccion) : doc.secciones }
  return celda.seccion ? { ...sinCelda, main: sinMostrarDe(sinCelda.main, [celda.seccion]) } : sinCelda
}

/** Quita del main las líneas "mostrar(nombre)" de secciones que ya no existen: si no, la página
 *  fallaba con "nombre is not defined" apenas se borraba una sección. */
export function sinMostrarDe(main: string, nombres: string[]): string {
  if (nombres.length === 0) return main
  const quitar = new Set(nombres)
  return main
    .split('\n')
    .filter((linea) => {
      const m = /^\s*mostrar\(\s*([^\s()]+)\s*\)\s*;?\s*(\/\/.*)?$/.exec(linea)
      return !(m && quitar.has(m[1]!))
    })
    .join('\n')
}

export function actualizarContenidoDeSeccion(doc: DocumentoJu1, nombre: string, contenido: string): DocumentoJu1 {
  return { ...doc, secciones: doc.secciones.map((s) => (s.nombre === nombre ? { ...s, contenido } : s)) }
}

export function actualizarMain(doc: DocumentoJu1, main: string): DocumentoJu1 {
  return { ...doc, main }
}

/** Quita las pestañas de secciones que ya no existen en la cuadrícula (su celda se borró: al quitar
 *  una fila o columna, al heredar otra estructura, por ids repetidos de versiones anteriores…).
 *  Sin esto quedaban archivos "fantasma" que nadie podía borrar desde la herramienta visual.
 *  Con soloVacias se respetan las que todavía tienen código, por si el alumno puede reconectarlas
 *  nombrando de nuevo una celda (ver etiquetarCelda). */
export function sinSeccionesHuerfanas(doc: DocumentoJu1, soloVacias = false): DocumentoJu1 {
  const conCelda = new Set(doc.estructura.celdas.flatMap((c) => (c.seccion ? [c.seccion] : [])))
  const conPestana = new Set(doc.secciones.map((s) => s.nombre))
  const secciones = doc.secciones.filter((s) => conCelda.has(s.nombre) || (soloVacias && s.contenido.trim() !== ''))
  // Al revés también: una celda que dice tener una sección cuya pestaña ya no existe (quedó así
  // al borrarla) vuelve a ser una celda vacía.
  const celdasSueltas = doc.estructura.celdas.some((c) => c.seccion !== null && !conPestana.has(c.seccion))
  if (secciones.length === doc.secciones.length && !celdasSueltas) return doc
  const quitadas = doc.secciones.filter((s) => !secciones.includes(s)).map((s) => s.nombre)
  const celdas = celdasSueltas
    ? doc.estructura.celdas.map((c) => (c.seccion !== null && !conPestana.has(c.seccion) ? { ...c, seccion: null } : c))
    : doc.estructura.celdas
  return { ...doc, estructura: { ...doc.estructura, celdas }, secciones, main: sinMostrarDe(doc.main, quitadas) }
}

/** Un documento que el alumno nunca tocó: una sola celda sin nombre y ninguna pestaña. Solo a
 *  este se le pone la estructura heredada del encargo anterior; uno al que ya se le borraron
 *  todas las secciones (aunque quede vacío) es suyo y no se reinicia. */
export function esDocumentoVirgen(doc: DocumentoJu1): boolean {
  return doc.estructura.filas === 1 && doc.estructura.columnas === 1 && doc.secciones.length === 0 && doc.estructura.celdas.every((c) => c.seccion === null)
}

/** Quita la última fila Y las secciones que vivían en ella (su pestaña de código también). */
export function eliminarFilaDelDocumento(doc: DocumentoJu1): Resultado<DocumentoJu1> {
  const r = eliminarFila(doc.estructura)
  return r.ok ? { ok: true, valor: sinSeccionesHuerfanas({ ...doc, estructura: r.valor }) } : r
}

/** Quita la última columna Y las secciones que vivían en ella. */
export function eliminarColumnaDelDocumento(doc: DocumentoJu1): Resultado<DocumentoJu1> {
  const r = eliminarColumna(doc.estructura)
  return r.ok ? { ok: true, valor: sinSeccionesHuerfanas({ ...doc, estructura: r.valor }) } : r
}

/** Nombres de las secciones que se perderían al quitar la última fila / columna (para avisar
 *  antes: se borra su código). */
export function seccionesDeLaUltima(estructura: EstructuraDePagina, eje: 'fila' | 'columna'): string[] {
  const ultima = (eje === 'fila' ? estructura.filas : estructura.columnas) - 1
  return estructura.celdas.flatMap((c) => ((eje === 'fila' ? c.fila : c.columna) === ultima && c.seccion ? [c.seccion] : []))
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
        return sinSeccionesHuerfanas(conIdsUnicos(datos as DocumentoJu1), true)
      }
    } catch {
      /* no era JSON: es texto de portafolio.js de antes de este cambio */
    }
  }
  return { ...crearDocumentoJu1Inicial(), main: texto }
}
