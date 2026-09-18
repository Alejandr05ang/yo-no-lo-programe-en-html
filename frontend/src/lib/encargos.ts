import type { Encargo, HerramientaAPI } from './tipos'

// Mock de los encargos (docs/encargos.md §4). Sin backend todavía.
// E1–E3 detallados; E4–E11 con enunciado, herramientas y andamiaje mínimo.
//
// Rampa (docs/encargos.md §2.1 y §5.2): el andamiaje arranca con la solución que el
// estudiante ACEPTÓ en el encargo anterior — nunca código ajeno — y no regala la
// estructura: muestra el patrón que ya escribió y una pista para deducirlo (§2.5).

export interface EncargoMock {
  meta: Encargo
  sesion: Sesion
  /** null = es el primero. Si no, el nº del encargo cuya solución aceptada se prepende. */
  heredaDe: number | null
  /** Líneas nuevas de este encargo: comentarios y pista, SIN dar la estructura hecha. */
  andamiajeNuevo: string
  /** Stand-in de la solución anterior cuando no hay ninguna guardada (arranque en frío). */
  fallbackHeredado: string
  /** Override de `datos` para este encargo: se mergea SOBRE el perfil del estudiante.
   *  Vacío en casi todos; solo se usa donde el encargo necesita un estado concreto
   *  (E5 quiere sobreMi vacío; E9–E11 aportan proyectos/skills que el perfil no tiene). */
  datosOverride: Record<string, unknown>
  totalCasos: number
}

type Sesion = 'Ma1' | 'Mi1' | 'Ju1' | 'V1' | 'L2' | 'Ma2' | 'Mi2'
const ORDEN_SESIONES: Sesion[] = ['Ma1', 'Mi1', 'Ju1', 'V1', 'L2', 'Ma2', 'Mi2']
const DIA_DE_SESION: Record<Sesion, string> = {
  Ma1: 'Día 2 — Ma1',
  Mi1: 'Día 3 — Mi1',
  Ju1: 'Día 4 — Ju1',
  V1: 'Día 5 — V1',
  L2: 'Día 6 — L2',
  Ma2: 'Día 7 — Ma2',
  Mi2: 'Día 8 — Mi2',
}

// Herramientas que desbloquea cada sesión (docs/encargos.md §3.2). Se acumulan.
const HERRAMIENTAS_POR_SESION: Record<Sesion, string[]> = {
  Ma1: ['crearTitulo()', 'crearSubtitulo()', 'crearParrafo()', 'mostrar()', 'const'],
  Mi1: ['crearEnlace()', 'condición', 'crearSalto()'],
  Ju1: ['crearLista()', 'crearItem()', 'agregarA()', 'por cada'],
  // crearImagen() pedagógicamente es del nivel 2 / Mi1 (niveles.md), pero hoy no hay encargo
  // de Mi1 que la ejercite (D14, pendiente) — se desbloquea acá porque es donde se usa primero.
  V1: ['cadaSegundo()', 'crearImagen()'],
  L2: [],
  Ma2: ['función'],
  Mi2: [],
}

function herramientasDe(sesion: Sesion): HerramientaAPI[] {
  const idx = ORDEN_SESIONES.indexOf(sesion)
  const lista: HerramientaAPI[] = []
  ORDEN_SESIONES.slice(0, idx + 1).forEach((s, i) => {
    for (const nombre of HERRAMIENTAS_POR_SESION[s]) {
      lista.push({ nombre, nuevaHoy: idx > 0 && i === idx })
    }
  })
  return lista
}

export function diaDeEncargo(numero: number): string {
  const e = ENCARGOS[numero]
  return e ? DIA_DE_SESION[e.sesion] : DIA_DE_SESION.Ma1
}

/** Compone el archivo inicial: solución heredada + líneas nuevas (docs/encargos.md §5.2). */
export function componerAndamiaje(numero: number, soluciones: Record<number, string>): string {
  const e = ENCARGOS[numero]
  if (!e) return ''
  if (e.heredaDe == null) return e.andamiajeNuevo
  const previa = (soluciones[e.heredaDe] ?? e.fallbackHeredado).trim()
  return `// ← Tu código del encargo ${e.heredaDe}\n${previa}\n\n${e.andamiajeNuevo}`
}

function meta(
  numero: number,
  titulo: string,
  sesion: Sesion,
  desbloqueadoTexto: string,
  parrafos: string[],
  pista: string,
  esBorrador = false,
): Encargo {
  return {
    numero,
    titulo,
    desbloqueadoTexto,
    parrafos,
    herramientas: herramientasDe(sesion),
    pistaDisponibleEn: 300,
    pista,
    esBorrador,
  }
}

function stub(
  numero: number,
  titulo: string,
  sesion: Sesion,
  parrafos: string[],
  fallbackHeredado: string,
  datosOverride: Record<string, unknown>,
  totalCasos: number,
  pista: string,
): EncargoMock {
  return {
    sesion,
    heredaDe: numero - 1,
    fallbackHeredado,
    datosOverride,
    totalCasos,
    andamiajeNuevo:
      `// Encargo ${numero} — el andamiaje detallado está pendiente de diseño (docs/encargos.md §4).\n` +
      `// Escribí tu código acá abajo:\n`,
    meta: meta(numero, titulo, sesion, DIA_DE_SESION[sesion].toLowerCase(), parrafos, pista, true),
  }
}

const BASE = 'const titulo = crearTitulo("Ana Rivas")\nmostrar(titulo)'
const BASE_CON_PARRAFOS =
  BASE +
  '\n\nconst p1 = crearParrafo("Aprendo a construir cosas para internet.")\nmostrar(p1)\nconst p2 = crearParrafo("Este sitio lo escribí yo, línea por línea.")\nmostrar(p2)'

export const ENCARGOS: Record<number, EncargoMock> = {
  1: {
    sesion: 'Ma1',
    heredaDe: null,
    fallbackHeredado: '',
    datosOverride: {},
    totalCasos: 3,
    andamiajeNuevo:
      '// La página está vacía. Escribe tu nombre entre las comillas y pulsa Ejecutar.\n' +
      'const titulo = crearTitulo("tu nombre")\n' +
      'mostrar(titulo)\n',
    meta: meta(
      1,
      'Tu nombre',
      'Ma1',
      'desbloqueado hoy 10:00',
      [
        'Esta página va a ser tu portafolio. Ahora mismo no dice nada.',
        'Lo primero que cualquiera tiene que ver al abrirla es tu nombre. Escríbelo en el código y pulsa Ejecutar para verlo aparecer.',
      ],
      'Solo tenés que cambiar el texto entre las comillas de crearTitulo(...) — el resto del código ya está armado.',
    ),
  },

  2: {
    sesion: 'Ma1',
    heredaDe: 1,
    fallbackHeredado: BASE,
    datosOverride: {},
    totalCasos: 3,
    andamiajeNuevo:
      '// Ahora escribí dos párrafos sobre vos, debajo del título.\n' +
      '// Pista: fijate cómo armaste el título arriba (una variable + mostrar())\n' +
      '// y hacé lo mismo con la herramienta crearParrafo().\n' +
      '// Escribí tu código acá abajo:\n',
    meta: meta(
      2,
      'Sobre mí',
      'Ma1',
      'desbloqueado hoy 12:30',
      [
        'Un nombre solo no es una página. Falta contar quién sos en un par de frases.',
        'Agregá al menos dos párrafos sobre vos, debajo del título que ya hiciste.',
      ],
      'Fijate cómo armaste el título arriba (una variable + mostrar()) y hacé lo mismo con la herramienta crearParrafo().',
    ),
  },

  3: {
    sesion: 'Ma1',
    heredaDe: 2,
    fallbackHeredado: BASE_CON_PARRAFOS,
    datosOverride: {},
    totalCasos: 3,
    andamiajeNuevo:
      '// Tu página es un montón de párrafos seguidos. Cuesta saber de qué va cada parte.\n' +
      '// Poné un título de sección ("Sobre mí") ANTES de tus párrafos.\n' +
      '// Pista: crearSubtitulo() funciona igual que crearParrafo(), pero hace un título más chico.\n' +
      '// Escribí tu código acá abajo:\n',
    meta: meta(
      3,
      'Dale forma con secciones',
      'Ma1',
      'desbloqueado hoy 15:00',
      [
        'Tu página ya dice cosas, pero es un bloque de texto sin forma.',
        'Dividí el contenido en secciones: poné un título de sección arriba de cada parte para que se entienda de un vistazo.',
      ],
      'crearSubtitulo() funciona igual que crearParrafo(), pero hace un título más chico.',
    ),
  },

  4: stub(
    4,
    'Cómo encontrarte',
    'Mi1',
    [
      'Un portafolio sin forma de contactarte no sirve de mucho.',
      'Tus redes están en datos.redes y solo algunas están cargadas. Mostrá un enlace por cada una que exista, y ninguno para las que no.',
    ],
    BASE_CON_PARRAFOS,
    {},
    3,
    'Por cada red en datos.redes, preguntate: ¿existe? Si existe, creá el enlace con crearEnlace() y mostralo.',
  ),

  5: stub(
    5,
    'En construcción',
    'Mi1',
    [
      'Si todavía no escribiste tu "sobre mí" (datos.sobreMi), un visitante ve una página vacía y rara.',
      'Mostrá un aviso de "en construcción", pero solo mientras ese dato esté vacío.',
    ],
    BASE_CON_PARRAFOS,
    { sobreMi: '' }, // este encargo quiere ver el estado vacío en la preview
    3,
    'Un texto vacío es "" — comparalo con datos.sobreMi (no con el párrafo que crees) antes de decidir qué mostrar.',
  ),

  6: stub(
    6,
    'Tus hobbies',
    'Ju1',
    ['Agregá tus pasatiempos como una lista.', 'Por ahora poné los tres que quieras, uno por uno.'],
    BASE_CON_PARRAFOS,
    {},
    3,
    'Primero creá la lista vacía con crearLista() y mostrala; después agregale items uno por uno con agregarA().',
  ),

  7: stub(
    7,
    'La lista que no se queda quieta',
    'Ju1',
    [
      'Tus hobbies ahora están en datos.hobbies, un archivo que no escribís vos. Hoy tiene tres.',
      'La semana que viene puede tener catorce, o ninguno, y la página tiene que verse bien en los tres casos sin que vuelvas a tocar el código.',
    ],
    BASE_CON_PARRAFOS +
      '\n\nconst lista = crearLista()\nmostrar(lista)\nagregarA(lista, crearItem("Escalada"))\nagregarA(lista, crearItem("Fotografía"))\nagregarA(lista, crearItem("Ajedrez"))',
    {},
    3,
    'En vez de escribir agregarA() a mano por cada hobby, usá "por cada" (for...of) sobre datos.hobbies.',
  ),

  // Nivel 6 (niveles.md) — autónomo, sin charla. Combina imágenes (nivel 2) + bucle (nivel 4):
  // reutiliza crearImagen(url, descripcion), ya provisto por el runtime (lib/sandbox.ts).
  8: stub(
    8,
    'Carrusel de proyectos destacados',
    'V1',
    [
      'Tu portafolio tiene proyectos, pero todos se ven igual en la lista — nada resalta lo que más te enorgullece.',
      'Armá un carrusel que muestre, uno a la vez, solo tus proyectos destacados — y que cambie de proyecto solo, sin que nadie haga nada.',
    ],
    BASE_CON_PARRAFOS,
    {
      proyectos: [
        { nombre: 'Reloj web', imagenUrl: 'https://picsum.photos/seed/reloj-web/480/280', destacado: true },
        { nombre: 'Juego de memoria', imagenUrl: 'https://picsum.photos/seed/memoria/480/280', destacado: false },
        { nombre: 'Portafolio', imagenUrl: 'https://picsum.photos/seed/portafolio/480/280', destacado: true },
      ],
    },
    3,
    'Filtrá primero los proyectos con destacado true; después usá cadaSegundo() para ir mostrando uno distinto de esa lista cada vez.',
  ),

  9: stub(
    9,
    'Solo los proyectos terminados',
    'L2',
    [
      'Mostrá tus proyectos, pero solo los terminados — los que están a medias no van todavía.',
      'Están en datos.proyectos, cada uno con un campo "terminado".',
    ],
    BASE_CON_PARRAFOS,
    {
      proyectos: [
        { nombre: 'Reloj web', terminado: true },
        { nombre: 'Juego de memoria', terminado: false },
        { nombre: 'Portafolio', terminado: true },
      ],
    },
    4,
    'Antes de crear la tarjeta de cada proyecto, preguntate si su campo terminado es true.',
  ),

  10: stub(
    10,
    'Agrupar por categoría',
    'Ma2',
    [
      'Tus skills están en datos.skills, agrupadas por categoría.',
      'Mostrá cada categoría con su título y sus items debajo, para cualquier cantidad de categorías e items.',
    ],
    BASE_CON_PARRAFOS,
    { skills: { Frontend: ['HTML', 'CSS', 'JavaScript'], Backend: ['Python', 'SQL'] } },
    3,
    'Vas a necesitar un "por cada" afuera (una vuelta por categoría) y otro adentro (una vuelta por cada item de esa categoría).',
  ),

  11: stub(
    11,
    'Cada proyecto se ve distinto',
    'Mi2',
    [
      'Los proyectos no son todos iguales: unos tienen enlace a una demo, otros son solo texto, otros tienen imagen.',
      'Cada tipo se muestra distinto. Un tipo que no conozcas no debe romper la página.',
    ],
    BASE_CON_PARRAFOS,
    {
      proyectos: [
        { nombre: 'Reloj web', tipo: 'demo', url: 'https://ejemplo.com' },
        { nombre: 'Charla sobre CSS', tipo: 'texto' },
        { nombre: 'Cortometraje de animación', tipo: 'video' }, // tipo a propósito no contemplado
      ],
    },
    3,
    'Un condicional (o varios encadenados) que mire el campo tipo de cada proyecto antes de decidir qué crear.',
  ),
}

export const NUMEROS_DE_ENCARGO = Object.keys(ENCARGOS).map(Number).sort((a, b) => a - b)
