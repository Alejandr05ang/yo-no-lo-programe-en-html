// Progreso de fixtures/local: efímero por pestaña y en orden curricular explícito.
// La pantalla autenticada usa el progreso y la autorización persistidos en el backend.

import { NUMEROS_DE_ENCARGO } from './encargos.ts'

const CLAVE_SOLUCIONES = 've:soluciones' // código ACEPTADO por encargo (para heredar)
const CLAVE_BORRADORES = 've:borradores' // código EN CURSO por encargo (para no perder trabajo)

const MIN_ENCARGO = NUMEROS_DE_ENCARGO[0]
const MAX_ENCARGO = NUMEROS_DE_ENCARGO[NUMEROS_DE_ENCARGO.length - 1]

function leerMapa(clave: string): Record<number, string> {
  try {
    return JSON.parse(sessionStorage.getItem(clave) ?? '{}')
  } catch {
    return {}
  }
}

function guardarMapa(clave: string, obj: Record<number, string>) {
  try {
    sessionStorage.setItem(clave, JSON.stringify(obj))
  } catch {
    /* sin almacenamiento */
  }
}

export function leerSoluciones() {
  return leerMapa(CLAVE_SOLUCIONES)
}
export function guardarSoluciones(m: Record<number, string>) {
  guardarMapa(CLAVE_SOLUCIONES, m)
}
export function leerBorradores() {
  return leerMapa(CLAVE_BORRADORES)
}
export function guardarBorradores(m: Record<number, string>) {
  guardarMapa(CLAVE_BORRADORES, m)
}

/** Números de encargo aceptados. */
export function encargosAceptados(): number[] {
  return Object.keys(leerSoluciones())
    .map(Number)
    .filter((n) => NUMEROS_DE_ENCARGO.includes(n))
}

/** El primer encargo sin aceptar — el que el estudiante está haciendo ahora. */
export function encargoFrontera(): number {
  const aceptados = new Set(encargosAceptados())
  for (const n of NUMEROS_DE_ENCARGO) {
    if (!aceptados.has(n)) return n
  }
  return MAX_ENCARGO
}

/** Borra todo el progreso local (solo desarrollo). */
export function reiniciarProgreso() {
  try {
    sessionStorage.removeItem(CLAVE_SOLUCIONES)
    sessionStorage.removeItem(CLAVE_BORRADORES)
  } catch {
    /* nada que hacer */
  }
}

export { MIN_ENCARGO, MAX_ENCARGO }
