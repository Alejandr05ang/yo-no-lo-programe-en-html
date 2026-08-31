// "Mis datos" — la información propia del estudiante que alimenta `datos` en la vista previa.
// Vive en localStorage (por navegador). Los encargos cuya gracia es "datos que no controlás"
// (E7 hobbies, etc.) igual reciben datos de tamaño variable en los tests ocultos del servidor;
// el perfil solo hace que la PREVIEW se sienta propia.
// En producción esto lo guarda el backend (pantalla de perfil / diagnóstico).

export interface Perfil {
  nombre: string
  sobreMi: string
  redes: { github: string; linkedin: string; correo: string }
  hobbies: string[]
}

const CLAVE = 've:perfil'

// Precargado con datos de ejemplo para que las previews funcionen de una;
// el estudiante los reemplaza por los suyos.
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

export function leerPerfil(): Perfil {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (!guardado) return PERFIL_DEFECTO
    return { ...PERFIL_DEFECTO, ...JSON.parse(guardado) }
  } catch {
    return PERFIL_DEFECTO
  }
}

export function guardarPerfil(p: Perfil) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p))
  } catch {
    /* sin almacenamiento: se mantiene solo en memoria */
  }
}

/** El perfil en la forma del objeto `datos` (redes vacías fuera). */
export function perfilComoDatos(p: Perfil): Record<string, unknown> {
  const redes = Object.fromEntries(Object.entries(p.redes).filter(([, v]) => v.trim() !== ''))
  return { nombre: p.nombre, sobreMi: p.sobreMi, redes, hobbies: p.hobbies }
}
