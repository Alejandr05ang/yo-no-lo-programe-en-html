# Registro de decisiones

Estado: ✅ cerrada · 🟡 propuesta (a confirmar con el equipo del taller) · ⬜ pendiente

## Producto (del brief §8 — cerradas)

| # | Decisión | Estado |
|---|---|---|
| P1 | Lenguaje real: JavaScript. HTML como salida del DOM, nunca escrito a mano | ✅ |
| P2 | El sistema de niveles se traduce en "necesidad real" + desbloqueo por nivel (granular — hasta 3 niveles por día en jornadas de 4h, no un checkpoint único diario, ver brief §2.3/§4.1), no en instrucciones tipo "usa un for" | ✅ |
| P3 | Nombres de funciones/métodos descriptivos en español, sin ofuscación (`crearElemento`, `agregarA`, `obtenerDatos`, `repetir`, `si`/`sino`) | ✅ |
| P4 | Defensa anti-IA vía evaluación (tests ocultos + checkpoints orales + depuración), no vía dificultar la lectura | ✅ |
| P5 | Portafolio incremental y acumulativo (currículo en espiral), no bloques separados por tema | ✅ |
| P6 | Diagnósticos inicial y final: los provee el equipo del taller; la plataforma solo los presenta y guarda | ✅ |
| P7 | Minijuegos ("platino"): opcionales, fuera del flujo obligatorio, con su propio desbloqueo | ✅ |
| P8 | Vocabulario: se llama **encargo** al nivel/ejercicio; el estudiante nunca lee "usa un for". Toda la UI en español | ✅ |
| P9 | Frontend (CSS, HTML semántico, eventos, formularios, responsive, grid/flexbox) resuelto por capas: núcleo evaluado en clase + andamiaje entregado + decoración libre en casa (brief §5) | ✅ |

## Técnicas (de `arquitectura.md` — cerradas)

| # | Decisión | Estado |
|---|---|---|
| T1 | Backend: FastAPI + SQLite (SQLAlchemy) | ✅ |
| T2 | Frontend: React + Vite + TypeScript + React Router | ✅ |
| T3 | Editor: Monaco vía `@monaco-editor/react` | ✅ |
| T4 | Estado de servidor en el front: TanStack Query | ✅ |
| T5 | Autograder: subproceso Deno aislado (`--deny-all`) + timeout; DOM con linkedom | ✅ |
| T6 | Vista previa y portafolios publicados: `iframe` sandbox + `postMessage`, sin servidor | ✅ |
| T7 | Auth: correo + código de cohorte. Sin registro totalmente abierto | ✅ |
| T8 | Patrón: capas pragmáticas + puertos/adaptadores solo en ejecutor y dominio de revisión | ✅ |
| T9 | Deploy: backend en Fly.io/Railway (Docker Python+Deno); frontend estático | ✅ |
| T10 | Andamiaje CSS del portafolio (brief §5.2/§7.3): módulo propio (`lib/andamiajeEstilos.ts`), separado de `design-system.css` (eso es el chrome de la plataforma, no lo que ve el estudiante) — vocabulario chico y fijo (`.card`, `.nav`, `.badge-destacado`, `.grid`/`.grid-2`/`.grid-3`, `.fila`) + variables `:root` de color/tipografía/espaciado como único punto de personalización. Se inyecta en los dos lugares donde se renderiza el portafolio: `lib/sandbox.ts` (ejecución) y `PanelPreview.tsx` (vista previa final) | ✅ |
| T11 | Marcado de línea de error en el editor — hecho directamente por el usuario, fuera de esta sesión asistida: `lib/sandbox.ts` corre el código del estudiante con `eval()` + `//# sourceURL=estudiante.js` (así los números de línea de un error quedan relativos SOLO a su código) y parsea la línea real del stack (`__lineaDelError`, cubre también errores async como los de `cadaSegundo()` vía `window.onerror`). `VistaEstudiante.tsx` guarda esa línea en `salida.linea`; `EditorPanel.tsx` la pinta como marcador rojo de Monaco (`marcarLineaDeError`) solo después de "Ejecutar", nunca mientras se escribe — de hecho se desactivó a propósito la validación en vivo de Monaco (`noSemanticValidation`/`noSyntaxValidation: true`) para que el único juicio sobre el código sea correrlo, no un linter constante | ✅ |

## Propuestas — a confirmar con el equipo del taller

| # | Tema | Propuesta | Por qué se propone |
|---|---|---|---|
| C1 | Cómo se enuncia el reto: variantes 1a (prosa) / 1b (síntoma puro) / 1c (contrato de aceptación) | Empezar con **1a (prosa)** la primera semana; **1c (contrato)** la segunda; **1b (síntoma puro)** solo en retos platino | 1b es lo más fiel al juego original pero lo más riesgoso con media cohorte sin base; 1c mapea 1:1 al autograder. Es combinable por semana (handoff §1a–1c) |
| C2 | Estado de visitantes en portafolios ajenos | **Solo navegador** (`localStorage`), sin persistencia en backend | Suficiente para el objetivo pedagógico; evita moderación y escalamiento de memoria (brief §2.6). Si se quiere feedback real entre estudiantes, función aparte y moderada |
| C3 | Entrada de estudiantes | **Correo + código de cohorte**, sin CSV | Baja fricción para el instructor, cohorte-acotada, reutilizable, sandbox de facto privado |
| C4 | Layout de la pantalla 1a | Se desvía del mockup (`340px 1fr 404px`): **encargo, editor y preview son paneles plegables**; editor y preview parten 50/50 con **divisor arrastrable**; el preview tiene **selector de ancho** (móvil/tablet/escritorio/completo) y **modo pantalla completa** | El portafolio es la pieza protagonista y se exporta como sitio responsive real (brief §5.2, §5.9); el estudiante arma su espacio de trabajo. Se descartaron ventanas flotantes libres (trampa de usabilidad para principiantes, choca con el diseño "editorial y quieto", mata el responsive) |

## Progresión de encargos y API del estudiante

Ver `encargos.md` para el diseño completo. Decisiones que necesitan confirmación del equipo:

| # | Tema | Propuesta en `encargos.md` |
|---|---|---|
| EN1 | Nº de encargos: 1f dice "7", la progresión tiene 10 | Actualizar el copy de 1f a "10 encargos" |
| EN2 | API: `crearElemento("h1")` expone HTML | Funciones semánticas: `crearTitulo`, `crearParrafo`, `crearLista`, `crearItem`, `crearEnlace`… |
| EN3 | API: `si`/`repetir` helpers vs JS real | `if`/`else` y `for…of` reales, rotulados en español en el panel de herramientas |
| EN4 | `obtenerDatos()` vs `datos` global | `datos` global ya listo (quita carga del encargo 1) |
| EN5 | Texto estándar del "caso vacío" por sección | Pendiente |
| EN6 | El grader debe poder simular el paso del tiempo (`cadaSegundo`) | Detalle de implementación del autograder |

## Arquitectura del backend — a confirmar

Propuesta completa (esquema de datos, autorización en capas, autograder integrado) en
`backend-propuesta.md`. Principio central: **FastAPI es el único servidor** — el cliente nunca le
habla a Supabase/Firebase directo; lo que se use de ahí es solo Postgres gestionado y, opcionalmente,
emisión de tokens. Decisiones abiertas, resumidas:

| # | Tema | Notas |
|---|---|---|
| BA1 | ¿Postgres de Supabase o de otro proveedor (Neon, Railway, RDS)? | Ya no depende del cliente de Supabase (no se usa); Supabase suma Auth gratis si también se quiere BA2-A |
| BA2 | Emisión del enlace de acceso: ¿proveedor externo (Supabase/Firebase Auth) o FastAPI propio (T7 original)? | Externo = menos código; propio = cero dependencias externas de identidad |
| BA3 | ¿Instructor con más de una cohorte en v1? | Cambia si `usuarios.cohorte_id` alcanza o hace falta tabla puente desde el inicio |
| BA4 | Flujo de creación de la primera cohorte/instructor | Falta describir el "primer admin" |
| BA5 | Retención de la tabla `intentos` | Crece con cada entrega; definir política antes de que importe |

## Pendientes de definir (brief §9 + nuevos)

| # | Tema | Notas |
|---|---|---|
| D1 | ¿El progreso en retos platino suma a la nota final o es extra-crédito no determinante? | Recomendación del brief: extra-crédito visible pero no determinante |
| D2 | Detalle exacto del sistema de pistas progresivas: umbral de tiempo/repetición para activarlas | ✅ implementado el nivel base (un único texto por encargo, countdown fijo de 300s, `PanelEncargo.tsx`). Sigue pendiente el diseño de las 3 escaladas y los disparadores por patrón (líneas casi idénticas = copiar/pegar) — eso no se tocó |
| D3 | Formato de los checkpoints orales: ¿registrados en la plataforma o solo proceso manual del instructor? | El dashboard (1d) ya contempla registrarlos en la plataforma |
| D4 | Límite de memoria del subproceso Deno y manejo de OOM | Detalle de implementación del autograder |
| D5 | Subconjunto exacto de la API en español que expone el grader y shim de DOM (linkedom) | Debe coincidir con la API desbloqueada por día |
| D6 | Verificación del deploy final del estudiante (Git + Vercel/Netlify) — brief §5.9 | Mostrar la URL pública generada dentro de la plataforma |
| D7 | Persistencia: ¿SQLite basta para todas las cohortes previstas o se migra a Postgres desde el inicio? | SQLAlchemy hace la migración barata; decidir según nº de cohortes concurrentes esperadas |
| D8 | ¿Self-hostear Monaco o dejarlo cargar desde CDN? | `@monaco-editor/react` carga Monaco desde jsdelivr por defecto. Un taller presencial con wifi flojo probablemente quiere Monaco servido desde `public/` |
| D9 | ¿Se revisa/valida de alguna forma mínima la "decoración libre" en casa, o queda sin supervisión hasta la demo final? | Brief §9 — ej. checklist de que no rompió el andamiaje entregado |
| D10 | ¿Se confirma `.length` (y equivalentes) como parte del núcleo curricular de Ma2 (brief §5.7)? | El bloqueo *técnico* ya no existe (ver auditoría de H3 arriba): `datos.hobbies.` ya autocompleta `.length` en el editor. Lo que queda pendiente es solo la confirmación pedagógica del equipo, no una limitación de la plataforma |
| D11 | ¿Se invierte tiempo de desarrollo en el onboarding del editor (video corto y/o tour guiado, brief §7.5) o se deja para una iteración posterior a la primera cohorte? | No bloquea el lanzamiento de la beta. Para V1 (día sin charla) deja de ser opcional — ver D13 |
| D12 | Refactor de "desbloqueo por día" a "desbloqueo por nivel" (brief §4.1/§7.3.1, catálogo completo en `niveles.md`): hoy `lib/sesiones.ts`/`lib/progreso.ts`/`Mapa.tsx` modelan el avance como un encargo-frontera por día; el nuevo diseño pide 16 niveles lineales (`niveles.md`), cada uno con su propio checkpoint, y varios por sesión de 4h | Cambio de arquitectura del frontend mock, no solo de contenido — afecta el modelo de progreso completo. El catálogo ya está cerrado (`niveles.md`); lo pendiente es el alcance/prioridad de la implementación, no el diseño |
| D14 | `niveles.md` nivel 2 (Mi1) agrega "insertar imágenes con límite de espacio" | 🟡 parcial — `crearImagen(url, descripcion)` ya funciona y es descubrible (ver D15): eso cubre el ejercicio pedagógico en sí (igual que `crearEnlace()`, toma una URL, no un archivo). Lo que falta de verdad es la subida de **archivos propios** del estudiante con cuota (~10MB) para el deploy real (nivel 16) — eso sí es UI+lógica nueva, sin encargo de Mi1 que lo ejercite todavía |
| D15 | `niveles.md` nivel 6 (V1) redefine el ejercicio como **carrusel de proyectos destacados** | ✅ implementado — `encargo 8` reescrito (`lib/encargos.ts`): filtra `datos.proyectos` por `destacado` y usa `cadaSegundo()` para avanzar solo. De paso se destapó que `crearImagen()` (ya existía en el runtime, `lib/sandbox.ts`) estaba invisible para el estudiante: sin tag de herramienta, sin ficha, sin autocompletar. Se agregó a `HERRAMIENTAS_POR_SESION.V1`, `apiDocs.ts` y el `extraLib` de Monaco (`EditorPanel.tsx`) — verificado con Playwright. Nivel 7 (botones prev/next) queda dentro del mismo encargo 8 por ahora, no como checkpoint separado — eso sí depende de D12 |
| D13 | Riesgo de V1 (único día sin charla presencial, cae temprano — día 5 de 10) para el ~50% del grupo sin base previa: ¿qué pasa con quien no logre N10/N11 solo? | Brief §9 — opciones sobre la mesa: retomar al inicio de L2, sesión de dudas breve, o dejarlo como deuda que se resuelve en la práctica de Mi1/L2 sin bloquear avance |

## Hallazgos de la beta con tester técnico (12-sep) — brief §7.4

| # | Hallazgo | Tipo | Estado |
|---|---|---|---|
| H1 | Botón "Entregar a revisión" tiene muy poco contraste frente a "Ejecutar" (que sí resalta) — el tester no lo encontró estando al lado | Bug de UI | ✅ corregido — `vista-estudiante.css` aplicaba el tratamiento de acento del panel oscuro solo a `.btn-primary`; el handoff (§Paleta panel oscuro) pide el mismo borde/color para ambos botones |
| H2 | El bloqueo por checkpoint ("faltaba código de una revisión anterior") no comunica con claridad qué falta o qué revisar | Bug de UX | ✅ corregido — las celdas `manana`/`cerrado` del Mapa (`Mapa.tsx`) ahora llevan `title` explicando que es desbloqueo por día (ritmo de grupo, brief §2.7), no un error |
| H3 | El autocompletado muestra entradas ambiguas sin distinguir origen (`decodeURI`, `decodeURIComponent`, `document`, `date`/`var date`, `image`, `file`) — no está claro qué es nativo de JS, qué es del proyecto, ni si todo funciona | Auditoría pendiente | 🟡 parcial — ver nota abajo |

**Auditoría de H3:** la causa raíz era que la API curada (`crearTitulo`, `mostrar`, `datos`, …) nunca estaba declarada en ningún archivo del proyecto Monaco — por eso ni autocompletaba ni tenía docs, mientras que Monaco sí ofrecía de fondo el scope global completo de JS/DOM sin filtrar. Arreglado en `EditorPanel.tsx` (`javascriptDefaults.addExtraLib`): ahora la API curada aparece primero, con firma y la descripción en español de `apiDocs.ts` al pasar el mouse (verificado con Playwright: escribir `crea` muestra las 6 funciones `crear*` arriba de todo). De paso, esto resuelve la causa técnica de que `.length` no apareciera (D10): `datos` pasó de no estar declarado a tener forma concreta (`hobbies: string[]`, etc.), así que `datos.hobbies.` ya ofrece `.length`, `.map`, etc. — verificado igual con Playwright.
Lo que queda sin resolver: los globales nativos de JS/DOM (`decodeURI`, `Date`, `document`, `Image`, `File`, y decenas más) siguen apareciendo debajo, sin filtrar. No se puede quitarlos solo con `compilerOptions.lib` sin perder también los TIPOS de DOM que el temario sí necesita más adelante (`classList`, `addEventListener`, `style` — L2/Ju1/Mi2): la librería que declara el global `document` es la misma que declara esos miembros. Suprimir solo los globales y conservar los tipos exigiría un filtro de autocompletado propio (interceptar `registerCompletionItemProvider`/el worker de TS) — está fuera de alcance de este arreglo puntual; queda como mejora futura si el equipo lo prioriza.

## Revisión automática local (mock, sin backend)

Bug encontrado por el usuario: los encargos 4-11 mostraban siempre "Este encargo todavía no
tiene revisión automática (pendiente de diseño del contenido)" y **nunca se podían aceptar** —
`lib/revisionLocal.ts` solo tenía casos de prueba reales para los encargos 1-3; del 4 en
adelante caían en la rama de relleno (`casosPasados: 0` fijo), bloqueando el loop central para
siempre pasado el primer día.

**Corregido:** se escribieron casos reales para los 8 encargos restantes (`CASOS_POR_ENCARGO`
4-11 en `revisionLocal.ts`), del mismo estilo que los de 1-3 (verificación estructural del DOM
resultante, sin variar los datos — sigue siendo la versión "de juguete" que ya advertía el
comentario del módulo, no el autograder real de casos ocultos variables). Se amplió `CasoLocal`
para recibir también `datos` (antes solo el `Document`), necesario porque varios encargos (4, 7,
8, 9, 10, 11) dependen de datos dinámicos (`datos.redes`, `datos.hobbies`, `datos.proyectos`,
`datos.skills`), no solo de estructura fija. Se ajustó `totalCasos` en `encargos.ts` (6: 2→3, 7:
4→3) para que coincida con los casos realmente escritos, y se agregó un tercer proyecto de tipo
desconocido al override del encargo 11 (la prosa del encargo prometía ese caso — "un tipo que no
conozcas no debe romper la página" — pero no había ningún dato con un tipo no contemplado).

Verificado con Playwright: se escribió una solución correcta por encargo y se confirmó
3/3, 3/3, 3/3, 3/3, 3/3, 4/4, 3/3, 3/3 — pasan íntegro. Y una solución incorrecta a propósito en
el encargo 9 (mostrar todos los proyectos sin filtrar) falla exactamente el caso esperado
("No se muestran los proyectos sin terminar"), confirmando que las pruebas sí detectan errores,
no solo pasan siempre.

**Lo que NO se tocó (aparte, no era el pedido):** el `andamiajeNuevo` de los encargos 4-11 sigue
siendo el placeholder genérico ("el andamiaje detallado está pendiente de diseño") — eso es el
código de arranque/pistas en el editor, no la revisión. Escribir el andamiaje narrativo completo
(al estilo de los encargos 1-3, con comentarios guiados) es un trabajo de contenido aparte.

## `crearSalto()` — nueva herramienta (agregada por el usuario)

Se sumó `crearSalto()` al runtime (`lib/sandbox.ts`: crea un `<div class="salto">` como
separador visual), documentada en `apiDocs.ts` y habilitada en
`HERRAMIENTAS_POR_SESION.Mi1` (junto a `crearEnlace()` y `condición` — encaja con el encargo 4,
para separar enlaces de redes). Ya tiene estilo real en el andamiaje CSS curado (`.salto { height: var(--espaciado) }` en
`lib/andamiajeEstilos.ts`). **Pendiente:** a diferencia de las demás herramientas curadas, no se
agregó todavía al `extraLib` de Monaco en `EditorPanel.tsx` (`LIB_API_CURADA`) — hoy no
autocompleta ni tiene hover-doc en el editor, el mismo síntoma que tenía `crearImagen()` antes de
la auditoría de H3/D15.

## Bugs conocidos (menores)

| # | Síntoma | Causa | Alcance / mitigación | Estado |
|---|---|---|---|---|
| B1 | Al editar `frontend/src/lib/musica.ts` con `npm run dev` activo y música sonando, se escuchan **dos pistas a la vez** con desfase; el botón de pausa solo detiene una | Vite recarga el módulo en caliente (HMR) pero el `<audio>` de la instancia anterior sigue vivo en su clausura; el módulo nuevo crea otro y sus controles solo gobiernan el suyo | **Solo desarrollo**, y solo al tocar ese archivo en vivo — nunca en el build de producción (Netlify). Mitigado: `crearAudio()` llama a `destruirAudio()` antes de instanciar, y `import.meta.hot.dispose()` frena el audio viejo al recargar el módulo. Si ya quedó un audio huérfano, un hard-refresh (Ctrl+Shift+R) lo silencia | 🟡 mitigado, no bloqueante |
| B2 | Falta la pista `malibu.mp3` en `frontend/public/music/` | El FS de Windows es case-insensitive: al renombrar `Malibu.mp3` → `malibu.mp3` en el reencodeo, el `rm` del original borró el archivo recién creado (mismo nombre para el FS) | El resto de pistas está intacto (sus nombres difieren en más que mayúsculas). Hay que volver a añadir ese archivo, reencodearlo a 128 kbps y sumar `{ archivo: 'malibu.mp3', titulo: 'Malibu' }` a `PISTAS` | ⬜ pendiente de resupply |
