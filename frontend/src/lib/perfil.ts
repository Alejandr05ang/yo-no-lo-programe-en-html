// "Mis datos" — la información propia del estudiante que alimenta `datos` en la
// vista previa de los encargos.
//
// La fuente de verdad es Postgres, a través del perfil que devuelve
// /api/auth/bootstrap. localStorage ya no guarda el perfil: solo queda como
// origen de una migración de una sola vez para quien tenga datos de la época en
// que sí vivía ahí.

import type { BackendUser } from './backendTypes'
import { normalizarUrlDePerfil } from './enlaces.ts'

export interface Perfil {
  nombre: string
  sobreMi: string
  redes: { github: string; linkedin: string; correo: string }
  hobbies: string[]
}

/** Clave heredada. Solo se lee para migrar, y se borra en cuanto el servidor confirma. */
const CLAVE_LEGADA = 've:perfil'

// Se usa en el fixture de desarrollo y como relleno de la vista previa antes de
// que el alumno escriba lo suyo.
export const PERFIL_DEFECTO: Perfil = {
  nombre: 'Ana Rivas',
  sobreMi: 'Estudio ingeniería y estoy aprendiendo a construir cosas para internet.',
  redes: {
    github: 'https://github.com/ana',
    linkedin: '',
    correo: 'ana@ejemplo.com',
  },
  hobbies: ['Escalada en roca', 'Fotografía analógica', 'Ajedrez'],
}

/** El perfil del backend en la forma que usan los encargos. */
export function perfilDesdeBackend(user: BackendUser): Perfil {
  return {
    nombre: user.display_name || user.full_name || '',
    sobreMi: user.description ?? '',
    redes: {
      github: user.github_url ?? '',
      linkedin: user.linkedin_url ?? '',
      correo: user.email ?? '',
    },
    hobbies: Array.isArray(user.hobbies) ? user.hobbies : [],
  }
}

/** Lo que espera PUT /api/profile. El correo no se envía: lo gobierna Firebase. */
export function perfilParaBackend(p: Perfil, user: BackendUser) {
  return {
    full_name: user.full_name || p.nombre,
    display_name: p.nombre,
    description: p.sobreMi,
    github_url: p.redes.github || null,
    linkedin_url: p.redes.linkedin || null,
    website_url: user.website_url ?? null,
    hobbies: p.hobbies.filter((h) => h.trim().length > 0).slice(0, 20),
  }
}

/** Lo guardado por el formulario viejo, tal cual (sin rellenar con los datos de ejemplo). */
export function leerPerfilLegado(): Partial<Perfil> | null {
  try {
    const guardado = localStorage.getItem(CLAVE_LEGADA)
    if (!guardado) return null
    const crudo = JSON.parse(guardado) as Partial<Perfil>
    if (!crudo || typeof crudo !== 'object') return null
    return crudo
  } catch {
    return null
  }
}

/**
 * Lo que se puede subir del perfil viejo, o null si no queda nada que valga la pena.
 *
 * El formulario viejo EMPEZABA con los datos de ejemplo de PERFIL_DEFECTO ("Ana Rivas", su
 * GitHub, su "Sobre mí"…) y quien solo cambiaba los hobbies los guardaba igual. Así que:
 * - el nombre nunca viene de ahí: manda el que el estudiante dio al registrarse;
 * - lo que sigue siendo el dato de ejemplo se descarta;
 * - los enlaces se normalizan como en el formulario ("github.com/ana" → https://…) y lo que no
 *   pasaría la validación del servidor se descarta, en vez de hacer fallar todo el guardado.
 */
export function perfilLegadoParaSubir(legado: Partial<Perfil>, user: BackendUser): ReturnType<typeof perfilParaBackend> | null {
  const nombre = recortar(user.display_name || user.full_name || '')
  if (largo(nombre) < 2 || largo(nombre) > 80) return null

  const texto = (v: unknown) => (typeof v === 'string' ? recortar(v) : '')
  const sobreMi = texto(legado.sobreMi)
  const descripcion = sobreMi && sobreMi !== PERFIL_DEFECTO.sobreMi && largo(sobreMi) <= MAX_SOBRE_MI ? sobreMi : ''

  const enlace = (v: unknown, ejemplo: string) => {
    const t = texto(v)
    if (!t || t === ejemplo) return ''
    const url = normalizarUrlDePerfil(t)
    return url && url !== ejemplo && url.length <= MAX_LARGO_URL ? url : ''
  }
  const redes = (legado.redes && typeof legado.redes === 'object' ? legado.redes : {}) as Partial<Perfil['redes']>
  const github = enlace(redes.github, PERFIL_DEFECTO.redes.github)
  const linkedin = enlace(redes.linkedin, PERFIL_DEFECTO.redes.linkedin)

  const listaVieja = Array.isArray(legado.hobbies) ? legado.hobbies.map(texto).filter((h) => h.length > 0) : []
  const esEjemplo = listaVieja.length === PERFIL_DEFECTO.hobbies.length && listaVieja.every((h, i) => h === PERFIL_DEFECTO.hobbies[i])
  const hobbies = esEjemplo ? [] : listaVieja.filter((h) => largo(h) <= MAX_LARGO_HOBBY).slice(0, MAX_HOBBIES)

  if (!descripcion && !github && !linkedin && hobbies.length === 0) return null
  return perfilParaBackend(
    { nombre, sobreMi: descripcion, redes: { github, linkedin, correo: user.email ?? '' }, hobbies },
    user,
  )
}

export function olvidarPerfilLegado(): void {
  try {
    localStorage.removeItem(CLAVE_LEGADA)
  } catch {
    /* sin almacenamiento: no hay nada que olvidar */
  }
}

/**
 * ¿Merece la pena subir el perfil heredado? Solo si el servidor todavía no tiene
 * nada propio. Si el alumno ya guardó su perfil, el servidor manda y lo de
 * localStorage se descarta sin tocarlo.
 */
export function perfilDelServidorEstaVacio(user: BackendUser): boolean {
  return !user.description && !user.github_url && !user.linkedin_url && (user.hobbies?.length ?? 0) === 0
}

/** El perfil en la forma del objeto `datos`.
 * `redes` es una lista con nombre y url: se puede recorrer con `for...of` sin
 * introducir Object.entries() ni desestructuración antes de tiempo. Las urls vacías
 * se conservan para que E4 pueda decidir cuáles mostrar. */
export function perfilComoDatos(p: Perfil): Record<string, unknown> {
  const redes = [
    { nombre: 'GitHub', url: p.redes.github },
    { nombre: 'LinkedIn', url: p.redes.linkedin },
    { nombre: 'Correo', url: p.redes.correo },
  ]
  return { nombre: p.nombre, sobreMi: p.sobreMi, redes, hobbies: p.hobbies }
}

// ── Formulario "Mis datos" ─────────────────────────────────────────────────────
//
// Límites de PUT /api/profile (backend/app/profile/schemas.py). Se comprueban aquí,
// campo por campo, para que un solo dato fuera de rango no haga fallar el guardado entero
// con un "revisa el formulario" que no dice qué revisar.
export const MAX_HOBBIES = 20
export const MAX_LARGO_HOBBY = 80
export const MAX_SOBRE_MI = 1000
export const MAX_LARGO_URL = 2048

// Pydantic cuenta caracteres (puntos de código), no unidades UTF-16 como .length: un emoji
// es 1 para el backend y 2 para JS. Al recortar, el backend quita también \x85, que el trim()
// de JS deja; aquí se quitan además los separadores invisibles \x1c-\x1f. Recortar un poco MÁS
// que el backend es seguro: lo que pasa aquí nunca lo rechaza el servidor por espacios.
function largo(texto: string): number {
  return [...texto].length
}
function recortar(texto: string): string {
  // eslint-disable-next-line no-control-regex -- a propósito: caracteres invisibles en los extremos
  return texto.replace(/^[\s\x1c-\x1f\x85]+|[\s\x1c-\x1f\x85]+$/gu, '')
}
function inicio(texto: string, caracteres: number): string {
  return [...texto].slice(0, caracteres).join('')
}

/** Lo que se ve en el textarea de hobbies: uno por línea. */
export function hobbiesComoTexto(hobbies: string[]): string {
  return hobbies.join('\n')
}

/**
 * El texto del textarea convertido en lista. Se llama SOLO al guardar: si se hiciera en
 * cada tecla, el salto de línea recién escrito (una línea vacía) desaparecería antes de
 * poder escribir el siguiente hobby.
 */
export function textoComoHobbies(texto: string): string[] {
  return texto.split(/\r?\n/).map(recortar).filter((h) => h.length > 0)
}

export interface BorradorPerfil {
  nombre: string
  sobreMi: string
  github: string
  linkedin: string
  correo: string
  hobbiesTexto: string
}

export type CampoPerfil = 'nombre' | 'sobreMi' | 'github' | 'linkedin' | 'hobbies'
export type ErroresPerfil = Partial<Record<CampoPerfil, string>>

export function borradorDesdePerfil(p: Perfil): BorradorPerfil {
  return {
    nombre: p.nombre,
    sobreMi: p.sobreMi,
    github: p.redes.github,
    linkedin: p.redes.linkedin,
    correo: p.redes.correo,
    hobbiesTexto: hobbiesComoTexto(p.hobbies),
  }
}

/** Valida y normaliza el formulario. O devuelve el perfil listo para guardar, o los errores. */
export function prepararPerfil(b: BorradorPerfil): { perfil: Perfil; errores: null } | { perfil: null; errores: ErroresPerfil } {
  const errores: ErroresPerfil = {}
  const nombre = recortar(b.nombre)
  if (largo(nombre) < 2 || largo(nombre) > 80) errores.nombre = 'Escribe tu nombre (entre 2 y 80 caracteres).'
  const sobreMi = recortar(b.sobreMi)
  if (largo(sobreMi) > MAX_SOBRE_MI) errores.sobreMi = `"Sobre mí" admite hasta ${MAX_SOBRE_MI} caracteres.`

  const github = normalizarUrlDePerfil(b.github)
  if (github === null) errores.github = 'Escribe una dirección web, por ejemplo github.com/tu-usuario.'
  else if (github.length > MAX_LARGO_URL) errores.github = 'Esa dirección es demasiado larga.'
  const linkedin = normalizarUrlDePerfil(b.linkedin)
  if (linkedin === null) errores.linkedin = 'Escribe una dirección web, por ejemplo linkedin.com/in/tu-usuario.'
  else if (linkedin.length > MAX_LARGO_URL) errores.linkedin = 'Esa dirección es demasiado larga.'

  const hobbies = textoComoHobbies(b.hobbiesTexto)
  const demasiadoLargo = hobbies.find((h) => largo(h) > MAX_LARGO_HOBBY)
  if (hobbies.length > MAX_HOBBIES) errores.hobbies = `Puedes guardar hasta ${MAX_HOBBIES} hobbies; tienes ${hobbies.length}.`
  else if (demasiadoLargo) errores.hobbies = `Cada hobby admite hasta ${MAX_LARGO_HOBBY} caracteres: "${inicio(demasiadoLargo, 24)}…" es más largo.`

  if (Object.keys(errores).length > 0) return { perfil: null, errores }
  return {
    perfil: {
      nombre,
      sobreMi,
      redes: { github: github ?? '', linkedin: linkedin ?? '', correo: b.correo },
      hobbies,
    },
    errores: null,
  }
}

/** Los datos se guardaron en el servidor, pero no se pudo volver a leer la sesión para
 *  mostrarlos: el formulario lo dice en vez de cerrar como si todo estuviera al día. */
export class GuardadoSinRefrescar extends Error {
  constructor() {
    super('Tus datos se guardaron, pero no se pudo actualizar esta pantalla. Recarga la página para verlos.')
    this.name = 'GuardadoSinRefrescar'
  }
}
