import { ENCARGOS } from './encargos'
import { ejecutarPreview } from './sandbox'
import type { ResultadoRevision } from './tipos'

// Aproximación LOCAL de la revisión automática — solo para el andamiaje del frontend.
//
// La revisión real corre en el SERVIDOR (subproceso Deno) con casos ocultos de tamaño
// variable que el cliente nunca ve (docs/arquitectura.md §2, brief §2.3, §5.4). Esto es
// una versión de juguete: corre el código una vez y verifica el DOM resultante contra
// unos criterios fijos por encargo. No detecta hardcodeo ni prueba con datos distintos.

type DatosLike = Record<string, unknown>

interface CasoLocal {
  descripcion: string
  verificar: (doc: Document, datos: DatosLike) => boolean
}

/** Cuántas veces aparece `texto` como substring de `contenido`. */
function contarOcurrencias(contenido: string, texto: string): number {
  if (!texto) return 0
  return contenido.split(texto).length - 1
}

// Helpers para leer `datos` (unknown) sin asumir su forma exacta — varía por encargo.
function comoLista(v: unknown): DatosLike[] {
  return Array.isArray(v) ? (v as DatosLike[]) : []
}
function comoObjeto(v: unknown): DatosLike {
  return v && typeof v === 'object' ? (v as DatosLike) : {}
}
function comoTexto(v: unknown): string {
  return typeof v === 'string' ? v : ''
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

  4: [
    {
      descripcion: 'Lo anterior sigue ahí (título, párrafos, subtítulo)',
      verificar: (d) => !!d.querySelector('h1') && d.querySelectorAll('p').length >= 2 && !!d.querySelector('h2'),
    },
    {
      descripcion: 'Hay un enlace por cada red que tenés cargada',
      verificar: (d, datos) => {
        const redes = comoObjeto(datos.redes)
        return d.querySelectorAll('a').length === Object.keys(redes).length
      },
    },
    {
      descripcion: 'Cada enlace apunta a la dirección correcta',
      verificar: (d, datos) => {
        const redes = comoObjeto(datos.redes)
        const hrefs = [...d.querySelectorAll('a')].map((a) => a.getAttribute('href'))
        return Object.values(redes).every((url) => hrefs.includes(comoTexto(url)))
      },
    },
  ],

  // Reorganización del 19-sep (docs/decisiones.md): 5 y 6 (hobbies) cambiaron de lugar con
  // el aviso condicional (ahora 7) — ver la tabla antes/después en docs/decisiones.md.
  5: [
    {
      descripcion: 'Hay una lista',
      verificar: (d) => !!d.querySelector('ul, ol'),
    },
    {
      descripcion: 'La lista tiene al menos 3 items',
      verificar: (d) => d.querySelectorAll('li').length >= 3,
    },
    {
      descripcion: 'Ningún item está vacío',
      verificar: (d) => {
        const lis = [...d.querySelectorAll('li')]
        return lis.length > 0 && lis.every((li) => (li.textContent ?? '').trim().length > 0)
      },
    },
  ],

  6: [
    {
      descripcion: 'Hay una lista',
      verificar: (d) => !!d.querySelector('ul, ol'),
    },
    {
      descripcion: 'Hay un item por cada hobby en datos.hobbies',
      verificar: (d, datos) => {
        const hobbies = comoLista(datos.hobbies)
        return d.querySelectorAll('li').length === hobbies.length
      },
    },
    {
      descripcion: 'El texto de cada item sale de datos.hobbies',
      verificar: (d, datos) => {
        const hobbies = comoLista(datos.hobbies).map((h) => comoTexto(h))
        const textos = [...d.querySelectorAll('li')].map((li) => (li.textContent ?? '').trim())
        return hobbies.length > 0 && hobbies.every((h) => textos.includes(h))
      },
    },
  ],

  7: [
    {
      descripcion: 'El título sigue estando',
      verificar: (d) => !!d.querySelector('h1')?.textContent?.trim(),
    },
    {
      descripcion: 'Aparece un aviso de "en construcción"',
      verificar: (d) =>
        [...d.querySelectorAll('p')].some((p) => /construcci[oó]n/i.test(p.textContent ?? '')),
    },
    {
      descripcion: 'Ningún párrafo queda vacío',
      verificar: (d) => {
        const ps = [...d.querySelectorAll('p')]
        return ps.length > 0 && ps.every((p) => (p.textContent ?? '').trim().length > 0)
      },
    },
  ],

  // Nivel 6 (niveles.md) — snapshot único: ejecutarPreview corre el código una vez y
  // captura el resultado de la primera llamada de cadaSegundo(), así que se puede
  // verificar "qué se ve en el primer instante" pero no el avance automático en sí.
  8: [
    {
      descripcion: 'Muestra una imagen',
      verificar: (d) => !!d.querySelector('img'),
    },
    {
      descripcion: 'El proyecto mostrado es uno de los destacados',
      // crearImagen() pone la url en el atributo src — el nombre solo queda en "alt"
      // (no aparece en textContent), así que se compara contra src, no contra texto.
      verificar: (d, datos) => {
        const urls = comoLista(datos.proyectos)
          .filter((p) => p.destacado === true)
          .map((p) => comoTexto(p.imagenUrl))
        const srcs = [...d.querySelectorAll('img')].map((img) => img.getAttribute('src'))
        return urls.some((u) => srcs.includes(u))
      },
    },
    {
      descripcion: 'No muestra los proyectos que no son destacados',
      verificar: (d, datos) => {
        const urls = comoLista(datos.proyectos)
          .filter((p) => p.destacado !== true)
          .map((p) => comoTexto(p.imagenUrl))
        const srcs = [...d.querySelectorAll('img')].map((img) => img.getAttribute('src'))
        return !urls.some((u) => srcs.includes(u))
      },
    },
  ],

  9: [
    {
      descripcion: 'Se muestran los proyectos terminados',
      verificar: (d, datos) => {
        const terminados = comoLista(datos.proyectos)
          .filter((p) => p.terminado === true)
          .map((p) => comoTexto(p.nombre))
        const texto = d.body.textContent ?? ''
        return terminados.length > 0 && terminados.every((n) => texto.includes(n))
      },
    },
    {
      descripcion: 'No se muestran los proyectos sin terminar',
      verificar: (d, datos) => {
        const sinTerminar = comoLista(datos.proyectos)
          .filter((p) => p.terminado !== true)
          .map((p) => comoTexto(p.nombre))
        const texto = d.body.textContent ?? ''
        return !sinTerminar.some((n) => texto.includes(n))
      },
    },
    {
      descripcion: 'Cada proyecto terminado aparece una sola vez',
      verificar: (d, datos) => {
        const terminados = comoLista(datos.proyectos)
          .filter((p) => p.terminado === true)
          .map((p) => comoTexto(p.nombre))
        const texto = d.body.textContent ?? ''
        return terminados.every((n) => contarOcurrencias(texto, n) === 1)
      },
    },
    {
      descripcion: 'El título y los párrafos de antes siguen estando',
      verificar: (d) => !!d.querySelector('h1') && d.querySelectorAll('p').length >= 2,
    },
  ],

  10: [
    {
      descripcion: 'Hay un título por cada categoría de datos.skills',
      verificar: (d, datos) => {
        const skills = comoObjeto(datos.skills)
        const titulos = [...d.querySelectorAll('h2, h3')].map((t) => (t.textContent ?? '').trim())
        return Object.keys(skills).every((cat) => titulos.includes(cat))
      },
    },
    {
      descripcion: 'Cada categoría muestra sus items',
      verificar: (d, datos) => {
        const skills = comoObjeto(datos.skills)
        const totalEsperado = Object.values(skills).reduce(
          (n: number, items) => n + comoLista(items).length,
          0,
        )
        return d.querySelectorAll('li').length === totalEsperado
      },
    },
    {
      descripcion: 'El texto de los items sale de datos.skills',
      verificar: (d, datos) => {
        const skills = comoObjeto(datos.skills)
        const esperados = Object.values(skills).flatMap((items) =>
          comoLista(items).map((i) => comoTexto(i)),
        )
        const textos = [...d.querySelectorAll('li')].map((li) => (li.textContent ?? '').trim())
        return esperados.every((e) => textos.includes(e))
      },
    },
  ],

  11: [
    {
      descripcion: 'El proyecto de tipo "demo" muestra un enlace a su url',
      verificar: (d, datos) => {
        const demos = comoLista(datos.proyectos).filter((p) => comoTexto(p.tipo) === 'demo')
        const hrefs = [...d.querySelectorAll('a')].map((a) => a.getAttribute('href'))
        return demos.length > 0 && demos.every((p) => hrefs.includes(comoTexto(p.url)))
      },
    },
    {
      descripcion: 'El proyecto de tipo "texto" aparece con su nombre',
      verificar: (d, datos) => {
        const textos = comoLista(datos.proyectos).filter((p) => comoTexto(p.tipo) === 'texto')
        const contenido = d.body.textContent ?? ''
        return textos.length > 0 && textos.every((p) => contenido.includes(comoTexto(p.nombre)))
      },
    },
    {
      descripcion: 'Un tipo que no está en la lista conocida no rompe la página',
      verificar: (d, datos) => {
        const conocidos = ['demo', 'texto']
        const desconocidos = comoLista(datos.proyectos).filter(
          (p) => !conocidos.includes(comoTexto(p.tipo)),
        )
        const contenido = d.body.textContent ?? ''
        return desconocidos.every((p) => contenido.includes(comoTexto(p.nombre)))
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

  const datosObj = comoObjeto(datos)
  const evaluados = casos.map((c) => ({
    descripcion: c.descripcion,
    estado: (r.ok && safe(() => c.verificar(doc, datosObj)) ? 'pasa' : 'falla') as 'pasa' | 'falla',
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
