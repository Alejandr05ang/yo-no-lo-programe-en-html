import { ENCARGOS } from './encargos'
import { ejecutarPreview } from './sandbox'
import type { ResultadoRevision } from './tipos'

// Aproximación LOCAL de la revisión automática — solo para el andamiaje del frontend.
//
// La revisión real corre en el SERVIDOR (subproceso Deno) con casos ocultos de tamaño
// variable que el cliente nunca ve (docs/arquitectura.md §2, brief §2.3, §5.4). Esto es
// una versión de juguete: corre el código una vez y verifica el DOM resultante contra
// unos criterios fijos por encargo. No detecta hardcodeo ni prueba con datos distintos.

interface CasoLocal {
  descripcion: string
  verificar: (doc: Document) => boolean
}

const CASOS_POR_ENCARGO: Record<number, CasoLocal[]> = {
  1: [
    {
      descripcion: 'La página tiene un título',
      verificar: (d) => !!d.querySelector('h1'),
    },
    {
      descripcion: 'El título no dice "tu nombre"',
      verificar: (d) => {
        const t = d.querySelector('h1')?.textContent?.trim().toLowerCase() ?? ''
        return t.length > 0 && t !== 'tu nombre'
      },
    },
    {
      descripcion: 'Hay un solo título',
      verificar: (d) => d.querySelectorAll('h1').length === 1,
    },
  ],

  2: [
    {
      descripcion: 'El título sigue estando',
      verificar: (d) => !!d.querySelector('h1')?.textContent?.trim(),
    },
    {
      descripcion: 'Hay al menos dos párrafos',
      verificar: (d) => d.querySelectorAll('p').length >= 2,
    },
    {
      descripcion: 'Ningún párrafo está vacío',
      verificar: (d) => {
        const ps = [...d.querySelectorAll('p')]
        return ps.length > 0 && ps.every((p) => (p.textContent ?? '').trim().length > 0)
      },
    },
  ],

  3: [
    {
      descripcion: 'El título y los párrafos siguen estando',
      verificar: (d) => !!d.querySelector('h1') && d.querySelectorAll('p').length >= 2,
    },
    {
      descripcion: 'Hay un título de sección (subtítulo)',
      verificar: (d) => !!d.querySelector('h2')?.textContent?.trim(),
    },
    {
      descripcion: 'El subtítulo viene antes de los párrafos',
      verificar: (d) => {
        const nodos = [...d.querySelectorAll('h2, p')]
        const primerH2 = nodos.findIndex((n) => n.tagName === 'H2')
        const primerP = nodos.findIndex((n) => n.tagName === 'P')
        return primerH2 !== -1 && primerP !== -1 && primerH2 < primerP
      },
    },
  ],
}

export async function revisarLocalmente(
  numeroEncargo: number,
  codigo: string,
  datos: unknown,
): Promise<ResultadoRevision> {
  const casos = CASOS_POR_ENCARGO[numeroEncargo]

  // Encargo sin criterios definidos aún: no se puede aceptar (evita el auto-avance).
  if (!casos || casos.length === 0) {
    const total = ENCARGOS[numeroEncargo]?.totalCasos ?? 1
    return {
      casos: Array.from({ length: total }, (_, i) => ({
        descripcion: `Caso ${i + 1}`,
        estado: 'falla' as const,
      })),
      casosPasados: 0,
      casosTotales: total,
      nota: 'Este encargo todavía no tiene revisión automática (pendiente de diseño del contenido).',
    }
  }

  const r = await ejecutarPreview(codigo, datos)
  const doc = new DOMParser().parseFromString(
    `<body>${r.ok ? r.html : ''}</body>`,
    'text/html',
  )

  const evaluados = casos.map((c) => ({
    descripcion: c.descripcion,
    estado: (r.ok && safe(() => c.verificar(doc)) ? 'pasa' : 'falla') as 'pasa' | 'falla',
  }))
  const pasados = evaluados.filter((c) => c.estado === 'pasa').length

  return {
    casos: evaluados,
    casosPasados: pasados,
    casosTotales: evaluados.length,
    nota: r.ok
      ? 'Cada revisión prueba con datos distintos. Ninguno te dice cómo arreglarlo.'
      : `El código no llegó a ejecutarse: ${r.error?.mensaje ?? 'error'}.`,
  }
}

function safe(fn: () => boolean): boolean {
  try {
    return fn()
  } catch {
    return false
  }
}
