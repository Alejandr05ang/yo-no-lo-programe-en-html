// Estado de un día y de una actividad tal como lo ve el alumno.
//
// Todo sale de datos reales del backend (GET /api/map y /api/map/sessions/:code):
// el acceso lo decide el servidor (abierto, pausado por el docente, bloqueado por
// no haber llegado el curso) y el progreso son las filas de progress del alumno.
// Aquí solo se traduce a palabras y a qué botón ofrecer. Nada de "completado"
// porque un día ya pasó: completado es haber terminado sus actividades.

export type Acceso = 'open' | 'paused' | 'locked'
export type EstadoProgreso = 'not_started' | 'draft' | 'in_progress' | 'accepted'

export interface ProgresoDia {
  required_total: number
  accepted: number
  started: number
}

export interface DiaParaEstado {
  access: Acceso
  is_current: boolean
  progress: ProgresoDia
}

export type EstadoDia = 'hoy' | 'completado' | 'en_progreso' | 'disponible' | 'pausado' | 'bloqueado'

export const ETIQUETA_DIA: Record<EstadoDia, string> = {
  hoy: 'Hoy',
  completado: 'Completado',
  en_progreso: 'En progreso',
  disponible: 'Disponible',
  pausado: 'Cerrado por docente',
  bloqueado: 'Bloqueado',
}

export function estadoDelDia(dia: DiaParaEstado): EstadoDia {
  if (dia.access === 'paused') return 'pausado'
  if (dia.access === 'locked') return 'bloqueado'
  const { required_total, accepted, started } = dia.progress
  // Un día sin actividades no se "completa": se trabaja en clase.
  if (required_total > 0 && accepted >= required_total) return 'completado'
  if (dia.is_current) return 'hoy'
  if (accepted > 0 || started > 0) return 'en_progreso'
  return 'disponible'
}

export function sePuedeEntrar(dia: DiaParaEstado): boolean {
  return dia.access === 'open'
}

export type AccionDia = 'Entrar' | 'Continuar' | 'Revisar'

/** El verbo del botón principal de un día abierto. null si no se puede entrar. */
export function accionDelDia(dia: DiaParaEstado): AccionDia | null {
  if (!sePuedeEntrar(dia)) return null
  const estado = estadoDelDia(dia)
  if (estado === 'completado') return 'Revisar'
  if (dia.progress.accepted > 0 || dia.progress.started > 0) return 'Continuar'
  return 'Entrar'
}

/** Por qué no se puede entrar, dicho sin insinuar un problema de la cuenta. */
export function motivoCerrado(dia: DiaParaEstado): string | null {
  if (dia.access === 'paused') return 'El docente pausó temporalmente este día. Tu progreso sigue guardado.'
  if (dia.access === 'locked') return 'Se abrirá más adelante.'
  return null
}

export function textoProgreso(progreso: ProgresoDia): string {
  const { required_total: total, accepted } = progreso
  if (total === 0) return 'Sesión de clase, sin actividades en la plataforma.'
  return `${accepted} de ${total} ${total === 1 ? 'actividad completada' : 'actividades completadas'}`
}

// --- Actividades -----------------------------------------------------------

export type AccionActividad = 'Empezar' | 'Continuar' | 'Revisar'

export interface EstadoActividad {
  etiqueta: 'Pendiente' | 'En progreso' | 'Completada'
  accion: AccionActividad
}

export function estadoDeActividad(status: EstadoProgreso | string | undefined): EstadoActividad {
  if (status === 'accepted') return { etiqueta: 'Completada', accion: 'Revisar' }
  if (status === 'draft' || status === 'in_progress') return { etiqueta: 'En progreso', accion: 'Continuar' }
  return { etiqueta: 'Pendiente', accion: 'Empezar' }
}
