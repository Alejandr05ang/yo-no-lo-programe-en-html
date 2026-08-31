// Datos de ejemplo de la cohorte para el dashboard del instructor (pantalla 1d).
// Todo mock: el dashboard agrega a una cohorte entera, que el entorno de desarrollo no
// tiene. En producción lo sirve el backend (progreso agregado + señales derivadas).
// Copy tomado del mockup.

export interface FilaEstudiante {
  pareja: string
  estudiante: string
  basePrevia: 'sí' | 'no'
  casosOcultos: string // "4 / 4"
  intentos: number
  checkpoint: { texto: string; ok: boolean } // "pendiente" | "ok · Mi1"
  /** Señal derivada (no es una nota). null = sin señal. */
  senal: { texto: string; alerta: boolean } | null
}

export interface Metrica {
  kicker: string
  valor: number
  meta: string
  alerta?: boolean
}

export const COHORTE = {
  nombre: 'Cohorte 2026-B',
  estudiantes: 24,
  encargoTitulo: 'Encargo 07 — la lista que no se queda quieta',
  actualizado: 'hace 30 s',
  metricas: [
    { kicker: 'Aceptado', valor: 11, meta: 'de 24' },
    { kicker: 'En progreso', valor: 9, meta: '≥ 1 intento' },
    { kicker: 'Estancados', valor: 4, meta: '> 15 min sin cambio', alerta: true },
    { kicker: 'Retos platino', valor: 6, meta: 'extra-crédito' },
  ] as Metrica[],
  filas: [
    { pareja: 'P-01', estudiante: 'Ana Rivas', basePrevia: 'no', casosOcultos: '4 / 4', intentos: 9, checkpoint: { texto: 'pendiente', ok: false }, senal: null },
    { pareja: 'P-01', estudiante: 'Diego Salas', basePrevia: 'sí', casosOcultos: '4 / 4', intentos: 3, checkpoint: { texto: 'ok · Mi1', ok: true }, senal: null },
    { pareja: 'P-02', estudiante: 'Laura Peña', basePrevia: 'no', casosOcultos: '1 / 4', intentos: 14, checkpoint: { texto: 'ok · Mi1', ok: true }, senal: { texto: 'copiar/pegar', alerta: true } },
    { pareja: 'P-02', estudiante: 'Iván Cortés', basePrevia: 'sí', casosOcultos: '4 / 4', intentos: 2, checkpoint: { texto: 'pendiente', ok: false }, senal: { texto: 'pasó sin explicar', alerta: true } },
    { pareja: 'P-03', estudiante: 'Sofía Mena', basePrevia: 'no', casosOcultos: '2 / 4', intentos: 11, checkpoint: { texto: 'ok · Ju1', ok: true }, senal: null },
    { pareja: 'P-03', estudiante: 'Julián Ortiz', basePrevia: 'sí', casosOcultos: '4 / 4', intentos: 1, checkpoint: { texto: 'ok · Ju1', ok: true }, senal: { texto: 'listo para platino', alerta: false } },
    { pareja: 'P-04', estudiante: 'Camila Duque', basePrevia: 'no', casosOcultos: '0 / 4', intentos: 2, checkpoint: { texto: 'pendiente', ok: false }, senal: { texto: 'estancada 22 min', alerta: true } },
    { pareja: 'P-04', estudiante: 'Mateo Ruiz', basePrevia: 'sí', casosOcultos: '3 / 4', intentos: 6, checkpoint: { texto: 'ok · Mi1', ok: true }, senal: null },
  ] as FilaEstudiante[],
  checkpointEnCurso: {
    estudiante: 'Camila Duque',
    nota: 'Explica el bucle con sus palabras; no logra decir qué pasa si la lista llega vacía.',
  },
  sugerencia: {
    texto:
      'Iván pasó los cuatro casos en dos intentos y no tiene checkpoint del día. Agéndalo antes de cerrar la sesión.',
    accion: 'Agendar con Iván',
  },
}
