// "Mis datos" — la información propia del estudiante que alimenta `datos` en la
// vista previa de los encargos.
//
// La fuente de verdad es Postgres, a través del perfil que devuelve
// /api/auth/bootstrap. localStorage ya no guarda el perfil: solo queda como
// origen de una migración de una sola vez para quien tenga datos de la época en
// que sí vivía ahí.

import type { BackendUser } from './backendTypes'

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

export function leerPerfilLegado(): Perfil | null {
  try {
    const guardado = localStorage.getItem(CLAVE_LEGADA)
    if (!guardado) return null
    const crudo = JSON.parse(guardado) as Partial<Perfil>
    if (!crudo || typeof crudo !== 'object') return null
    return { ...PERFIL_DEFECTO, ...crudo }
  } catch {
    return null
  }
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
