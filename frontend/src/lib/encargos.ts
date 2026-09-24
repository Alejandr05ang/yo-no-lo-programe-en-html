import type { Encargo, HerramientaAPI } from './tipos'

// Mock de los encargos (docs/encargos.md §4). Sin backend todavía.
// E1–E3 detallados; E4–E11 con enunciado, herramientas y andamiaje mínimo.
// E12 y E13 son Ju1 ("Organiza tu página" / "Dale tu estilo"), agregados después: los números
// quedan fuera de orden cronológico (Ju1 va entre E6 y E7) a propósito — backend/app/catalog/
// seed.py ya tenía e1..e11 sembrados en producción, y correrlo de nuevo hace upsert POR CLAVE
// ("e7", "e8"...); renumerar esas claves les cambiaría el contenido a retos que alumnos reales
// ya pueden tener en progreso. Ju1 no tenía claves previas, así que e12/e13 son adiciones
// seguras sin tocar las existentes. El orden real para navegar sale de sort_order en el
// backend, no del número (ver heredaDe explícito de E12 más abajo).
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
  /** undefined (la inmensa mayoría) = un solo archivo, como siempre. 'grid' = Ju1: el
   *  estudiante arma la estructura con la herramienta visual (features/estructura/) y cada
   *  sección es su propia pestaña — ver DocumentoJu1 en lib/tipos.ts. En ese caso `draft_code`
   *  guarda el documento serializado (JSON), no JS: heredaDe/andamiajeNuevo/fallbackHeredado
   *  no aplican (no hay un texto de script único para "heredar" de un encargo al siguiente). */
  modelo?: 'grid'
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
// ahora concentra tres encargos (E4, E5, E6) en una sola sesión. Ju1 pasa a ser día de
// personalización visual CON su propio encargo (E12, "Dale tu estilo" — número fuera de
// orden, ver comentario arriba), revisado por el instructor — sin CASOS_POR_ENCARGO en
// revisionLocal.ts, no porque falte diseñarlo, sino porque el criterio de "correcto" acá
// es visual, no un caso de prueba.
const HERRAMIENTAS_POR_SESION: Record<Sesion, string[]> = {
  Ma1: ['crearTitulo()', 'crearSubtitulo()', 'crearParrafo()', 'mostrar()', 'const'],
  Mi1: ['crearEnlace()', 'condición', 'crearSalto()', 'crearLista()', 'crearItem()', 'agregarA()', 'vaciar()', 'por cada'],
  Ju1: ['crearSeccion()', 'cambiarColorTexto()', 'cambiarTamano()', 'cambiarFuente()', 'cambiarColorFondo()', 'cambiarAlineacion()'],
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
  const propia = soluciones[e.heredaDe]?.trim()
  // Si no hay código propio del encargo anterior (otro equipo, pestaña nueva, o nunca lo
  // hizo) se arranca con un ejemplo, y el comentario lo dice: no es "tu código".
  const encabezado = propia
    ? `// ← Tu código del encargo ${e.heredaDe}`
    : `// ← Código de ejemplo del encargo ${e.heredaDe} (no encontramos el tuyo): cámbialo por lo tuyo`
  return `${encabezado}\n${propia || e.fallbackHeredado.trim()}\n\n${e.andamiajeNuevo}`
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
// Lo que deja E3 (un subtítulo de sección). La revisión de E4 ya no exige que siga ahí
// (docs/decisiones.md: el portafolio es del estudiante, no se penaliza que lo modifique o
// lo saque al personalizar) — este arranque en frío solo mantiene la continuidad del ejemplo.
const BASE_CON_SECCION = BASE_CON_PARRAFOS + '\n\nconst seccion = crearSubtitulo("Sobre mí")\nmostrar(seccion)'
// Fallbacks de arranque en frío para E7, E8 y E12 (§5.2) — aproximan lo que ya tendría un
// estudiante que aceptó los encargos anteriores, no una réplica exacta de su código. E12
// (Ju1) es solo estilo sobre esta misma estructura, así que reusarla alcanza también ahí.
const BASE_CON_HOBBIES =
  BASE_CON_PARRAFOS +
  '\n\nconst lista = crearLista()\nmostrar(lista)\nPARA CADA hobby EN datos.hobbies HACER\n  agregarA(lista, crearItem(hobby))\nFIN PARA'
const BASE_CON_AVISO =
  BASE_CON_HOBBIES +
  '\n\nconst bio = crearParrafo(datos.sobreMi)\nmostrar(bio)\nSI datos.sobreMi === "" ENTONCES\n  mostrar(crearParrafo("Página en construcción — vuelve pronto."))\nFIN SI'

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
    totalCasos: 2,
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
    totalCasos: 2,
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
    BASE_CON_SECCION,
    {},
    2,
    [
      'Tus redes viven en datos.redes. Cada red tiene red.nombre y red.url.',
      'Por cada red, si red.url tiene una dirección, mostrá un enlace con crearEnlace(). Las que están vacías no aparecen.',
    ],
    'Por cada red en datos.redes, preguntate: ¿red.url tiene una dirección? Si la tiene, creá el enlace con red.nombre y red.url.',
  ),

  // Reorganización del 19-sep (docs/decisiones.md): E5–E6 (hobbies) pasan de Ju1 a Mi1, que
  // ahora concentra E4+E5+E6. El aviso condicional pasa a ser E7 y se dicta el viernes (V1,
  // tarea autónoma sin charla) junto con el carrusel (E8) — Ju1 queda para personalización
  // visual con su propio encargo, E12 más abajo (docs/brief.md §4.1 N4).
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
    'Primero vaciá tu lista anterior. Después, en vez de escribir agregarA() a mano por cada hobby, usá PARA CADA … EN … HACER sobre datos.hobbies.',
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
    2,
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
    3,
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

  // Día de personalización visual (docs/decisiones.md, reorganización del 19-sep), en DOS
  // encargos — todas las herramientas de estilo juntas en uno solo era demasiada carga de
  // una vez. Números fuera de orden cronológico (Ju1 va entre E6 y E7) — ver el comentario
  // grande al principio del archivo sobre por qué no se renumeró E7–E11.
  // Sin CASOS_POR_ENCARGO en revisionLocal.ts a propósito, en los dos — "correcto" acá es una
  // decisión visual del estudiante, la revisa el instructor en clase, no un caso de prueba.
  //
  // modelo: 'grid' en los dos (plan "Cuadrícula visual + pestañas por sección"): en vez de
  // crearSeccion()/agregarA() a mano, el estudiante arma la estructura con la herramienta
  // visual y escribe el contenido de cada sección en su propia pestaña. Quedan como DOS
  // encargos separados (no se fusionan: ya se armó la clase alrededor de esos dos números,
  // fusionarlos ahora confundiría más de lo que simplifica) — `andamiajeNuevo`/
  // `fallbackHeredado` quedan vacíos porque no aplican a este modelo: no hay un texto de
  // script que "heredar" con un comentario adelante, la cuadrícula y las secciones SON lo
  // que se hereda, tal cual (ver contenidoInicialDe en VistaEstudiante.tsx).

  // heredaDe EXPLÍCITO (6), no el numero-1 automático de stub() (que daría 11, el encargo
  // equivocado). Al heredar de un encargo de un solo archivo (E6), lo que aparece la primera
  // vez en portafolio.js (el "main") es el código de siempre, todavía sin secciones — eso es
  // justamente el punto de partida del encargo: organizarlo.
  12: {
    sesion: 'Ju1',
    heredaDe: 6,
    fallbackHeredado: '',
    datosOverride: {},
    totalCasos: 0,
    modelo: 'grid',
    andamiajeNuevo: '',
    meta: meta(
      12,
      'Organiza tu página',
      'Ju1',
      DIA_DE_SESION.Ju1.toLowerCase(),
      [
        'Hasta ahora todo tu contenido es una fila de títulos y párrafos, uno debajo del otro.',
        'Arriba del editor tenés una herramienta para armar la estructura de tu página: agregá filas, combiná las celdas que quieras juntar, y ponele nombre a cada sección.',
      ],
      'Cada sección que creás se abre como su propia pestaña de código. En portafolio.js hacé mostrar(nombreDeLaSección) por cada una que quieras que aparezca en la página.',
      true,
    ),
  },

  // heredaDe SÍ coincide con el numero-1 automático de stub() acá (13-1=12) — pero stub() no
  // sabe de `modelo`, así que se arma con el helper y se le agrega encima.
  13: {
    ...stub(
      13,
      'Dale tu estilo',
      'Ju1',
      [
        'Hasta ahora tu portafolio se ve igual que el de cualquier compañero: mismo color, mismo tamaño de letra, mismo fondo.',
        'Ahora es tu turno de darle tu propio estilo. Entrá a cada pestaña de sección y probá las herramientas nuevas sobre lo que ya escribiste ahí.',
      ],
      '',
      {},
      0,
      [],
      'Mirá las fichas de cada herramienta (a la izquierda): muestran los valores que aceptan y cómo se ven. Probá una por vez, sobre un solo párrafo, antes de aplicarla a toda una sección.',
    ),
    modelo: 'grid',
  },
}

export const NUMEROS_DE_ENCARGO = Object.keys(ENCARGOS).map(Number).sort((a, b) => a - b)
