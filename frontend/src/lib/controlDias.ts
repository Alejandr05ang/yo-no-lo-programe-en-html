// Control de días del panel de administración: qué estado tiene cada día para
// una clase, qué acciones admite y qué se le dice al docente antes de aplicarlas.
//
// Dos conceptos que no se mezclan:
// - "Activar como día actual" mueve hasta dónde llega el curso (acumulativo).
// - "Pausar / Reabrir acceso" cierra un día concreto sin mover el día actual.
// Ninguna de las dos borra progreso, y reabrir nunca abre un día futuro.

export interface SesionAdmin {
  id: string
  code: string
  day_number: number
  order_index: number
  title: string
  challenges_count: number
}

export interface PausaAdmin {
  session_id: string
  code: string
  updated_at: string | null
  updated_by_name: string | null
}

export type EstadoDiaAdmin = 'actual' | 'disponible' | 'pausado' | 'futuro'
export type AccionDiaAdmin = 'activar' | 'pausar' | 'reabrir'

export interface FilaDia {
  estado: EstadoDiaAdmin
  /** Pausado por el docente, esté o no por delante del día actual. */
  pausado: boolean
  esActual: boolean
  acciones: AccionDiaAdmin[]
}

export const ETIQUETA_ESTADO_ADMIN: Record<EstadoDiaAdmin, string> = {
  actual: 'Actual',
  disponible: 'Disponible',
  pausado: 'Cerrado por docente',
  futuro: 'Futuro',
}

export function filaDia(
  sesion: SesionAdmin,
  activo: { id: string | null; orden: number },
  pausas: PausaAdmin[],
): FilaDia {
  const pausado = pausas.some((p) => p.session_id === sesion.id)
  const esActual = activo.id === sesion.id
  const alcanzado = sesion.order_index <= activo.orden
  const estado: EstadoDiaAdmin = !alcanzado ? 'futuro' : pausado ? 'pausado' : esActual ? 'actual' : 'disponible'
  const acciones: AccionDiaAdmin[] = []
  if (pausado) acciones.push('reabrir')
  else if (alcanzado) acciones.push('pausar')
  if (!esActual) acciones.push('activar')
  return { estado, pausado, esActual, acciones }
}

export interface Confirmacion {
  titulo: string
  parrafos: string[]
  boton: string
}

function nombreDia(s: SesionAdmin): string {
  return `Día ${s.day_number}`
}

function enumerar(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join('')
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
}

const SIN_BORRAR = 'El progreso y el código que ya guardaron tus estudiantes NO se eliminan.'

/**
 * El texto del diálogo de confirmación. `objetivo` null en "activar" significa
 * volver a la demo: ningún día abierto.
 */
export function confirmacion(
  accion: AccionDiaAdmin,
  objetivo: SesionAdmin | null,
  sesiones: SesionAdmin[],
  activo: { id: string | null; orden: number },
  pausas: PausaAdmin[],
): Confirmacion {
  if (accion === 'pausar' && objetivo) {
    return {
      titulo: `¿Pausar ${nombreDia(objetivo)}?`,
      parrafos: [
        `Los estudiantes dejarán de poder entrar temporalmente a ${nombreDia(objetivo)} · ${objetivo.title}.`,
        'Su progreso y el código guardado NO se eliminan: al reabrirlo lo encontrarán exactamente como lo dejaron.',
      ],
      boton: 'Pausar acceso',
    }
  }
  if (accion === 'reabrir' && objetivo) {
    const futuro = objetivo.order_index > activo.orden
    return {
      titulo: `¿Reabrir ${nombreDia(objetivo)}?`,
      parrafos: futuro
        ? [
            `Se quitará la pausa, pero ${nombreDia(objetivo)} seguirá bloqueado hasta que el curso llegue a él.`,
            'Reabrir no adelanta el día actual.',
          ]
        : [`Los estudiantes podrán volver a entrar a ${nombreDia(objetivo)} · ${objetivo.title} y encontrarán su trabajo como lo dejaron.`],
      boton: 'Reabrir acceso',
    }
  }

  // Activar como día actual (o volver a la demo).
  const nuevoOrden = objetivo?.order_index ?? 0
  const perdidos = sesiones
    .filter((s) => s.order_index > nuevoOrden && s.order_index <= activo.orden)
    .sort((a, b) => a.order_index - b.order_index)
  const parrafos: string[] = []
  if (!objetivo) {
    parrafos.push('Tus estudiantes volverán a tener solo la demo: ningún día quedará abierto.')
  } else if (perdidos.length === 0) {
    parrafos.push(`Tus estudiantes podrán abrir del Día 1 al ${nombreDia(objetivo)}. Lo posterior sigue bloqueado.`)
  }
  if (perdidos.length > 0) {
    const destino = objetivo ? `a ${nombreDia(objetivo)}` : 'a la demo'
    const verbo = perdidos.length === 1 ? 'dejará' : 'dejarán'
    parrafos.push(`Al volver el día actual ${destino}, ${enumerar(perdidos.map(nombreDia))} ${verbo} de estar disponible${perdidos.length === 1 ? '' : 's'} temporalmente.`)
  }
  if (objetivo && pausas.some((p) => p.session_id === objetivo.id)) {
    parrafos.push(`${nombreDia(objetivo)} está pausado: al activarlo como día actual se reabre.`)
  }
  parrafos.push(SIN_BORRAR)
  return {
    titulo: objetivo ? `¿Activar ${nombreDia(objetivo)} como día actual?` : '¿Volver a solo la demo?',
    parrafos,
    boton: objetivo ? 'Activar como día actual' : 'Volver a la demo',
  }
}
