// Guardado del borrador del estudiante: una cola que ejecuta los guardados de a uno y en
// orden, y la regla de cuándo se puede guardar. Vive fuera de VistaEstudiante para poder
// probarla sin montar el editor.

export interface ColaDeGuardado {
  /** Pone un guardado a la cola: empieza cuando termina el anterior, aunque aquel fallara. */
  encolar: (tarea: () => Promise<void>) => void
  /** Espera a que termine todo lo encolado hasta ahora. Nunca falla. */
  esperar: () => Promise<void>
}

export function crearColaDeGuardado(): ColaDeGuardado {
  let cadena: Promise<void> = Promise.resolve()
  return {
    encolar(tarea) {
      cadena = cadena.catch(() => {}).then(tarea)
    },
    async esperar() {
      await cadena.catch(() => {})
    },
  }
}

export type EstadoBorrador = 'dirty' | 'saving' | 'saved' | 'error'

/**
 * ¿Se puede guardar `contenido` como borrador del encargo `numero`?
 *
 * Solo si el editor tiene cargado el borrador de ESE encargo. Al cambiar de encargo (anterior
 * / siguiente, volver atrás en el navegador) `numero` cambia antes de que llegue el borrador
 * nuevo; mientras tanto `contenido` sigue siendo el del encargo anterior y guardarlo bajo el
 * número nuevo pisaría el trabajo del otro encargo.
 */
export function sePuedeGuardar(p: {
  contenido: string
  numero: number
  numeroCargado: number | null
  estado: EstadoBorrador
}): boolean {
  // 'error': el último intento no llegó al servidor, así que sigue pendiente de guardar.
  return p.contenido.length > 0 && p.numeroCargado === p.numero && (p.estado === 'dirty' || p.estado === 'error')
}

/** Marca en este equipo de que el borrador local de un encargo no llegó al servidor. */
export function clavePendiente(uid: string, key: string): string {
  return `tutorias:draft-pendiente:${uid}:${key}`
}

/**
 * Qué borrador mostrar al abrir un encargo.
 *
 * El del servidor, salvo que la copia de este equipo tenga cambios que NO llegaron (un
 * guardado falló sin red): esa copia es la más reciente y se vuelve a subir. Sin la marca,
 * volver al encargo mostraba la versión vieja del servidor y el siguiente autoguardado la
 * dejaba como definitiva.
 */
export function elegirBorrador(p: {
  servidor: string
  local: string | null
  localPendiente: boolean
}): { codigo: string; subir: boolean } | null {
  if (p.localPendiente && p.local && p.local !== p.servidor) return { codigo: p.local, subir: true }
  if (p.servidor) return { codigo: p.servidor, subir: false }
  return null
}
