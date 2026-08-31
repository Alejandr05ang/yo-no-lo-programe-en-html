import { ENCARGOS, NUMEROS_DE_ENCARGO } from './encargos'
import { encargoFrontera, encargosAceptados } from './progreso'

// Las 10 sesiones del cronograma (brief.md §4). El copy sale del mockup 1e.

export interface Sesion {
  codigo: string
  duracion: string
  tema: string
  pieza: string
  /** Capa del currículo en espiral (1–5); null en las sesiones sin encargos. */
  capa: number | null
  /** Números de encargo de esta sesión, en orden. */
  encargos: number[]
}

const encargosDe = (cod: string) =>
  NUMEROS_DE_ENCARGO.filter((n) => ENCARGOS[n].sesion === cod)

export const SESIONES: Sesion[] = [
  { codigo: 'L1', duracion: '2h', tema: 'Diagnóstico + algoritmos', pieza: 'Setup del entorno', capa: null, encargos: [] },
  { codigo: 'Ma1', duracion: '4h', tema: 'Variables + DOM', pieza: 'Header y "sobre mí"', capa: 1, encargos: encargosDe('Ma1') },
  { codigo: 'Mi1', duracion: '2h', tema: 'Más elementos', pieza: 'Contacto y redes', capa: 2, encargos: encargosDe('Mi1') },
  { codigo: 'Ju1', duracion: '4h', tema: 'Condicionales → bucles', pieza: 'Saludo dinámico + lista de hobbies', capa: 3, encargos: encargosDe('Ju1') },
  { codigo: 'V1', duracion: '2h', tema: 'Bucles que no paran', pieza: 'Reloj o carrusel', capa: 3, encargos: encargosDe('V1') },
  { codigo: 'L2', duracion: '2h', tema: 'Bucle + condición', pieza: 'Proyectos con filtro', capa: 4, encargos: encargosDe('L2') },
  { codigo: 'Ma2', duracion: '4h', tema: 'Matrices + funciones', pieza: 'Skills agrupadas', capa: 5, encargos: encargosDe('Ma2') },
  { codigo: 'Mi2', duracion: '2h', tema: 'Funciones', pieza: 'Render distinto por tipo', capa: 5, encargos: encargosDe('Mi2') },
  { codigo: 'Ju2', duracion: '4h', tema: 'Git + deploy', pieza: 'URL pública real', capa: null, encargos: [] },
  { codigo: 'V2', duracion: '2h', tema: 'Diagnóstico final', pieza: 'Demo de portafolios', capa: null, encargos: [] },
]

export const CAPAS = [
  'Acción manual',
  'Acción condicional',
  'Repetición de una acción',
  'Repetición + condición',
  'Acciones distintas según el dato',
]

export type EstadoSesion = 'hecho' | 'hoy' | 'manana' | 'cerrado'

export interface SesionConEstado extends Sesion {
  estado: EstadoSesion
  /** Encargo al que lleva el clic (null si no es navegable). */
  destino: number | null
  /** "1 de 2" cuando la sesión está en curso con varios encargos. */
  avanceTexto: string
}

/** Estado de cada sesión a partir del progreso real. */
export function sesionesConEstado(): SesionConEstado[] {
  const frontera = encargoFrontera()
  const aceptados = new Set(encargosAceptados())
  const idxHoy = SESIONES.findIndex((s) => s.encargos.includes(frontera))

  return SESIONES.map((s, i) => {
    let estado: EstadoSesion
    let destino: number | null = null
    let avanceTexto = ''

    if (i === idxHoy) {
      estado = 'hoy'
      destino = frontera
      if (s.encargos.length > 1) {
        const hechos = s.encargos.filter((n) => aceptados.has(n)).length
        avanceTexto = `${hechos + 1} de ${s.encargos.length}`
      }
    } else if (idxHoy !== -1 && i === idxHoy + 1) {
      estado = 'manana'
    } else if (idxHoy === -1 || i < idxHoy) {
      // ya pasó: hecho si sus encargos están todos aceptados (o si no tiene encargos)
      estado = 'hecho'
      destino = s.encargos[0] ?? null
    } else {
      estado = 'cerrado'
    }

    return { ...s, estado, destino, avanceTexto }
  })
}

/** Capa del currículo en la que está el estudiante ahora (1–5). */
export function capaActual(): number {
  const frontera = encargoFrontera()
  const s = SESIONES.find((x) => x.encargos.includes(frontera))
  return s?.capa ?? 1
}
