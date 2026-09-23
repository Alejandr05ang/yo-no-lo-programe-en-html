import type { EstadoGuardado, SalidaEjecucion } from './tipos'

// Datos de ejemplo que no dependen del encargo. Los encargos en sí están en encargos.ts.

// En un encargo recién abierto todavía no hay salida de consola.
export const salidaEjemplo: SalidaEjecucion | null = null

export const guardadoEjemplo: EstadoGuardado = {
  estado: 'saved',
  intentos: 2,
}

// El portafolio publicado que ve un visitante (pantalla 1g, barra de URL de 1a).
export const portafolioEjemplo = {
  nombre: 'Ana Rivas',
  subtitulo: 'Estudiante de ingeniería · Bogotá',
  url: 'ana-rivas.taller.dev',
}

// Primera línea fija de datos.js — sirve de marca para detectar si un borrador guardado es,
// por error, el contenido de datos.js en vez del código de portafolio.js (ver pareceContenidoDeDatos).
const MARCA_DATOS = '// Este archivo lo puede cambiar el evaluador; vos no lo escribís.'

/** Texto del archivo datos.js (solo lectura) a partir del objeto de datos del encargo. */
export function datosComoTexto(datos: Record<string, unknown>): string {
  return (
    `${MARCA_DATOS}\n` +
    '// "datos" ya existe, no hace falta crearlo.\n' +
    `const datos = ${JSON.stringify(datos, null, 2)}\n`
  )
}

/** Detecta un borrador de portafolio.js que en realidad es el contenido de datos.js — un
 *  bug de Monaco (EditorPanel.tsx) podía guardarlo así al cambiar de pestaña, antes de este
 *  arreglo. Se usa para sanear lo que ya haya quedado guardado (sessionStorage, localStorage,
 *  backend) de sesiones anteriores al arreglo, no solo para prevenir el caso nuevo. */
export function pareceContenidoDeDatos(codigo: string): boolean {
  return codigo.trimStart().startsWith(MARCA_DATOS)
}
