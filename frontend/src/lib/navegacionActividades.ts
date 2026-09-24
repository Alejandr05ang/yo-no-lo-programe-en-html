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
  // "Anterior" lleva a la actividad anterior que se puede abrir (como "Siguiente", que salta
  // las cerradas): la inmediata puede estar cerrada por el docente o no ser un encargo.
  const anterior = actividades
    .slice(0, indice)
    .reverse()
    .find((a) => a.unlocked && numeroFromChallengeKey(a.key) !== null)
  return {
    posicion: indice + 1,
    total: actividades.length,
    anterior: destino(anterior),
    siguiente: destino(actividades[indice + 1]),
  }
}

export function rutaActividad(numero: number): string {
  return `/portafolio?e=${numero}`
}

export function rutaDia(codigo: string): string {
  return `/sesiones/${encodeURIComponent(codigo)}`
}

/** A dónde manda "Entrar" en un día, desde el mapa. L1 es el diagnóstico inicial (docs/decisiones.md
 *  P6): el equipo del taller lo da en clase, sin encargos propios en la plataforma — entrar a su
 *  sesión solo mostraba "sin actividades", así que en vez de eso manda a la demo interactiva. */
export function rutaEntradaDia(codigo: string): string {
  return codigo === 'L1' ? '/demo' : rutaDia(codigo)
}

// ── Qué sigue, según el mapa del backend ───────────────────────────────────────
//
// El mapa (GET /api/map) es la autoridad sobre qué días están abiertos, pausados o
// bloqueados. Aquí solo se decide qué OFRECER al estudiante; nunca se navega solo. Así, cuando
// el docente abre el día siguiente, la última actividad del día deja de ser un callejón sin
// salida (aparece "Continuar con el Día N"), sin volver al salto automático entre días.

export interface RetoDelMapa {
  key: string
  title: string
  unlocked: boolean
  progress_status?: string
}

export interface DiaDelMapa {
  code: string
  day_number: number
  title: string
  access?: 'open' | 'paused' | 'locked'
  challenges: RetoDelMapa[]
}

export interface ResumenDia {
  code: string
  day_number: number
  title: string
}

export type AccesoActividad = 'abierta' | 'bloqueada' | 'pausada' | 'desconocida'

export type Continuacion =
  /** Hay otra actividad después en el mismo día (puede estar cerrada: destino.disponible). */
  | { tipo: 'mismo-dia'; destino: DestinoActividad }
  /** Terminó el día y el siguiente está abierto. destino null: ese día no tiene actividades. */
  | { tipo: 'dia-siguiente'; dia: ResumenDia; destino: DestinoActividad | null }
  | { tipo: 'dia-pausado'; dia: ResumenDia }
  | { tipo: 'dia-bloqueado'; dia: ResumenDia }
  /** No quedan días después de este. */
  | { tipo: 'fin' }

function resumen(d: DiaDelMapa): ResumenDia {
  return { code: d.code, day_number: d.day_number, title: d.title }
}

function accesoDelDia(d: DiaDelMapa): 'open' | 'paused' | 'locked' {
  return d.access ?? 'open'
}

export function diaDeReto(dias: DiaDelMapa[], key: string): DiaDelMapa | null {
  return dias.find((d) => d.challenges.some((c) => c.key === key)) ?? null
}

/** Si el estudiante puede trabajar en ese reto ahora. 'desconocida': el mapa no lo muestra. */
export function accesoActividad(dias: DiaDelMapa[], key: string): AccesoActividad {
  const dia = diaDeReto(dias, key)
  if (!dia) return 'desconocida'
  const acceso = accesoDelDia(dia)
  if (acceso === 'paused') return 'pausada'
  if (acceso === 'locked') return 'bloqueada'
  return dia.challenges.find((c) => c.key === key)?.unlocked ? 'abierta' : 'bloqueada'
}

/** Primera actividad abierta de un día, prefiriendo la primera que no esté terminada. */
function primeraActividad(d: DiaDelMapa): DestinoActividad | null {
  const abiertas = d.challenges.filter((c) => c.unlocked && numeroFromChallengeKey(c.key) !== null)
  const elegida = abiertas.find((c) => c.progress_status !== 'accepted') ?? abiertas[0]
  return destino(elegida)
}

/** Qué ofrecer después de la actividad `key`. null si el reto no está en el mapa. */
export function continuacion(dias: DiaDelMapa[], key: string): Continuacion | null {
  const indiceDia = dias.findIndex((d) => d.challenges.some((c) => c.key === key))
  if (indiceDia === -1) return null
  const dia = dias[indiceDia]
  // La siguiente actividad ABIERTA del día: si la inmediata la cerró el docente, se ofrece la
  // que sigue; y si no queda ninguna, lo que haya después del día. Nunca un botón muerto.
  const indice = dia.challenges.findIndex((c) => c.key === key)
  const siguienteAbierta = dia.challenges
    .slice(indice + 1)
    .find((c) => c.unlocked && numeroFromChallengeKey(c.key) !== null)
  const destinoMismoDia = destino(siguienteAbierta)
  if (destinoMismoDia) return { tipo: 'mismo-dia', destino: destinoMismoDia }

  const siguiente = dias[indiceDia + 1]
  if (!siguiente) return { tipo: 'fin' }
  const acceso = accesoDelDia(siguiente)
  if (acceso === 'paused') return { tipo: 'dia-pausado', dia: resumen(siguiente) }
  if (acceso === 'locked') return { tipo: 'dia-bloqueado', dia: resumen(siguiente) }
  return { tipo: 'dia-siguiente', dia: resumen(siguiente), destino: primeraActividad(siguiente) }
}
