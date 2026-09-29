import { normalizarEnlace } from './enlaces.ts'
import { ENCARGOS } from './encargos.ts'
import { ejecutarPreview, ejecutarPreviewJu1, ejecutarPreviewEvolucion, type ResultadoPreview } from './sandbox.ts'
import { parsearDocumentoJu1 } from './estructuraDePagina.ts'
import type { ResultadoRevision } from './tipos'

// Revisión automática LOCAL: es la que acepta los encargos hoy. El servidor guarda cada
// entrega (POST /submit) y el estado accepted, pero no corre casos propios; el autograder
// Deno con casos ocultos de docs/arquitectura.md sigue sin integrarse. Esta revisión corre
// el código con datos actuales y variantes de borde. Sigue siendo evaluación formativa
// del cliente, no una barrera de autorización ni un autograder oculto del servidor.

type DatosLike = Record<string, unknown>

interface CasoLocal {
  descripcion: string
  verificar: (doc: Document, datos: DatosLike) => boolean
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
    if (items.length === esperados.length && esperados.every((item, i) => items[i] === item)) {
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

// Nombres completos por nodo: "Web" no se cuenta otra vez dentro de "Web grande".
function textosVisibles(doc: Document): string[] {
  const textos: string[] = []
  const visitar = (n: Node) => {
    if (n.nodeType === 3 && n.textContent?.trim()) textos.push(n.textContent.trim())
    else if (n.nodeType === 1 && !['SCRIPT', 'STYLE'].includes((n as Element).tagName)) {
      for (const hijo of n.childNodes) visitar(hijo)
    }
  }
  visitar(doc.body)
  return textos
}

function listaDeCategoria(doc: Document, categoria: string, items: string[]): Element | null {
  const titulos = [...doc.querySelectorAll('h2, h3')].filter(t => t.textContent?.trim() === categoria)
  for (const titulo of titulos) {
    for (let vecino = titulo.nextElementSibling; vecino; vecino = vecino.nextElementSibling) {
      if (vecino.matches('h2, h3')) break
      const listas = vecino.matches('ul,ol') ? [vecino] : [...vecino.querySelectorAll('ul,ol')]
      for (const lista of listas) {
        const textos = [...lista.children].map(item => item.textContent?.trim() ?? '')
        if (textos.length === items.length && items.every((item, i) => textos[i] === item)) return lista
      }
    }
  }
  return null
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
  // El encargo 12 (Ju1, personalización) no tiene entrada acá a propósito: sin autograder,
  // lo revisa el instructor (ver encargos.ts).
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
      descripcion: 'El aviso aparece únicamente cuando la biografía está vacía',
      verificar: (d, datos) => {
        const bio = comoTexto(datos.sobreMi).trim()
        const aviso = [...d.querySelectorAll('p')].some(p => /construcci[oó]n/i.test(p.textContent ?? ''))
        return bio ? !aviso && textosVisibles(d).includes(bio) : aviso
      },
    },
    {
      descripcion: 'Ningún párrafo queda vacío',
      verificar: (d) => {
        const ps = [...d.querySelectorAll('p')]
        return ps.length > 0 && ps.every((p) => (p.textContent ?? '').trim().length > 0)
      },
    },
  ],

  // La forma y el filtro se verifican para listas vacías, de uno y de varios proyectos.
  // El movimiento y la limpieza de timers tienen pruebas del runtime y de la preview viva.
  8: [
    {
      descripcion: 'El carrusel muestra una imagen, o un estado vacío cuando no hay destacados',
      verificar: (d, datos) => {
        const cantidad = comoLista(datos.proyectos).filter(p => p.destacado === true).length
        const carrusel = d.querySelector('[data-carrusel]')
        return !!carrusel && carrusel.querySelectorAll('img').length === (cantidad ? 1 : 0)
      },
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
        return urls.length === 0 ? srcs.length === 0 : srcs.length === 1 && srcs[0] === urls[0]
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
        return imgs.length <= 1 && !urls.some((u) => srcs.includes(u))
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
        const textos = textosVisibles(d)
        return terminados.every(n => textos.includes(n))
      },
    },
    {
      descripcion: 'No se muestran los proyectos sin terminar',
      verificar: (d, datos) => {
        const sinTerminar = comoLista(datos.proyectos)
          .filter((p) => p.terminado !== true)
          .map((p) => comoTexto(p.nombre))
        const textos = textosVisibles(d)
        return !sinTerminar.some(n => textos.includes(n))
      },
    },
    {
      descripcion: 'Cada proyecto terminado aparece una sola vez y en su orden',
      verificar: (d, datos) => {
        const terminados = comoLista(datos.proyectos)
          .filter((p) => p.terminado === true)
          .map((p) => comoTexto(p.nombre))
        const textos = textosVisibles(d).filter(t => terminados.includes(t))
        return textos.length === terminados.length && terminados.every((n, i) => textos[i] === n)
      },
    },
  ],

  10: [
    {
      descripcion: 'Hay un título por cada categoría de datos.skills',
      verificar: (d, datos) => {
        const skills = gruposDeSkills(datos.skills)
        const titulos = [...d.querySelectorAll('h2, h3')].map((t) => (t.textContent ?? '').trim())
        return skills.every((grupo) => titulos.includes(grupo.categoria))
      },
    },
    {
      descripcion: 'Cada categoría tiene su propia lista de items',
      verificar: (d, datos) => {
        const skills = gruposDeSkills(datos.skills)
        return skills.every((grupo) => !!listaDeCategoria(d, grupo.categoria, grupo.items))
      },
    },
    {
      descripcion: 'El texto de los items sale de datos.skills',
      verificar: (d, datos) => {
        const skills = gruposDeSkills(datos.skills)
        return skills.every((grupo) => {
          const lista = listaDeCategoria(d, grupo.categoria, grupo.items)
          const textos = lista ? [...lista.children].map((item) => (item.textContent ?? '').trim()) : []
          return grupo.items.every((item) => textos.includes(item))
        })
      },
    },
  ],

  11: [
    {
      descripcion: 'Cada demo tiene un enlace válido o texto cuando falta una dirección segura',
      verificar: (d, datos) => {
        const demos = comoLista(datos.proyectos).filter((p) => comoTexto(p.tipo) === 'demo')
        const destinos = destinosDeEnlaces(d)
        return demos.every((p) => {
          if (normalizarEnlace(comoTexto(p.url))) return hayEnlaceA(destinos, p.url)
          // Una URL imposible no bloquea el encargo; tampoco acepta un enlace vacío.
          const nombre = comoTexto(p.nombre)
          return [...d.querySelectorAll('p, li, h2, h3')].some(el => el.textContent?.trim() === nombre && !el.querySelector('a'))
        })
      },
    },
    {
      descripcion: 'El proyecto de tipo "texto" aparece con su nombre',
      verificar: (d, datos) => {
        const textos = comoLista(datos.proyectos).filter((p) => comoTexto(p.tipo) === 'texto')
        const contenido = d.body.textContent ?? ''
        return textos.every((p) => contenido.includes(comoTexto(p.nombre)))
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

/** Variantes públicas de evaluación formativa; no se analizan palabras del código. */
function variantesDeRevision(numero: number, datos: DatosLike): DatosLike[] {
  const proyectos = [
    { nombre: 'Proyecto de prueba A', imagenUrl: 'https://example.com/a.png', terminado: true, destacado: true, tipo: 'demo', url: 'https://example.com/demo-a' },
    { nombre: 'Proyecto de prueba B', imagenUrl: 'https://example.com/b.png', terminado: false, destacado: false, tipo: 'texto' },
    { nombre: 'Proyecto de prueba C', imagenUrl: 'https://example.com/c.png', terminado: true, destacado: true, tipo: 'nuevo' },
    { nombre: 'Proyecto de prueba D', imagenUrl: 'https://example.com/d.png', terminado: true, destacado: true, tipo: 'texto' },
  ]
  switch (numero) {
    case 7: return [{ ...datos, sobreMi: '' }, { ...datos, sobreMi: 'Esta es una biografía de prueba distinta.' }]
    case 8:
    case 9: return [
      { ...datos, proyectos: [] },
      { ...datos, proyectos: [proyectos[1]] },
      { ...datos, proyectos: [proyectos[2]] },
      { ...datos, proyectos: [proyectos[3], proyectos[1], proyectos[0], proyectos[2]] },
    ]
    case 10: return [
      { ...datos, skills: [] },
      { ...datos, skills: [{ categoria: 'Grupo vacío', items: [] }] },
      { ...datos, skills: [{ categoria: 'Grupo nuevo A', items: ['A1', 'A2', 'A3', 'A4'] }, { categoria: 'Grupo nuevo B', items: ['B1'] }, { categoria: 'Grupo nuevo C', items: [] }] },
    ]
    case 11: return [
      { ...datos, proyectos: [] },
      { ...datos, proyectos: [proyectos[1]] },
      { ...datos, proyectos: [proyectos[0]] },
      { ...datos, proyectos: [proyectos[2], { nombre: 'Sin dirección', tipo: 'demo' }, { nombre: 'Dirección insegura', tipo: 'demo', url: 'javascript:alert(1)' }, { nombre: 'Dirección mal formada', tipo: 'demo', url: 'no es una url' }, {}] },
    ]
    default: return []
  }
}

function ejecutarContenido(codigo: string, datos: unknown) {
  try {
    const documento = JSON.parse(codigo)
    if (documento?.version === 1 && documento.estructura && Array.isArray(documento.secciones)) {
      return ejecutarPreviewJu1(parsearDocumentoJu1(codigo), datos)
    }
  } catch { /* Un archivo de JavaScript o pseudocódigo sigue usando su runtime habitual. */ }
  return ejecutarPreview(codigo, datos)
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
    const total = Math.max(1, ENCARGOS[numeroEncargo]?.totalCasos ?? 1)
    return {
      casos: Array.from({ length: total }, (_, i) => ({
        descripcion: `Caso ${i + 1}`,
        estado: 'falla' as const,
      })),
      casosPasados: 0,
      casosTotales: total,
      nota: numeroEncargo === 12 || numeroEncargo === 13
        ? 'Este encargo requiere revisión visual del instructor; no se acepta automáticamente.'
        : 'Este encargo todavía no tiene revisión automática (pendiente de diseño del contenido).',
    }
  }

  const r = overrideHtml === undefined ? await ejecutarContenido(codigo, datos) : { ok: true, html: overrideHtml, error: undefined }
  const doc = new DOMParser().parseFromString(
    `<body>${r.ok ? r.html : ''}</body>`,
    'text/html',
  )

  const datosObj = comoObjeto(datos)
  // Con `overrideHtml` (quien llama ya ejecutó el código) no se puede volver a ejecutar.
  const extra = overrideHtml === undefined ? DATOS_EXTRA[numeroEncargo] : undefined
  const datosExtra = extra?.datos(datosObj) ?? null
  const r2 = r.ok && datosExtra ? await ejecutarContenido(codigo, datosExtra) : null
  const docExtra = r2?.ok ? new DOMParser().parseFromString(`<body>${r2.html}</body>`, 'text/html') : null
  const variantes = r.ok && overrideHtml === undefined ? variantesDeRevision(numeroEncargo, datosObj) : []
  const resultadosVariantes: { datos: DatosLike; resultado: ResultadoPreview; doc: Document }[] = []
  for (const variante of variantes) {
    const resultado = await ejecutarContenido(codigo, variante)
    resultadosVariantes.push({ datos: variante, resultado, doc: new DOMParser().parseFromString(`<body>${resultado.ok ? resultado.html : ''}</body>`, 'text/html') })
  }
  const pasa = (c: CasoLocal) =>
    r.ok && safe(() => c.verificar(doc, datosObj))
    && (!datosExtra || (!!docExtra && safe(() => c.verificar(docExtra, datosExtra))))
    && resultadosVariantes.every(v => v.resultado.ok && safe(() => c.verificar(v.doc, v.datos)))
  const evaluados = casos.map((c) => ({
    descripcion: c.descripcion,
    estado: (pasa(c) ? 'pasa' : 'falla') as 'pasa' | 'falla',
  }))
  if (numeroEncargo === 8) {
    let movimientoCorrecto = r.ok && overrideHtml === undefined
    if (movimientoCorrecto) {
      for (const muestra of [datosObj, ...variantes]) {
        const urls = comoLista(muestra.proyectos).filter(p => p.destacado === true).map(p => comoTexto(p.imagenUrl))
        // El reloj aislado limita a diez ticks. Las variantes pequeñas cubren la vuelta.
        const ticks = Math.min(10, Math.max(3, urls.length))
        const frames = await ejecutarPreviewEvolucion(codigo, muestra, ticks)
        if (frames.length !== ticks + 1 || frames.some((frame, i) => {
          if (!frame.ok) return true
          const d = new DOMParser().parseFromString(frame.html, 'text/html')
          const carrusel = d.querySelector('[data-carrusel]')
          const imagenes = [...d.querySelectorAll('[data-carrusel] img')]
          return !carrusel || (urls.length === 0 ? imagenes.length !== 0
            : imagenes.length !== 1 || imagenes[0].getAttribute('src') !== urls[i % urls.length])
        })) movimientoCorrecto = false
      }
    }
    evaluados.push({ descripcion: 'El carrusel avanza, vuelve al inicio y no acumula imágenes', estado: movimientoCorrecto ? 'pasa' : 'falla' })
  }
  const pasados = evaluados.filter((c) => c.estado === 'pasa').length

  const notaBase = r.ok
    ? 'Esta revisión mira el resultado visible al ejecutar. Ningún caso te dice cómo arreglarlo.'
    : `El código no llegó a ejecutarse: ${r.error?.mensaje ?? 'error'}.`
  const falloVariante = resultadosVariantes.find(v => !v.resultado.ok)
  const nota = `${notaBase}${variantes.length ? ' También se ejecutó tu código con datos distintos, vacíos y de distintas cantidades.' : ''}${falloVariante ? ` Con esos datos tu código falló: ${falloVariante.resultado.error?.mensaje ?? 'error'}.` : ''}`
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
