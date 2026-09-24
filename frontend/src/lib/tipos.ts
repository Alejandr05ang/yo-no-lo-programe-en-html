// Tipos del dominio del cliente. Reflejan el §State Management del handoff.
// El servidor es la autoridad; estos son los datos que el cliente necesita.

/** Una herramienta de la API en español, mostrada como tag en el panel de encargo. */
export interface HerramientaAPI {
  nombre: string // p. ej. "crearElemento()", "si / sino"
  nuevaHoy?: boolean // la del día va con .tag-accent y prefijo "nuevo hoy:"
}

/** El encargo del día. "Encargo" es el vocabulario de producto para nivel/ejercicio. */
export interface Encargo {
  numero: number
  titulo: string
  /** Prosa del encargo (variante 1a). Cero vocabulario técnico. */
  parrafos: string[]
  desbloqueadoTexto: string // "desbloqueado hoy 10:00"
  herramientas: HerramientaAPI[]
  /** Segundos hasta que la siguiente pista esté disponible; null si ya lo está. */
  pistaDisponibleEn: number | null
  /** Texto de la pista (docs/decisiones.md D2: un solo nivel por ahora, no las 3 escalonadas). */
  pista: string
  /** true = el andamiaje y los tests todavía son de ejemplo, no diseño final. */
  esBorrador?: boolean
}

export type EstadoCaso = 'pasa' | 'falla' | 'pendiente'

export interface CasoRevision {
  descripcion: string
  estado: EstadoCaso
}

export interface ResultadoRevision {
  casos: CasoRevision[]
  casosPasados: number
  casosTotales: number
  /** El feedback dice QUÉ falla, nunca CÓMO arreglarlo. */
  nota?: string
  ok?: boolean
  error?: string
  htmlPreview?: string
  logs?: string[]
}

export interface EstadoGuardado {
  estado: 'dirty' | 'saving' | 'saved' | 'error'
  intentos: number
  /** Opcional: la última vez que se guardó exitosamente, para mostrar "hace X s" */
  ultimoGuardado?: number
}

export interface ArchivoEditor {
  nombre: string // "portafolio.js"
  contenido: string
  soloLectura: boolean
}

export interface SalidaEjecucion {
  /** Líneas de consola con prefijo y detalle. */
  lineas: { prefijo?: string; texto: string; detalle?: string }[]
  /** Línea (1-based) donde ocurrió el error, si se pudo determinar. */
  linea?: number
  /** Nombre del archivo/sección de donde vino el error ("portafolio.js", o el nombre de una
   *  sección de Ju1) — sin esto, un error de cualquier pestaña se marcaba siempre en
   *  portafolio.js. undefined = portafolio.js (comportamiento de siempre, un solo archivo). */
  archivo?: string
}

// ── Ju1: cuadrícula visual + una pestaña de código por sección ──────────────────────────
// docs: plan "Cuadrícula visual + pestañas por sección para Ju1". En vez de escribir
// crearSeccion()/agregarA() a mano (dispara la complejidad de golpe: hay que enrutar cada
// título/párrafo al contenedor correcto entre 4-5 posibles), el estudiante arma la ESTRUCTURA
// con una herramienta visual tipo Excel (agregar filas/columnas, combinar celdas adyacentes en
// un rectángulo — nunca una forma inválida, misma regla que combinar celdas en Excel) y el
// CONTENIDO de cada sección resultante en su propia pestaña de código, tan simple como
// portafolio.js de cualquier otro encargo. La posición la fija la cuadrícula, no el código.

/** Una celda de la cuadrícula. `seccion === null` = celda vacía, sin pestaña de código propia
 *  todavía (recién agregada, o recién separada de una combinación). */
export interface Celda {
  id: string
  fila: number
  columna: number
  /** 1x1 por defecto; mayor a 1 = esta celda viene de combinar varias (como en Excel). */
  expandeFilas: number
  expandeColumnas: number
  seccion: string | null
}

export interface EstructuraDePagina {
  filas: number
  columnas: number
  celdas: Celda[]
}

/** El contenido de una sección: la pestaña de código de una celda ya etiquetada. */
export interface PestanaSeccion {
  nombre: string
  contenido: string
}

/** El documento completo de un encargo con modelo "grid": la estructura visual, el contenido
 *  de cada sección, y el "main" (antes portafolio.js a secas) que las compone con
 *  mostrar(nombreDeSeccion) — mismo patrón que ya usa datos.js para exponerse como `datos`. */
export interface DocumentoJu1 {
  version: 1
  estructura: EstructuraDePagina
  secciones: PestanaSeccion[]
  main: string
}
