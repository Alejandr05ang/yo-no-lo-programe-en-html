import type { EstadoGuardado, SalidaEjecucion } from './tipos'

// Datos de ejemplo que no dependen del encargo. Los encargos en sí están en encargos.ts.

// En un encargo recién abierto todavía no hay salida de consola.
export const salidaEjemplo: SalidaEjecucion | null = null

export const guardadoEjemplo: EstadoGuardado = {
  guardadoHaceSegundos: 2,
  intentos: 0,
}

// El portafolio publicado que ve un visitante (pantalla 1g, barra de URL de 1a).
export const portafolioEjemplo = {
  nombre: 'Ana Rivas',
  subtitulo: 'Estudiante de ingeniería · Bogotá',
  url: 'ana-rivas.taller.dev',
}

/** Texto del archivo datos.js (solo lectura) a partir del objeto de datos del encargo. */
export function datosComoTexto(datos: Record<string, unknown>): string {
  return (
    '// Este archivo lo puede cambiar el evaluador; vos no lo escribís.\n' +
    '// "datos" ya existe, no hace falta crearlo.\n' +
    `const datos = ${JSON.stringify(datos, null, 2)}\n`
  )
}
