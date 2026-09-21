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
// Reorganización del 19-sep (docs/decisiones.md): E6 y E7 (hobbies) pasan de Ju1 a Mi1, que
// ahora concentra tres encargos (E4, E5, E6) en una sola sesión. Ju1 queda como día de
// personalización visual (review, sin autograder) y no desbloquea herramienta de JS nueva.
const HERRAMIENTAS_POR_SESION: Record<Sesion, string[]> = {
  Ma1: ['crearTitulo()', 'crearSubtitulo()', 'crearParrafo()', 'mostrar()', 'const'],
  Mi1: ['crearEnlace()', 'condición', 'crearSalto()', 'crearLista()', 'crearItem()', 'agregarA()', 'vaciar()', 'por cada'],
  Ju1: [],
  // crearImagen() pedagógicamente es del nivel 2 / Mi1 (niveles.md), pero hoy no hay encargo
  // de Mi1 que la ejercite (D14, pendiente) — se desbloquea acá porque es donde se usa primero.
  V1: ['crearCarrusel()', 'proyectosDestacados()', 'cadaSegundo()', 'crearImagen()'],
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
  andamiajeLineas: string[],
  pista: string,
): EncargoMock {
  return {
    sesion,
    heredaDe: numero - 1,
    fallbackHeredado,
    datosOverride,
    totalCasos,
    andamiajeNuevo:
      andamiajeLineas.map((l) => `// ${l}\n`).join('') +
      `// Pista: ${pista}\n` +
      `// Escribí tu código acá abajo:\n`,
    meta: meta(numero, titulo, sesion, DIA_DE_SESION[sesion].toLowerCase(), parrafos, pista, true),
  }
}

const BASE = 'const titulo = crearTitulo("Ana Rivas")\nmostrar(titulo)'
const BASE_CON_PARRAFOS =
  BASE +
  '\n\nconst p1 = crearParrafo("Aprendo a construir cosas para internet.")\nmostrar(p1)\nconst p2 = crearParrafo("Este sitio lo escribí yo, línea por línea.")\nmostrar(p2)'
// Fallbacks de arranque en frío para E7 y E8 (§5.2) — aproximan lo que ya tendría un
// estudiante que aceptó los encargos anteriores, no una réplica exacta de su código.
const BASE_CON_HOBBIES =
  BASE_CON_PARRAFOS +
  '\n\nconst lista = crearLista()\nmostrar(lista)\nfor (const hobby of datos.hobbies) {\n  agregarA(lista, crearItem(hobby))\n}'
const BASE_CON_AVISO =
  BASE_CON_HOBBIES +
  '\n\nconst bio = crearParrafo(datos.sobreMi)\nmostrar(bio)\nif (datos.sobreMi === "") {\n  mostrar(crearParrafo("Página en construcción — vuelve pronto."))\n}'

const PROYECTOS_PORTAFOLIO = [
  {
    nombre: 'Reloj web', imagenUrl: 'https://picsum.photos/seed/reloj-web/480/280', destacado: true,
    terminado: true, tipo: 'demo', url: 'https://ejemplo.com/reloj',
  },
  {
    nombre: 'Juego de memoria', imagenUrl: 'https://picsum.photos/seed/memoria/480/280', destacado: false,
    terminado: false, tipo: 'texto',
  },
  {
    nombre: 'Portafolio', imagenUrl: 'https://picsum.photos/seed/portafolio/480/280', destacado: true,
    terminado: true, tipo: 'texto',
  },
  {
    nombre: 'Agenda de estudio', imagenUrl: 'https://picsum.photos/seed/agenda-estudio/480/280', destacado: true,
    terminado: true, tipo: 'video',
  },
]

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
      '// Agregá un título de sección (por ejemplo, "Sobre mí") para que se entienda de qué tratan tus párrafos.\n' +
      '// Pista: crearSubtitulo() funciona igual que crearParrafo(), pero hace un título más chico.\n' +
      '// Escribí tu código acá abajo:\n',
    meta: meta(
      3,
      'Dale forma con secciones',
      'Ma1',
      'desbloqueado hoy 15:00',
      [
        'Tu página ya dice cosas, pero es un bloque de texto sin forma.',
        'Dividí el contenido en secciones: agregá un título de sección para que se entienda de un vistazo.',
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
      'Tus redes están en datos.redes. Cada una tiene un nombre y una dirección, pero algunas direcciones están vacías. Mostrá un enlace solo para las que tengan dirección.',
    ],
    BASE_CON_PARRAFOS,
    {},
    3,
    [
      'Tus redes viven en datos.redes. Cada red tiene red.nombre y red.url.',
      'Por cada red, si red.url tiene una dirección, mostrá un enlace con crearEnlace(). Las que están vacías no aparecen.',
    ],
    'Por cada red en datos.redes, preguntate: ¿red.url tiene una dirección? Si la tiene, creá el enlace con red.nombre y red.url.',
  ),

  // Reorganización del 19-sep (docs/decisiones.md): E5–E6 (hobbies) pasan de Ju1 a Mi1, que
  // ahora concentra E4+E5+E6. El aviso condicional pasa a ser E7 y se dicta el viernes (V1,
  // tarea autónoma sin charla) junto con el carrusel (E8) — Ju1 queda libre para
  // personalización visual (review, sin autograder, docs/brief.md §4.1 N4).
  5: stub(
    5,
    'Tus hobbies',
    'Mi1',
    ['Agregá tus pasatiempos como una lista.', 'Por ahora poné los tres que quieras, uno por uno.'],
    BASE_CON_PARRAFOS,
    {},
    3,
    ['Armá una lista con tus pasatiempos. Por ahora poné los tres que quieras, uno por uno.'],
    'Primero creá la lista vacía con crearLista() y mostrala; después agregale items uno por uno con agregarA().',
  ),

  6: stub(
    6,
    'La lista que no se queda quieta',
    'Mi1',
    [
      'Tus hobbies ahora están en datos.hobbies, un archivo que no escribís vos. Hoy tiene tres.',
      'La semana que viene puede tener catorce, o ninguno, y la página tiene que verse bien en los tres casos sin que vuelvas a tocar el código.',
    ],
    BASE_CON_PARRAFOS +
      '\n\nconst lista = crearLista()\nmostrar(lista)\nagregarA(lista, crearItem("Escalada"))\nagregarA(lista, crearItem("Fotografía"))\nagregarA(lista, crearItem("Ajedrez"))',
    {},
    3,
    [
      'Tus hobbies ya no los escribís vos: vienen de datos.hobbies, y podés tener cualquier cantidad.',
      'La lista que ya hiciste sigue siendo la misma. Vaciála y dejá que se arme sola, sin importar si hay tres o catorce.',
    ],
    'Primero vaciá tu lista anterior. Después, en vez de escribir agregarA() a mano por cada hobby, usá "por cada" (for...of) sobre datos.hobbies.',
  ),

  7: stub(
    7,
    'En construcción',
    'V1',
    [
      'Si todavía no escribiste tu "sobre mí" (datos.sobreMi), un visitante ve una página vacía y rara.',
      'Mostrá un aviso de "en construcción", pero solo mientras ese dato esté vacío.',
    ],
    BASE_CON_HOBBIES,
    { sobreMi: '' }, // este encargo quiere ver el estado vacío en la preview
    3,
    [
      'datos.sobreMi puede venir vacío. Cuando lo esté, mostrá un aviso de "en construcción".',
      'Cuando no lo esté, mostrá el texto normal — nunca los dos a la vez.',
    ],
    'Un texto vacío es "" — comparalo con datos.sobreMi (no con el párrafo que crees) antes de decidir qué mostrar.',
  ),

  // Nivel 6 (niveles.md) — autónomo, sin charla, mismo día que E7. Combina imágenes (nivel 2)
  // + bucle (nivel 4): reutiliza crearImagen(url, descripcion), ya provisto por el runtime
  // (lib/sandbox.ts).
  8: stub(
    8,
    'Carrusel de proyectos destacados',
    'V1',
    [
      'Tu portafolio tiene proyectos, pero todos se ven igual en la lista — nada resalta lo que más te enorgullece.',
      'Armá un carrusel que muestre, uno a la vez, solo tus proyectos destacados — y que cambie de proyecto solo, sin que nadie haga nada.',
    ],
    BASE_CON_AVISO,
    { proyectos: PROYECTOS_PORTAFOLIO },
    3,
    [
      'proyectosDestacados(datos.proyectos) prepara solo los que tienen destacado: true.',
      'Creá y mostrá un carrusel. Después, cadaSegundo() cambia su contenido sin acumular imágenes.',
    ],
    'Guardá los destacados, creá el carrusel y pasale ambos a cadaSegundo(). La última parte crea la imagen de cada proyecto.',
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
    { proyectos: PROYECTOS_PORTAFOLIO },
    4,
    [
      'Cada proyecto en datos.proyectos tiene un campo terminado. Los que no lo tienen en true no van todavía.',
    ],
    'Antes de crear la tarjeta de cada proyecto, preguntate si su campo terminado es true.',
  ),

  10: stub(
    10,
    'Agrupar por categoría',
    'Ma2',
    [
      'Tus skills están en datos.skills. Cada grupo tiene una categoría y una lista de items.',
      'Mostrá cada categoría con su título y sus items debajo, para cualquier cantidad de categorías e items.',
    ],
    BASE_CON_PARRAFOS,
    {
      proyectos: PROYECTOS_PORTAFOLIO,
      skills: [
        { categoria: 'Frontend', items: ['HTML', 'CSS', 'JavaScript'] },
        { categoria: 'Backend', items: ['Python', 'SQL'] },
      ],
    },
    3,
    [
      'Cada grupo de datos.skills tiene grupo.categoria y grupo.items.',
      'Ninguna cantidad está fija — puede haber dos categorías o diez, con dos items o veinte.',
    ],
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
      proyectos: PROYECTOS_PORTAFOLIO,
      // E11 conserva el código de E10: sus grupos siguen disponibles.
      skills: [
        { categoria: 'Frontend', items: ['HTML', 'CSS', 'JavaScript'] },
        { categoria: 'Backend', items: ['Python', 'SQL'] },
      ],
    },
    3,
    [
      'Cada proyecto en datos.proyectos trae un campo tipo ("demo", "texto", quizás otro que no viste).',
      'Decidí qué mostrar según ese campo — y que un tipo desconocido no rompa nada.',
    ],
    'Un condicional (o varios encadenados) que mire el campo tipo de cada proyecto antes de decidir qué crear.',
  ),
}

export const NUMEROS_DE_ENCARGO = Object.keys(ENCARGOS).map(Number).sort((a, b) => a - b)
