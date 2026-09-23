// Anterior / siguiente dentro de las actividades de un mismo día.
//
// La lista y su orden salen del backend (GET /api/map/sessions/:code), no del
// bundle: es el servidor quien sabe qué retos tiene hoy la clase y cuáles abrió el
// docente. Navegar no exige haber aceptado la actividad actual: el alumno puede
// consultar otra, volver y comparar. Tampoco cruza de día: la última actividad
// lleva de vuelta al día, nunca abre el siguiente.

import { numeroFromChallengeKey } from './challengeIdentity.ts'

export interface ActividadDelDia {
  key: string
  title: string
  unlocked: boolean
}

export interface DestinoActividad {
  key: string
  numero: number
  titulo: string
  disponible: boolean
}

export interface PosicionActividad {
  /** 1-based, para mostrarlo tal cual: "Actividad 2 de 3". */
  posicion: number
  total: number
  anterior: DestinoActividad | null
  siguiente: DestinoActividad | null
}

function destino(actividad: ActividadDelDia | undefined): DestinoActividad | null {
  if (!actividad) return null
  const numero = numeroFromChallengeKey(actividad.key)
  if (numero === null) return null
  return { key: actividad.key, numero, titulo: actividad.title, disponible: actividad.unlocked }
}

/**
 * Dónde está `key` dentro del día. null si no pertenece a él (por ejemplo un
 * reto oculto por el docente): en ese caso no se ofrece navegación.
 */
export function posicionEnDia(actividades: ActividadDelDia[], key: string): PosicionActividad | null {
  const indice = actividades.findIndex((a) => a.key === key)
  if (indice === -1) return null
  return {
    posicion: indice + 1,
    total: actividades.length,
    anterior: destino(actividades[indice - 1]),
    siguiente: destino(actividades[indice + 1]),
  }
}

export function rutaActividad(numero: number): string {
  return `/portafolio?e=${numero}`
}

export function rutaDia(codigo: string): string {
  return `/sesiones/${encodeURIComponent(codigo)}`
}
