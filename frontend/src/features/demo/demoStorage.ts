/** Lo que el constructor emite y el backend guarda. */
export interface ProgresoDemo {
  schema_version: number
  state: Record<string, unknown>
  draft_code: string
}

/**
 * La copia local es un respaldo, no la fuente de verdad. `sincronizado` dice si
 * el backend ya la tiene: es lo único que distingue "esto ya está a salvo" de
 * "esto se escribió mientras el servidor no respondía".
 */
export interface CopiaLocal extends ProgresoDemo {
  sincronizado: boolean
}

const PREFIJO = 'tutorias:demo:'

/**
 * Cada usuario tiene su propia clave. Nunca se comparte entre cuentas: el
 * trabajo de un alumno no puede aparecer en la sesión de otro por haber usado
 * el mismo equipo.
 */
export function claveDemo(uid: string | null): string {
  return PREFIJO + (uid ?? 'anon')
}

export function leerLocal(uid: string | null): CopiaLocal | null {
  try {
    const crudo = localStorage.getItem(claveDemo(uid))
    if (!crudo) return null
    const copia = JSON.parse(crudo) as Partial<CopiaLocal>
    if (!copia || typeof copia.state !== 'object' || copia.state === null) return null
    return {
      schema_version: typeof copia.schema_version === 'number' ? copia.schema_version : 1,
      state: copia.state as Record<string, unknown>,
      draft_code: typeof copia.draft_code === 'string' ? copia.draft_code : '',
      sincronizado: copia.sincronizado === true,
    }
  } catch {
    // Modo privado, almacenamiento lleno o un JSON de otra versión: sin respaldo.
    return null
  }
}

export function escribirLocal(uid: string | null, progreso: ProgresoDemo, sincronizado: boolean): void {
  try {
    localStorage.setItem(claveDemo(uid), JSON.stringify({ ...progreso, sincronizado }))
  } catch {
    // Quedarse sin respaldo local no debe tumbar la demo.
  }
}

export function borrarLocal(uid: string | null): void {
  try {
    localStorage.removeItem(claveDemo(uid))
  } catch {
    // idem
  }
}

export type OrigenRestauracion = 'backend' | 'local-pendiente' | 'local' | 'ninguno'

export interface Restauracion {
  origen: OrigenRestauracion
  progreso: ProgresoDemo | null
}

function tieneEstado(p: ProgresoDemo | null | undefined): p is ProgresoDemo {
  return Boolean(p && p.state && Object.keys(p.state).length > 0)
}

/**
 * El backend manda, con una excepción: una copia local sin sincronizar es
 * trabajo que el servidor nunca llegó a recibir, así que es posterior a lo que
 * sí tiene guardado. Descartarla sería perder en silencio lo último que hizo el
 * alumno, de modo que gana y se vuelve a subir.
 */
export function elegirRestauracion(
  backend: ProgresoDemo | null,
  local: CopiaLocal | null,
): Restauracion {
  if (local && !local.sincronizado && tieneEstado(local)) {
    return { origen: 'local-pendiente', progreso: local }
  }
  if (tieneEstado(backend)) return { origen: 'backend', progreso: backend }
  if (tieneEstado(local)) return { origen: 'local', progreso: local }
  return { origen: 'ninguno', progreso: null }
}
