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
}

export async function revisarLocalmente(
  numeroEncargo: number,
  codigo: string,
  datos: unknown,
): Promise<ResultadoRevision> {
  const casos = CASOS_POR_ENCARGO[numeroEncargo] ?? []
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
