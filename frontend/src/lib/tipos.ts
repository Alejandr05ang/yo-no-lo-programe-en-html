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
  /** Línea (1-based) de portafolio.js donde ocurrió el error, si se pudo determinar. */
  linea?: number
}
