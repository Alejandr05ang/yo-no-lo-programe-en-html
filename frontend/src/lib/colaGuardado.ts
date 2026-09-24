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

/** Huella corta de un texto (FNV-1a de 32 bits): para comparar sin guardar el texto entero. */
export function huella(texto: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/**
 * El valor de la marca de pendiente: la huella de lo último que este equipo SABE que está en
 * el servidor. Al volver sirve para saber si el servidor cambió desde entonces (otro equipo, o
 * un guardado que llegó aunque la pestaña se cerró antes de enterarse).
 */
export function valorPendiente(ultimoEnServidor: string): string {
  return JSON.stringify({ base: huella(ultimoEnServidor) })
}

/**
 * Qué borrador mostrar al abrir un encargo.
 *
 * El del servidor, salvo que la copia de este equipo tenga cambios que NO llegaron (un
 * guardado falló sin red, o se cerró la pestaña a medio escribir): esa copia es la más
 * reciente y se vuelve a subir. Pero solo si el servidor sigue teniendo lo mismo que cuando
 * se hizo la copia; si cambió después (el estudiante siguió en otro equipo) manda el servidor:
 * si no, una copia vieja de este equipo pisaba el trabajo más nuevo. `pendiente` es el valor
 * de la marca (valorPendiente), '1' en las marcas sin huella, o null si no hay marca.
 */
export function elegirBorrador(p: {
  servidor: string
  local: string | null
  pendiente: string | null
}): { codigo: string; subir: boolean } | null {
  if (p.pendiente && p.local && p.local !== p.servidor) {
    let base: unknown = null
    try {
      base = (JSON.parse(p.pendiente) as { base?: unknown })?.base ?? null
    } catch {
      base = null
    }
    if (base === null || base === huella(p.servidor)) return { codigo: p.local, subir: true }
  }
  if (p.servidor) return { codigo: p.servidor, subir: false }
  return null
}
