import { normalizarEnlace } from './enlaces.ts'
import { ENCARGOS } from './encargos.ts'
import { ejecutarPreview } from './sandbox.ts'
import type { ResultadoRevision } from './tipos'

// Revisión automática LOCAL: es la que acepta los encargos hoy. El servidor guarda cada
// entrega (POST /submit) y el estado accepted, pero no corre casos propios; el autograder
// Deno con casos ocultos de docs/arquitectura.md sigue sin integrarse. Esta revisión corre
// el código una vez y verifica el DOM resultante contra unos criterios fijos por encargo.
// No detecta hardcodeo ni prueba con datos distintos.

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

/** Las direcciones de todos los enlaces, ya normalizadas con la MISMA regla que aplica la
 *  vista previa (lib/enlaces.ts). Normalizar los dos lados hace que "wikipedia.com" en
 *  datos y "https://wikipedia.com" en la página cuenten como el mismo enlace. */
function destinosDeEnlaces(doc: Document): (string | null)[] {
  return [...doc.querySelectorAll('a')].map((a) => normalizarEnlace(a.getAttribute('href') ?? ''))
}

/** ¿Hay un enlace que lleve a `url`? Nunca por coincidir en "ninguna dirección": un enlace
 *  vacío no cuenta como el enlace a una dirección que no se pudo interpretar. */
function hayEnlaceA(destinos: (string | null)[], url: unknown): boolean {
  const destino = normalizarEnlace(comoTexto(url))
  return destino !== null && destinos.includes(destino)
}

/** Busca una lista concreta por sus items directos, sin contar listas heredadas de otras secciones. */
function encontrarListaConItems(doc: Document, esperados: string[]): Element | null {
  for (const lista of [...doc.querySelectorAll('ul, ol')]) {
    const items = [...lista.children]
      .filter((n) => n.tagName === 'LI')
      .map((n) => (n.textContent ?? '').trim())
    if (items.length === esperados.length && esperados.every((item) => items.includes(item))) {
      return lista
    }
  }
  return null
}

function gruposDeSkills(v: unknown): { categoria: string; items: string[] }[] {
  return comoLista(v).map((grupo) => ({
    categoria: comoTexto(grupo.categoria),
    items: comoLista(grupo.items).map((item) => comoTexto(item)),
  }))
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
      descripcion: 'Hay un título de sección (subtítulo)',
      verificar: (d) => !!d.querySelector('h2')?.textContent?.trim(),
    },
    {
      descripcion: 'El subtítulo tiene texto',
      verificar: (d) => !!d.querySelector('h2')?.textContent?.trim(),
    },
  ],

  4: [
    {
      descripcion: 'Hay un enlace por cada red que tienes cargada',
      verificar: (d, datos) => {
        const redes = comoLista(datos.redes).filter((red) => comoTexto(red.url).trim() !== '')
        return d.querySelectorAll('a').length === redes.length
      },
    },
    {
      descripcion: 'Cada enlace apunta a la dirección correcta',
      verificar: (d, datos) => {
        const redes = comoLista(datos.redes).filter((red) => comoTexto(red.url).trim() !== '')
        const destinos = destinosDeEnlaces(d)
        // Una red cuya dirección no se puede interpretar no se le puede exigir a la solución:
        // se revisan las que sí son direcciones.
        return redes
          .filter((red) => normalizarEnlace(comoTexto(red.url)) !== null)
          .every((red) => hayEnlaceA(destinos, red.url))
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
      descripcion: 'Hay una lista para los hobbies que vienen en datos',
      verificar: (d, datos) => {
        const hobbies = comoLista(datos.hobbies).map((h) => comoTexto(h))
        return !!encontrarListaConItems(d, hobbies)
      },
    },
    {
      descripcion: 'Esa lista tiene un item por cada hobby',
      verificar: (d, datos) => {
        const hobbies = comoLista(datos.hobbies).map((h) => comoTexto(h))
        const lista = encontrarListaConItems(d, hobbies)
        return !!lista && lista.children.length === hobbies.length
      },
    },
    {
      descripcion: 'El texto de cada item sale de datos.hobbies',
      verificar: (d, datos) => {
        const hobbies = comoLista(datos.hobbies).map((h) => comoTexto(h))
        const lista = encontrarListaConItems(d, hobbies)
        const textos = lista ? [...lista.children].map((li) => (li.textContent ?? '').trim()) : []
        return hobbies.every((h) => textos.includes(h))
      },
    },
  ],

  7: [
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
      descripcion: 'Hay un carrusel con una imagen',
      verificar: (d) => !!d.querySelector('[data-carrusel] img'),
    },
    {
      descripcion: 'El proyecto mostrado es uno de los destacados',
      // crearImagen() pone la url en el atributo src — el nombre solo queda en "alt"
      // (no aparece en textContent), así que se compara contra src, no contra texto.
      verificar: (d, datos) => {
        const urls = comoLista(datos.proyectos)
          .filter((p) => p.destacado === true)
          .map((p) => comoTexto(p.imagenUrl))
        const srcs = [...d.querySelectorAll('[data-carrusel] img')].map((img) => img.getAttribute('src'))
        return urls.some((u) => srcs.includes(u))
      },
    },
    {
      descripcion: 'No muestra los proyectos que no son destacados',
      verificar: (d, datos) => {
        const urls = comoLista(datos.proyectos)
          .filter((p) => p.destacado !== true)
          .map((p) => comoTexto(p.imagenUrl))
        const imgs = [...d.querySelectorAll('[data-carrusel] img')]
        const srcs = imgs.map((img) => img.getAttribute('src'))
        return imgs.length === 1 && !urls.some((u) => srcs.includes(u))
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
  ],

  10: [
    {
      descripcion: 'Hay un título por cada categoría de datos.skills',
      verificar: (d, datos) => {
        const skills = gruposDeSkills(datos.skills)
        const titulos = [...d.querySelectorAll('h2, h3')].map((t) => (t.textContent ?? '').trim())
        return skills.length > 0 && skills.every((grupo) => titulos.includes(grupo.categoria))
      },
    },
    {
      descripcion: 'Cada categoría tiene su propia lista de items',
      verificar: (d, datos) => {
        const skills = gruposDeSkills(datos.skills)
        return skills.length > 0 && skills.every((grupo) => !!encontrarListaConItems(d, grupo.items))
      },
    },
    {
      descripcion: 'El texto de los items sale de datos.skills',
      verificar: (d, datos) => {
        const skills = gruposDeSkills(datos.skills)
        return skills.length > 0 && skills.every((grupo) => {
          const lista = encontrarListaConItems(d, grupo.items)
          const textos = lista ? [...lista.children].map((item) => (item.textContent ?? '').trim()) : []
          return grupo.items.every((item) => textos.includes(item))
        })
      },
    },
  ],

  11: [
    {
      descripcion: 'El proyecto de tipo "demo" muestra un enlace a su url',
      verificar: (d, datos) => {
        const demos = comoLista(datos.proyectos).filter((p) => comoTexto(p.tipo) === 'demo')
        const destinos = destinosDeEnlaces(d)
        return demos.length > 0 && demos.every((p) => hayEnlaceA(destinos, p.url))
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

/**
 * Datos con los que se revisa ADEMÁS un encargo cuando los del estudiante no bastan para
 * distinguir una solución de verdad. E6 sin hobbies (el caso de quien todavía no llenó "Mis
 * datos"): cualquier lista vacía —incluso sin recorrer nada— pasaba los tres casos.
 */
const HOBBIES_DE_PRUEBA = ['Ajedrez', 'Fútbol', 'Música']
const DATOS_EXTRA: Partial<Record<number, { datos: (d: DatosLike) => DatosLike | null; nota: string }>> = {
  6: {
    datos: (d) => (comoLista(d.hobbies).length === 0 ? { ...d, hobbies: HOBBIES_DE_PRUEBA } : null),
    nota: `Como todavía no tienes hobbies en "Mis datos", tu código también se probó con tres de ejemplo (${HOBBIES_DE_PRUEBA.join(', ')}).`,
  },
}

export async function revisarLocalmente(
  numeroEncargo: number,
  codigo: string,
  datos: unknown,
  overrideHtml?: string
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

  const r = overrideHtml === undefined ? await ejecutarPreview(codigo, datos) : { ok: true, html: overrideHtml, error: undefined }
  const doc = new DOMParser().parseFromString(
    `<body>${r.ok ? r.html : ''}</body>`,
    'text/html',
  )

  const datosObj = comoObjeto(datos)
  // Con `overrideHtml` (quien llama ya ejecutó el código) no se puede volver a ejecutar.
  const extra = overrideHtml === undefined ? DATOS_EXTRA[numeroEncargo] : undefined
  const datosExtra = extra?.datos(datosObj) ?? null
  const r2 = r.ok && datosExtra ? await ejecutarPreview(codigo, datosExtra) : null
  const docExtra = r2?.ok ? new DOMParser().parseFromString(`<body>${r2.html}</body>`, 'text/html') : null
  const pasa = (c: CasoLocal) =>
    r.ok && safe(() => c.verificar(doc, datosObj)) && (!datosExtra || (!!docExtra && safe(() => c.verificar(docExtra, datosExtra))))
  const evaluados = casos.map((c) => ({
    descripcion: c.descripcion,
    estado: (pasa(c) ? 'pasa' : 'falla') as 'pasa' | 'falla',
  }))
  const pasados = evaluados.filter((c) => c.estado === 'pasa').length

  const nota = r.ok
    ? 'Esta revisión mira el resultado visible al ejecutar. Ningún caso te dice cómo arreglarlo.'
    : `El código no llegó a ejecutarse: ${r.error?.mensaje ?? 'error'}.`
  return {
    casos: evaluados,
    casosPasados: pasados,
    casosTotales: evaluados.length,
    // La nota extra solo si de verdad se probó; y si con los datos de ejemplo el código falló
    // (p. ej. un error dentro del bucle, que con la lista vacía nunca corre), dónde.
    nota: !r2 || !extra
      ? nota
      : r2.ok
        ? `${nota} ${extra.nota}`
        : `${nota} ${extra.nota} Con esos datos tu código falló: ${r2.error?.mensaje ?? 'error'}${r2.error?.linea ? ` (línea ${r2.error.linea})` : ''}.`,
  }
}

function safe(fn: () => boolean): boolean {
  try {
    return fn()
  } catch {
    return false
  }
}
