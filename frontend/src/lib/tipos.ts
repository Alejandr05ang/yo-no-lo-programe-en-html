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
  nota: string
}

export interface EstadoGuardado {
  guardadoHaceSegundos: number
  intentos: number
}

export interface ArchivoEditor {
  nombre: string // "portafolio.js"
  contenido: string
  soloLectura: boolean
}

export interface SalidaEjecucion {
  /** Líneas de consola con prefijo y detalle. */
  lineas: { prefijo?: string; texto: string; detalle?: string }[]
}
