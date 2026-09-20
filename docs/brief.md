# Diseño de Plataforma — Taller de Desarrollo Web para Principiantes

> **Nota de versión:** esta revisión reestructura el cronograma y el sistema de niveles a partir de
> cuatro decisiones: (1) el entregable (portafolio publicado) manda sobre el temario, no al
> revés; (2) las sesiones antes marcadas de "4 horas" (martes/jueves) son en realidad la misma
> clase de 2 horas dictada dos veces para dos grupos, no el doble de contenido; (3) el material
> teórico de referencia ("Tutorías de Verano") deja de ser guía de calendario y pasa a ser consulta
> puntual; (4) **corrección del 19-sep** — el nivel "reloj/saludo automático" (antes E8) no se
> elimina sin reemplazo como se planteó en un primer borrador de esta revisión: se **reemplaza**
> por un carrusel de proyectos destacados, que enseña el mismo concepto (repetición que no
> termina) con peso visual real en un portafolio — ver §4.1 nota y `docs/decisiones.md`. Las
> secciones marcadas **[ACTUALIZADO]** cambian respecto a la versión anterior.

## 1. Concepto general

Plataforma educativa inspirada en la mecánica de **The Farmer Was Replaced**: en vez de niveles explícitos con instrucciones directas ("ahora usa un bucle"), el estudiante enfrenta **necesidades reales** dentro de un proyecto continuo — un portafolio web personal — que solo pueden resolverse aprendiendo el concepto de programación correspondiente. El aprendizaje se descubre por presión del problema, no por instrucción directa.

**Restricción del equipo:** no basarse en HTML5 como lenguaje principal (no se considera "lenguaje de programación" para efectos del taller). Solución: **JavaScript es el lenguaje real**; el HTML se genera como *salida* del código (manipulación del DOM: `createElement`, `appendChild`, `style`, etc.), con una excepción puntual explicada en la sección 5.

**Objetivo final:** cada estudiante termina el taller con un portafolio web personal, real y publicado en internet (no un ejercicio de juguete), construido pieza por pieza a lo largo de dos semanas, **publicado una única vez**, al final, no en publicaciones incrementales.

**Público:** estudiantes recién ingresando a programación. Nivel heterogéneo esperado: aproximadamente mitad con bases previas, mitad sin ninguna experiencia.

---

## 2. Principios pedagógicos centrales

### 2.1 Currículo en espiral

No se enseña "domina X, luego pasa a Y" de forma lineal. Se vuelve sobre los mismos conceptos añadiendo una capa nueva cada vez, igual que la progresión del juego:

1. Acción manual (variables, creación de elementos uno a uno)
2. Acción condicional ("solo si...")
3. Repetición de una sola acción (bucle simple)
4. Repetición + condición combinadas
5. Repetición + acciones distintas según el tipo de dato (funciones/ramificación dentro del bucle)

Cada etapa **incluye y reutiliza** la anterior, no la reemplaza.

**[ACTUALIZADO] La capa visual (color, tipografía, columnas) sigue esta misma regla — no es un tema aislado.**
Se introduce una sola vez, con sesión propia (N4, Ju1), pero se **reusa** después en dos momentos
concretos: al aplicar clases condicionalmente sobre proyectos destacados (N7, L2, reutiliza el `if`
que ya conocen) y al vestir con grid el contenido ya generado (N12, Ju2). Igual que bucles y
condicionales, no aparece y desaparece — vuelve con una pregunta nueva cada vez.

### 2.2 Necesidad real, no instrucción directa

El estudiante nunca recibe "usa un `for`". Recibe un problema (por ejemplo: "tienes 12 proyectos y no puedes escribir el código de cada uno a mano") cuya única salida razonable es el concepto nuevo. El descubrimiento es del *cuándo/cómo*, no del *qué existe* — los nombres de métodos y funciones son siempre claros y descriptivos, nunca ofuscados.

### 2.3 Validación automática + desbloqueo por nivel **[ACTUALIZADO]**

Dos capas independientes que trabajan juntas:
- **Tests ocultos**: miden comprensión real, no solo que "se vea bien" con el ejemplo dado.
- **Desbloqueo por nivel, no por día ni por fecha del calendario**: un nivel se desbloquea cuando su
  test pasa (o, si es de tipo `review`, cuando el instructor lo confirma) — no cuando llega su
  sesión programada. El calendario en §4 indica cuándo se **dicta** cada nivel, no cuándo el
  estudiante debe completarlo.

El sistema distingue dos tipos de nivel:
- **`code`** — se completa vía autograder (test oculto pasa → completado). Es la mayoría.
- **`review`** — no tiene "respuesta correcta" única (personalización visual, vestir el portafolio).
  Se marca completo por confirmación del instructor sobre un checklist mínimo (p. ej. "¿cambió al
  menos una variable de color y aplicó al menos una clase de grid?"), no por test oculto.

Esto reemplaza el modelo anterior de "un nivel por día": con el contenido reorganizado en torno al
entregable, varios niveles caen en la misma sesión y otros (V1) se resuelven como tarea sin charla —
ver tabla completa en §4.1.

### 2.4 Defensa anti-IA vía evaluación, no vía ofuscación

El código sigue siendo legible y con nombres claros. La defensa contra copiar-pegar de una IA está en cómo se evalúa: tests ocultos, checkpoints orales, ejercicios de depuración/lectura de código — no en hacer el código difícil de entender.

### 2.5 Contenido dinámico sin persistencia en servidor

El estado del portafolio interactivo vive en el navegador del visitante (no hay backend que lo guarde). Simplifica la arquitectura y evita temas fuera de alcance del taller.

### 2.6 El entregable manda sobre el temario **[NUEVO]**

Si un tema teórico normalmente tarda más de lo que el calendario permite, el taller se adelanta
igual — no se retrasa la construcción del portafolio por completitud teórica. El material de
referencia ("Tutorías de Verano", ver §5.9) documenta el ecosistema completo de la plataforma; el
taller solo dicta lo que hace falta para que el estudiante construya y publique su propia página.
Consecuencia directa: el portafolio se divide en dos columnas (§4.2) — una **vertebral**, que nadie
sale del taller sin tener, y una de **expansión**, que se dicta en el orden en que el tiempo alcance
y es lo primero que se recorta si algo se atrasa.

---

## 3. Manejo de grupo heterogéneo **[ACTUALIZADO]**

Todas las sesiones son de **2 horas de contenido**. Los días antes marcados "martes/jueves = 4h" en
realidad dictan la misma sesión de 2h **dos veces**, para dos grupos distintos — no el doble de
contenido en un solo bloque continuo. Esto invalida el modelo anterior de "primera mitad
explicación general, segunda mitad práctica supervisada con dos velocidades dentro del mismo
grupo", que dependía de tener 4 horas continuas con un solo grupo.

**Pendiente de definir (ver §9):** cómo se resuelve la práctica supervisada dentro de una sesión de
2h para quien no tiene base, ahora que no existe el bloque largo que la sostenía.

El diagnóstico final (mismo formato, provisto por superiores) sirve como comparación y como señal para ajustar el ritmo en futuras cohortes.

---

## 4. Cronograma — 2 semanas, 5 días/semana **[REESCRITO]**

Formato de sesión: **todas las sesiones son de 2h**. Martes y jueves se dictan dos veces (dos
grupos), no se duplica contenido por tener más horas de reloj.

### 4.1 Tabla de niveles (13 niveles núcleo + 2 sub-niveles de consola)

El número de nivel es el orden del **concepto**, no de la fecha. "Capa" refiere a la progresión
espiral de §2.1 (1=acción manual … 5=bucle+tipo de dato). Tipo: `code` (test oculto) o `review`
(confirmación de instructor).

| N | Tema (un solo concepto) | Tipo | Capa | Sesión | Encargo(s) |
|---|---|---|---|---|---|
| N1 | Variables + crear/mostrar elementos (DOM) | code | 1 | L1 (inicio) → Ma1 (cierre) | E1, E2, E3 |
| N2 | Condicional: mostrar según **exista** un dato | code | 2 | Mi1 | E4 |
| N3 | Bucle sobre una colección de tamaño desconocido | code | 3 | Mi1 (misma sesión) | E5 → E6 |
| N4 | Personalización visual: paleta, tipografía, columnas | review | — | Ju1 | — (sin test oculto) |
| N5 | Condicional sobre el **estado** de un dato + repetición automática con filtro | code | 2→3 | V1 *(tarea, sin charla)* | E7, E8 |
| N6 | Bucle + condición para filtrar | code | 4 | L2 | E9 |
| N7 | Clases CSS desde JS según condición (destacados) | review | — | L2 (misma sesión, reusa N6) | E9-ext *(por definir, ver §9)* |
| N8 | Matrices + primera función propia | code | 5 | Ma2 | E10 |
| N9 | Función que ramifica según el tipo de dato | code | 5 | Ma2 (misma sesión) | E11 |
| N10 | Consola — resolver un turno | code | 5 | Mi2 | Batalla A |
| N11 | Consola — combate completo | code | 5 | V2 *(quien termine temprano)* | Batalla B |
| N12 | Vestir el portafolio: grid en skills + repaso visual | review | — | Ju2 (reusa N4/N7) | — |
| N13 | Git: `add` / `commit` / `push` | verificado | — | V2 | — |
| N14 | Deploy (Netlify/Vercel) — **evento único** | verificado | — | V2 | — |

**E12 "formulario de contacto" queda sin sesión asignada — ver §9, pendiente crítico.**

**N5 combina dos encargos cortos en el mismo día autónomo (corrección del 19-sep):** un primer
borrador de esta revisión eliminaba el nivel "reloj/saludo automático" (antes E8) sin
reemplazo, por considerar que un bucle infinito en pseudocódigo no aportaba peso visual real a
un portafolio. Se revirtió esa decisión: el concepto (repetición que no termina, `cadaSegundo`)
se mantiene porque es la única forma de introducir ese patrón antes de la consola (N10/N11), pero
se **re-encarna** como **carrusel de proyectos destacados** (E8) — filtra `datos.proyectos` por
`destacado` y rota uno a la vez, en vez de mostrar un saludo según la hora. E8 se dicta el mismo
día que E7 (aviso condicional), ambos en V1 (tarea autónoma, sin charla), y no consume una sesión
propia porque los dos encargos son cortos y V1 ya era el día "sin charla" reservado para
consolidación. Ver `docs/decisiones.md` para el detalle del hallazgo que motivó la reversión.

### 4.2 Columna vertebral vs. expansión

- **Vertebral (nadie sale sin esto):** N1, N2, N3, N6, N13, N14. Identidad + contacto + lista +
  proyectos filtrados + publicación.
- **Expansión (se dicta en el orden que el tiempo permita):** N4, N5, N7, N8, N9, N10, N11, N12,
  y el formulario (E12) una vez ubicado.
- **Orden de recorte si algo se atrasa** (de lo primero que se cae a lo último, la vertebral nunca
  se toca): N11 (combate completo) → N9 → N12 → N8 → N7.

### 4.3 Cronograma día a día

**Semana 1 — construir la base vertebral**

| Día | Nivel(es) dictados | Al cerrar la sesión, el estudiante tiene... |
|---|---|---|
| L1 | Diagnóstico inicial (externo, fijo) + orientación mínima (DevTools, tour del editor) + arranque de N1 (E1) | Su nombre apareciendo en una página que él mismo generó |
| Ma1 | N1, cierre (E2, E3) | Identidad completa: nombre + bio + secciones |
| Mi1 | N2 (E4) + N3 (E5 → E6) | Contacto reactivo a datos + lista de hobbies generada desde un array |
| Ju1 | N4 — personalización visual | Su paleta, su tipografía, su layout en columnas propios |
| V1 *(tarea, sin charla — §7.5 obligatorio)* | N5 (E7, E8) + **reto creativo del fin de semana**: embellecer con lo aprendido el jueves | El aviso condicional resuelto, el carrusel de destacados rotando solo, y un portafolio con esfuerzo estético real detrás |

**Semana 2 — completar, vestir y publicar una sola vez**

| Día | Nivel(es) dictados | Al cerrar la sesión, el estudiante tiene... |
|---|---|---|
| L2 | N6 (E9) + N7 (destacados con `classList`, reusa N4) | Proyectos filtrados **y** marcados visualmente — columna vertebral del contenido completa |
| Ma2 | N8 (E10) + N9 (E11) | Skills agrupados por categoría + proyectos renderizados distinto según su tipo |
| Mi2 | Consolidación N8–N9 + N10, consola "un turno" | Ejercicios reforzados + primer combate resuelto en consola |
| Ju2 | **Sin terminal, sin comandos, sin ejecución.** N12: vestir el portafolio (grid en skills, repaso de paleta/tipografía/`classList` sobre contenido real). Últimos 15 min: descargar el repo como zip y **leer** el código, sin ejecutar nada | El sitio se ve terminado — pero aún no existe en internet (cliffhanger deliberado) |
| V2 | N13 + N14: Git y deploy **(evento único)** + diagnóstico final (externo, fijo) + demo. Quien termine temprano → N11, consola "combate completo" | **URL pública real**, publicada el mismo día que se muestra |

---

## 5. Capa de frontend — desarrollo completo

### 5.1 Por qué el modelo es "núcleo en clase + decoración en casa"

El límite real del taller son las horas, no el temario. La salida es separar **funcionalidad** (se
explica, se practica, se evalúa en clase) de **estética libre** (paleta exacta, animaciones,
cantidad final de columnas — el estudiante la resuelve solo, sin supervisión, más allá de lo que ya
cubre N4/N12).

### 5.2 CSS — por clases, no por hoja de estilos desde cero **[ACTUALIZADO — vuelve a núcleo]**

Aplicar clases predefinidas (`.card`, `.grid`, `.badge-destacado`, `.nav`) **desde JavaScript** con
`classList.add()`/`classList.toggle()` es **núcleo evaluado**, no decoración libre — se había
recortado por presupuesto de horas en una revisión anterior y fue un error: sin esto, la capa
visual introducida en N4 queda huérfana, sin volver a aparecer en el resto del curso, rompiendo la
regla del currículo en espiral (§2.1). Vive en dos niveles: N7 (L2, condicional sobre destacados) y
N12 (Ju2, aplicado al grid de skills).

Variables CSS en `:root` para color/tipografía/espaciado siguen siendo la vía de personalización
libre además de lo cubierto en N4/N12.

### 5.3 HTML semántico — por lectura, no por escritura

Sin cambios: el esqueleto (`header`, `nav`, `main`, `section`, `footer`) se entrega resuelto y se
explica por lectura en la orientación de L1/Ma1, nunca se escribe a mano.

### 5.4 Eventos

`addEventListener` se necesita para el formulario de contacto (E12). **Sesión pendiente de asignar
— ver §9.**

### 5.5 Formularios

Sin cambios de contenido (leer `input`/`textarea`, `submit` + `preventDefault()`, validación mínima
con los condicionales que ya conocen). Cambia solo su ubicación en el calendario — pendiente.

### 5.6 Responsive y DevTools

DevTools se resuelve en 10-15 min dentro de la orientación de L1. **Media queries y prueba en
celular real salen de la fila de niveles evaluados** (recorte de presupuesto de horas, §4.2): quedan
como parte del andamiaje entregado (§5.8), no como nivel con test propio.

### 5.7 Grid/Flexbox y `.length`

Grid/flexbox se evalúa en N12 (Ju2), aplicado sobre contenido real ya generado — ya no como nivel
propio con test oculto de layout desde cero, sino como parte de "vestir el portafolio". `.length`
se absorbe dentro de N8 (matrices) como herramienta necesaria, no como tema aislado — **sigue
bloqueado por el hallazgo de beta de §7.4**, sin resolver.

### 5.8 Resumen por capas

| Capa | Qué significa | Qué entra |
|---|---|---|
| **Núcleo** (clase, evaluado) | Se explica, se practica, se evalúa | Lógica completa + DOM + `classList` condicional (N7, N12) + Git/deploy |
| **Andamiaje** (entregado, usado) | Se entrega funcionando; el estudiante lo usa y modifica | Hoja de estilos con clases y variables `:root`, esqueleto HTML, clases de grid/flexbox, media queries base |
| **Decoración libre** (sin supervisión) | El estudiante lo resuelve solo, a su gusto | Animaciones, ajustes finos más allá de N4/N12, orden exacto de columnas |

### 5.9 Rol del material teórico de referencia ("Tutorías de Verano") **[NUEVO]**

La página teórica usada para explicar el ecosistema de la plataforma **no es guía de calendario**.
De sus 10 temas, solo una parte es materia que el estudiante ejercita en el editor:

| Tema de la página | ¿Es currículo del taller? | Dónde vive |
|---|---|---|
| 1. Entrada, Proceso y Variables | Sí | N1 |
| 2. Condicionales | Sí | N2, N5 |
| 3. Bucles | Sí | N3 |
| 4. Arrays | Sí | N8 (matrices) |
| 5. HTML / DOM | Sí, por lectura | §5.3 |
| 6. CSS y Diseño | Sí, reencuadrado | N4, N7, N12 |
| 7. React y Componentes | **No** — describe cómo está construida la plataforma, no algo que el estudiante programa | Referencia únicamente |
| 8. Interactividad y Estado | **No** — describe la arquitectura interna (React state, localStorage del prototipo) | Referencia únicamente |
| 9. Lógica Combinada | Sí | N9, N10, N11 (consola) |
| 10. Build y Despliegue | Parcial — el flujo de Netlify descrito ahí es el de referencia; en el taller el deploy es manual, guiado, evento único | N14 |

Si un tema de esta lista tarda más en explicarse de lo que el calendario del taller permite, el
taller avanza igual (§2.6) — la página queda como consulta posterior, no como bloqueo.

---

## 6. Otros elementos del taller

### 6.1 Sistema de pistas y ejercicios de depuración

Módulo de ejercicios de lectura/depuración de código (mostrar código con error o pedir predicción
de output) como parte de la evaluación formativa. **No ocupa sesión propia** — el contenido de Ju2
(§4.3) es vestir el portafolio, no depuración; este módulo queda disponible como recurso transversal
de refuerzo, no como bloque fijo de calendario.

### 6.2 Batalla por turnos en consola — núcleo, no reto opcional **[ACTUALIZADO]**

**Deja de ser un reto "platino" opcional** — es capstone curricular de la capa 5 del espiral (N10,
N11), con test oculto y sesión asignada (Mi2 y V2). Se ejecuta **únicamente en consola/texto plano**,
nunca se mezcla con el DOM ni con el preview del portafolio.

- **N10 "Un turno":** dos criaturas con vida y un ataque con tipo. Tests: mismo par de tipos → mismo
  daño · tipo no previsto en la tabla → daño normal, sin romper · la vida nunca queda negativa.
- **N11 "Combate completo":** incógnita — cuántos turnos dura, no se sabe al escribir el código.
  Tests: con acciones fijas inyectadas, el registro coincide turno a turno · el combate siempre
  termina · gana quien debe ganar · vida inicial en 0 no rompe. Las acciones del jugador entran
  como array precargado que el test sustituye (igual que `datos.proyectos` en los demás encargos),
  no vía `prompt()`, para que el autograder corra el combate de forma determinista.

**Retos opcionales ("platino") restantes, sin cambios:** Memoria de imágenes, Ahorcado, Buscaminas,
Serpiente, Tanques, Space Invaders — separados del portafolio principal, no bloquean el avance,
desbloqueo propio.

### 6.3 Módulo de cierre (Git/Deploy)

Guía o mini-tutorial integrado para: inicializar repo, `git add`/`commit`/`push`, y conexión con
Vercel o Netlify. **Se ejecuta una sola vez, el viernes final (V2)** — no hay publicaciones
incrementales durante la semana 2. Idealmente con verificación de que el deploy fue exitoso
(mostrar la URL pública generada dentro de la plataforma).

---

## 7. Requisitos técnicos de la plataforma

### 7.1 Editor de código

Editor embebido en el navegador: Monaco Editor (motor de VS Code) o CodeMirror. Debe soportar
resaltado de sintaxis tipo JavaScript.

### 7.2 Entorno de ejecución / sandbox

Ejecución del código del estudiante en `iframe` aislado o Web Worker, con vista previa en vivo.
Alternable entre tamaño de escritorio y móvil.

**[NUEVO] Modo consola.** N10 y N11 no tienen DOM ni preview de página — necesitan un modo de
salida de texto plano dentro del mismo sandbox. El modelo de datos de cada encargo necesita un
campo de contexto (p. ej. `contexto: 'portafolio' | 'consola'`) para que el frontend sepa qué
renderizar. Es el cambio técnico más grande de esta revisión — confirmar con el equipo de build
antes de implementar los encargos de consola.

### 7.3 Librería de clases CSS y esqueleto entregado

Sin cambios: hoja de estilos base con clases predefinidas, variables `:root`, `index.html`
esqueleto con etiquetas semánticas, inyectados desde el día 1. Separación de archivos: el
estudiante no puede romper accidentalmente el andamiaje editando solo su JS.

### 7.3.1 Desbloqueo por nivel, no por día

El autograder soporta múltiples checkpoints por sesión (ver §2.3). La barra de progreso visible
para el estudiante representa **nivel**, no día ni fecha. Un nivel `review` se marca completo por
confirmación del instructor sobre un checklist, no por test oculto — mismo pipeline de
"completado/pendiente" que un nivel `code`, pero validado distinto.

### 7.4 Hallazgo de beta pendiente — `.length` en el autocompletado

**Sigue sin resolver.** El autocompletado del editor no incluye `.length` actualmente, lo cual
choca con su uso como herramienta necesaria en N8 (matrices). Debe confirmarse antes de esa sesión
si se habilita en el editor o si el diseño de N8 debe ajustarse a lo que la plataforma permite hoy.
El autocompletado también muestra entradas ambiguas sin distinguir origen (`decodeURI`, `document`,
`date`, `image`, `file`) — pendiente de auditoría.

### 7.5 Onboarding para V1 (día sin charla)

Sigue siendo **obligatorio**, no opcional, para V1: video corto (1-2 min) y/o tour guiado del
editor — es la única guía que el estudiante tiene ese día para N5 y para el reto creativo del fin
de semana, al no haber instructor en vivo.

---

## 8. Resumen de decisiones ya cerradas (no requieren más discusión)

- Lenguaje real: JavaScript. HTML dinámico como salida del DOM; único HTML escrito de antemano es
  el esqueleto semántico entregado y explicado por lectura (§5.3).
- Desbloqueo por **nivel**, no por día ni por fecha — el calendario en §4 es guía de dictado, no
  contrato de avance.
- Nombres de funciones/métodos descriptivos, sin ofuscación.
- Defensa anti-IA vía evaluación (tests ocultos + checkpoints orales + depuración), no vía
  dificultar la lectura del código.
- Portafolio construido de forma incremental y acumulativa (currículo en espiral), no en bloques
  separados por tema.
- Diagnósticos inicial y final: provistos por los superiores, fijos en L1 y V2 respectivamente —
  fuera del alcance de diseño de este documento.
- Minijuegos "platino" (Memoria, Ahorcado, Buscaminas, Serpiente, Tanques, Space Invaders):
  opcionales, fuera del flujo obligatorio. **La batalla por turnos en consola ya NO es parte de
  esta lista — es núcleo curricular (N10, N11), §6.2.**
- Frontend (CSS, HTML semántico, eventos, formularios, responsive, grid/flexbox) resuelto por
  capas: núcleo evaluado + andamiaje entregado + decoración libre — **`classList` condicional
  vuelve a ser núcleo evaluado (§5.2), no decoración.**
- **Todas las sesiones son de 2 horas de contenido**; los días "martes/jueves" dictan la misma
  sesión dos veces para dos grupos, no duplican contenido.
- **El deploy es un evento único**, al final del taller (V2) — no hay publicaciones incrementales
  durante la semana 2; el código se sube a GitHub el mismo viernes, no antes.
- **El nivel "reloj/saludo automático" (antes E8) se reemplaza por un carrusel de proyectos
  destacados** (decisión del 19-sep, revierte un borrador previo que lo cortaba sin reemplazo) —
  mismo concepto de repetición infinita, con peso visual real en un portafolio. Se dicta en V1,
  junto con el aviso condicional (E7).
- El material teórico "Tutorías de Verano" es consulta de referencia, no guía de calendario (§5.9);
  de sus 10 temas, 7 y 8 no son currículo del taller (describen la arquitectura interna de la
  plataforma, no algo que el estudiante programa).

## 9. Pendiente de definir **[ACTUALIZADO]**

- **Crítico — sin sesión asignada:** dónde entra el formulario de contacto (E12, `addEventListener`
  + validación). Se cayó de la tabla al reintegrar `classList` en L2 y no se reubicó todavía.
- **Riesgo V2:** Git + deploy + diagnóstico final + demo, y opcionalmente N11 (consola), todo en una
  sola sesión de 2h. Si el diagnóstico se extiende, puede no alcanzar el tiempo para que todos
  publiquen antes de la demo. Dos salidas sin decidir: (A) la demo se hace con lo que cada uno
  tenga, publicado o no, y el deploy pendiente se cierra como cola post-taller; (B) se recorta N11
  de V2 para asegurar el tiempo de deploy.
- **Riesgo Ma2:** matrices (N8) + función-según-tipo (N9) el mismo día de 2h — sigue siendo la
  sesión más pesada del curso, sin bloque largo que la sostenga tras el cambio de §3.
  Mi2 ayuda parcialmente (consolidación antes de consola) pero no lo resuelve del todo.
- **Modelo de práctica supervisada sin definir** tras eliminar los bloques de 4h continuos (§3): con
  qué mecanismo se atiende a quien no tiene base dentro de una sesión de 2h.
- N7 (`classList` sobre destacados en L2) necesita su propio encargo narrativo — hoy solo está
  descrito como extensión de E9, sin ficha propia (necesidad/incógnita/tests) como las demás.
- **N5 (E8, carrusel) necesita el detalle fino de sus tests ocultos** (0 destacados, 1 destacado,
  granularidad de la rotación) — ver `docs/encargos.md` §7 EN8. El concepto y la sesión ya están
  decididos; falta la especificación exacta para el autograder.
- Si `.length` se habilita en el autocompletado antes de N8, o si el diseño de esa sesión se ajusta
  a lo que la plataforma permite hoy (§7.4).
- Si se invierte tiempo de desarrollo en el onboarding de V1 (§7.5) más allá de lo ya obligatorio.
- Si la decoración libre restante (animaciones, ajustes finos más allá de N4/N12) se revisa de
  alguna forma mínima o queda sin supervisión hasta la demo.
- Formato final de los checkpoints orales (¿registrados en la plataforma o proceso manual?).
- Si el progreso en los retos opcionales "platino" suma a la nota final o es extra-crédito no
  determinante.
