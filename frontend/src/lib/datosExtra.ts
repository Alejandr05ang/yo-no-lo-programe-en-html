// Datos propios del estudiante que el perfil del servidor no guarda: su lista de proyectos
// (`datos.proyectos`) y cada cuántos segundos corre cadaSegundo() (`datos.segundos`).
// Viven en el navegador, uno por cuenta (la clave lleva el id de usuario).

export interface ProyectoDato {
  nombre: string
  imagenUrl: string
  destacado: boolean
  terminado: boolean
  tipo: string
  url?: string
}

export interface DatosExtra {
  /** null = sin lista propia: se usan los proyectos de ejemplo del encargo. */
  proyectos: ProyectoDato[] | null
  /** null = el valor por defecto (1 segundo). */
  segundos: number | null
}

export const DATOS_EXTRA_VACIOS: DatosExtra = { proyectos: null, segundos: null }
export const MAX_PROYECTOS = 100
export const MAX_SEGUNDOS = 3600
const clave = (usuario: string) => `ve:datosExtra:${usuario}`

export function comoProyecto(x: unknown): ProyectoDato | null {
  if (!x || typeof x !== 'object') return null
  const p = x as Record<string, unknown>
  const texto = (v: unknown) => (typeof v === 'string' ? v : '')
  const proyecto: ProyectoDato = {
    nombre: texto(p.nombre),
    imagenUrl: texto(p.imagenUrl),
    destacado: p.destacado === true,
    terminado: p.terminado === true,
    tipo: texto(p.tipo),
  }
  if (texto(p.url)) proyecto.url = texto(p.url)
  return proyecto
}

export function leerDatosExtra(usuario: string | undefined): DatosExtra {
  if (!usuario) return DATOS_EXTRA_VACIOS
  try {
    const crudo = JSON.parse(localStorage.getItem(clave(usuario)) ?? 'null') as Partial<Record<keyof DatosExtra, unknown>> | null
    if (!crudo || typeof crudo !== 'object') return DATOS_EXTRA_VACIOS
    const proyectos = Array.isArray(crudo.proyectos)
      ? crudo.proyectos.map(comoProyecto).filter((p): p is ProyectoDato => p !== null).slice(0, MAX_PROYECTOS)
      : null
    const s = Number(crudo.segundos)
    return { proyectos, segundos: Number.isFinite(s) && s > 0 ? Math.min(s, MAX_SEGUNDOS) : null }
  } catch {
    return DATOS_EXTRA_VACIOS
  }
}

export function guardarDatosExtra(usuario: string | undefined, d: DatosExtra): void {
  if (!usuario) return
  try {
    localStorage.setItem(clave(usuario), JSON.stringify(d))
  } catch {
    /* sin almacenamiento: los cambios valen solo hasta recargar */
  }
}

/** Lo que se agrega a `datos`: solo lo que el estudiante eligió, para no tapar los ejemplos. */
export function datosExtraComoDatos(d: DatosExtra): Record<string, unknown> {
  const salida: Record<string, unknown> = {}
  if (d.proyectos) salida.proyectos = d.proyectos
  if (d.segundos) salida.segundos = d.segundos
  return salida
}

export interface ErroresExtra {
  proyectos: Record<number, string>
  segundos?: string
}

/** Valida el formulario. Devuelve los datos limpios o los errores por fila. */
export function prepararDatosExtra(
  proyectos: ProyectoDato[],
  segundosTexto: string,
): { datos: DatosExtra; errores: null } | { datos: null; errores: ErroresExtra } {
  const errores: ErroresExtra = { proyectos: {} }
  const limpios: ProyectoDato[] = []
  proyectos.forEach((p, i) => {
    const nombre = p.nombre.trim()
    if (!nombre) { errores.proyectos[i] = 'Escribe el nombre del proyecto.'; return }
    // crearImagen() solo acepta https://: sin él la imagen no se ve ni en la vista previa ni al publicar.
    let imagenUrl = p.imagenUrl.trim()
    if (/^http:\/\//i.test(imagenUrl)) { errores.proyectos[i] = 'La imagen debe empezar con https:// (con http:// no se muestra).'; return }
    if (imagenUrl && !/^https:\/\//i.test(imagenUrl)) imagenUrl = `https://${imagenUrl}`
    const limpio: ProyectoDato = {
      nombre,
      imagenUrl,
      destacado: p.destacado,
      terminado: p.terminado,
      tipo: p.tipo.trim() || 'texto',
    }
    const url = (p.url ?? '').trim()
    if (url) limpio.url = url
    limpios.push(limpio)
  })
  let segundos: number | null = null
  const t = segundosTexto.trim().replace(',', '.')
  if (t) {
    const n = Number(t)
    if (!Number.isFinite(n) || n <= 0 || n > MAX_SEGUNDOS) errores.segundos = `Escribe un número mayor que 0 y hasta ${MAX_SEGUNDOS}.`
    else segundos = n
  }
  if (Object.keys(errores.proyectos).length > 0 || errores.segundos) return { datos: null, errores }
  return { datos: { proyectos: limpios, segundos }, errores: null }
}
