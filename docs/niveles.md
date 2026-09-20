# Niveles de programación — Taller de portafolio web

> **Nota (19-sep):** este catálogo (16 niveles) todavía no se reconcilió con la reorganización de
> `brief.md` §4.1 de esta misma fecha (numeración N1–N14, sesiones movidas, E8 confirmado como
> carrusel). Los números de nivel de este documento **no corresponden** a los N1–N14 de
> `brief.md` — son dos numeraciones distintas por ahora. Ver `docs/decisiones.md`.

Spec técnica derivada de `brief.md` (§4.1). Cubre únicamente los niveles que son ejercicio de
código con test oculto — no incluye contenido de clase sin ejercicio (DevTools, diagramas de
flujo/pseudocódigo, HTML semántico por lectura, diagnósticos), que vive como apoyo alrededor de
un nivel, no como un nodo de la cadena.

## Regla central

**Un nivel = el estudiante escribe código, lo entrega, un test oculto lo valida, se desbloquea
el siguiente.** Todos los niveles listados aquí son de tipo `code`. Orden estricto y lineal: el
nivel N requiere el nivel N-1 completado. Sin ramas, sin niveles en paralelo.

## Catálogo (16 niveles)

| # | Nivel | Día | Autónomo (sin charla) | Pieza de portafolio | Reutiliza de niveles anteriores |
|---|---|---|---|---|---|
| 1 | Variables + creación de elementos (DOM) | Ma1 | No | Header + "sobre mí" | — |
| 2 | Variables/elementos + intro condicionales + insertar imágenes (con límite de espacio) | Mi1 | No | Info de contacto/redes + foto de perfil | Nivel 1 |
| 3 | Condicionales completos | Ju1 | No | Aviso condicional + nav/lista | Niveles 1-2 |
| 4 | Intro a bucles | Ju1 | No | (mismo bloque de Ju1) | Niveles 1-3 |
| 5 | Eventos (`addEventListener`) + formulario de contacto | Ju1 | No | Formulario de contacto | Niveles 1-4 |
| 6 | Carrusel de proyectos destacados (repetición automática) | V1 | **Sí** | Carrusel de proyectos | Nivel 2 (imágenes) + Nivel 4 (bucle) |
| 7 | Eventos en botones (prev/next del carrusel) | V1 | **Sí** | (mismo bloque de V1) | Nivel 5 (eventos) |
| 8 | Bucle + condicional combinados (filtro) | L2 | No | Sección de proyectos con filtro | Niveles 3-4 |
| 9 | Clases CSS desde JS (`classList`) | L2 | No | (mismo bloque de L2) | Nivel 8 |
| 10 | Matrices | Ma2 | No | Skills/proyectos agrupados | Nivel 4 (bucle) |
| 11 | Funciones/métodos + `.length` | Ma2 | No | (mismo bloque de Ma2) | Nivel 10 |
| 12 | Layout Grid/Flexbox | Ma2 | No | Grid de columnas | Nivel 10-11 |
| 13 | Funciones: bucle + acciones distintas según tipo de dato | Mi2 | No | Renderizado distinto por tipo | Niveles 10-12 |
| 14 | Responsive (media queries + móvil) | Mi2 | No | Portafolio responsive | — (aplica a todo lo ya construido) |
| 15 | Git básico (`add`, `commit`, `push`) | Ju2 | No | — | — |
| 16 | Deploy + pulido | Ju2 | No | Página publicada con URL real | Nivel 15 |

## Cambios de esta revisión respecto al catálogo anterior de 20 (brief.md §4.1)

- Se eliminaron 4 entradas que no son ejercicio de código: diagnóstico inicial, DevTools/cómo
  funciona la web, diagramas de flujo/pseudocódigo, HTML semántico por lectura, y el diagnóstico
  final. Ninguna tiene test oculto ni pieza de portafolio que el estudiante programe — son
  contenido de apoyo, no niveles jugables.
- **Nivel 2** ahora incluye insertar imágenes con límite de espacio (antes solo era
  "variables/elementos + intro condicionales"). El límite de espacio es precisamente el caso de
  uso real para el condicional que ya toca ese día ("si ya subió el máximo permitido, avisa / no
  dejes subir más").
- **Nivel 6** cambió de "reloj o carrusel" a **carrusel de proyectos destacados**
  exclusivamente. Un reloj digital no aporta nada a un portafolio real; el carrusel sí, y enseña
  el mismo concepto (repetición automática) sin introducir nada nuevo — combina imágenes
  (nivel 2) + bucle (nivel 4).

## Regla técnica sobre imágenes (nivel 2)

Las imágenes que sube el estudiante **no son estado interactivo del visitante** (eso sigue
prohibido tener backend, según la decisión de "sin persistencia en servidor" del diseño
pedagógico) — son **contenido estático del proyecto**, igual que su propio código HTML/CSS/JS.
Se tratan como archivos del proyecto del estudiante dentro del editor, con una cuota de
almacenamiento (ej. 10MB por estudiante), y se suben junto con el resto del código en el nivel 16
(deploy) — así aparecen para cualquier visitante real de la página publicada, no solo en el
navegador de quien las subió. No requiere una base de datos ni backend nuevo.

## Checkpoint de cohesión (no es un nivel numerado)

Antes de la demo final (dentro de Ju2, junto al pulido general del nivel 16), agregar una
revisión de tipo `review` — sin test oculto, sin autograder — donde el estudiante evalúa su
propia página como visitante: ¿el orden de las secciones tiene sentido?, ¿el contenido es real o
placeholder?, ¿algo se siente pegado en vez de integrado? Objetivo: que el conjunto de piezas
construidas nivel a nivel se sienta como una página coherente, no como funcionalidades apiladas
sin relación entre sí.

## Fuera de este sistema (pueden referenciar un nivel por número, pero no bloquean nada)

- Decoración libre — sin validación automática.
- Retos platino — desbloqueo propio y paralelo.
- Checkpoints orales — formato de implementación aún pendiente.
