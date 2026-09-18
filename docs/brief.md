# Diseño de Plataforma — Taller de Desarrollo Web para Principiantes

## 1. Concepto general

Plataforma educativa inspirada en la mecánica de **The Farmer Was Replaced**: en vez de niveles explícitos con instrucciones directas ("ahora usa un bucle"), el estudiante enfrenta **necesidades reales** dentro de un proyecto continuo — un portafolio web personal — que solo pueden resolverse aprendiendo el concepto de programación correspondiente. El aprendizaje se descubre por presión del problema, no por instrucción directa.

**Restricción del equipo:** no basarse en HTML5 como lenguaje principal (no se considera "lenguaje de programación" para efectos del taller). Solución: **JavaScript es el lenguaje real**; el HTML se genera como *salida* del código (manipulación del DOM: `createElement`, `appendChild`, `style`, etc.), con una excepción puntual explicada en la sección 5.

**Objetivo final:** cada estudiante termina el taller con un portafolio web personal, real y publicado en internet (no un ejercicio de juguete), construido pieza por pieza a lo largo de dos semanas.

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

Cada etapa **incluye y reutiliza** la anterior, no la reemplaza. Evita la fatiga de "dos días enteros solo de if/else" porque cada ejercicio nuevo cambia de contexto (aplica el concepto a una pieza distinta y visible del portafolio) aunque el concepto central se repita.

### 2.2 Necesidad real, no instrucción directa
El estudiante nunca recibe "usa un `for`". Recibe un problema (por ejemplo: "tienes 12 proyectos y no puedes escribir el código de cada uno a mano") cuya única salida razonable es el concepto nuevo. El descubrimiento es del *cuándo/cómo*, no del *qué existe* — los nombres de métodos y funciones son siempre claros y descriptivos, nunca ofuscados.

### 2.3 Validación automática + desbloqueo por nivel
Dos capas independientes que trabajan juntas:
- **Tests ocultos**: miden comprensión real, no solo que "se vea bien" con el ejemplo dado.
- **Desbloqueo por nivel**: controla el ritmo del grupo sin sustituir la necesidad genuina como motor del aprendizaje.

**Nota sobre granularidad (revisión post-frontend):** originalmente el desbloqueo se pensó como "un nivel por día", pero con la capa de frontend añadida (§5) varios días ya combinan más de un concepto discreto con su propia necesidad real y su propia pieza de portafolio — evaluarlos como un solo checkpoint pierde precisión diagnóstica (si el test falla, no queda claro cuál de los conceptos del día fue el problema). Se ajusta el modelo a **varios niveles por día cuando el contenido lo amerita**, ver tabla de niveles en §4.1.

### 2.4 Defensa anti-IA vía evaluación, no vía ofuscación
El código sigue siendo legible y con nombres claros. La defensa contra copiar-pegar de una IA está en cómo se evalúa: tests ocultos, checkpoints orales, ejercicios de depuración/lectura de código — no en hacer el código difícil de entender.

### 2.5 Contenido dinámico sin persistencia en servidor
El estado del portafolio interactivo vive en el navegador del visitante (no hay backend que lo guarde). Simplifica la arquitectura y evita temas fuera de alcance del taller.

---

## 3. Manejo de grupo heterogéneo

- Los días de 4 horas (martes/jueves) se dividen en dos bloques: primera mitad explicación a ritmo de principiante para todos, segunda mitad práctica con supervisión cercana a quien no tiene base, mientras quien sí tiene experiencia avanza con menos supervisión hacia los retos opcionales.
- El diagnóstico final (mismo formato, provisto por superiores) sirve como comparación y como señal para ajustar el ritmo en futuras cohortes.

---

## 4. Cronograma — 2 semanas, 5 días/semana

Formato de sesión: Lunes/Miércoles/Viernes = 2h · Martes/Jueves = 4h

| Día | Duración | Contenido en clase (núcleo) | Pieza del portafolio | Tarea en casa (capa de decoración) |
|---|---|---|---|---|
| L1 | 2h | Diagnóstico inicial (provisto por superiores) + intro a programación + cómo funciona una página web (roles de HTML/CSS/JS) + tour rápido de DevTools | Setup del entorno | — |
| Ma1 | 4h | Diagramas de flujo + pseudocódigo (intro formal) → Variables + creación de elementos vía DOM → HTML semántico de lectura (esqueleto ya dado: `header`, `nav`, `main`, `section`, `footer`) | Header + sección "sobre mí" | Aplicar su propia paleta de colores vía variables CSS en `:root` |
| Mi1 | 2h | Práctica de variables, más elementos, primer vistazo a condicionales | Info de contacto / redes | Personalizar tipografía (Google Fonts) y espaciados |
| Ju1 | 4h | Condicionales completos (con flowchart/pseudocódigo breve previo) → intro a bucles → formulario de contacto: leer valores de inputs, `addEventListener` en `submit`, validación mínima con condicionales | Saludo dinámico + navegación/lista repetitiva + formulario de contacto | Estilizar el formulario a su gusto |
| V1 | — | **Sin charla presencial.** Tarea autónoma: consolidación de bucles (reloj/carrusel) + `addEventListener` en botones (prev/next), con guía escrita y/o video corto de apoyo (ver §7.5) | Reloj/carrusel en la página | Ajustar animación o transición del carrusel |
| L2 | 2h | Bucle + condicional combinados (filtrar lista de proyectos) → aplicar clases CSS desde JS (`classList.add`) según condición | Sección de proyectos con filtro | — |
| Ma2 | 4h | Manejo de matrices (arrays de arrays: proyectos agrupados por categoría, tabla de skills) + intro a funciones/métodos + `.length` y otras propiedades/métodos de array y string como herramienta, no como tema aislado → layout con Grid/Flexbox (dividir en columnas/secciones) usando clases ya provistas | Skills o proyectos agrupados, en grid de columnas | Reordenar/personalizar el grid, ajustar breakpoints simples |
| Mi2 | 2h | Funciones: bucle + acciones distintas según tipo de dato + responsive: media queries básicas ya provistas, probar en DevTools en modo móvil | Proyectos con renderizado distinto según tipo, portafolio responsive | Revisar su propio portafolio en el celular real |
| Ju2 | 4h | Git/GitHub básico (`add`, `commit`, `push`) + deploy en Vercel/Netlify + pulido general | Página publicada con URL real | Decoración libre final antes de la demo |
| V2 | 2h | Diagnóstico final (comparación) + demo/presentación de portafolios | — | — |

Notas:
- Diagramas de flujo y pseudocódigo no son un bloque teórico aislado: se reutilizan brevemente antes de cada concepto nuevo (condicionales, bucles, etc.) como herramienta de planeación, no como tema separado.
- Matrices se introducen a mitad de curso, cuando ya existe una necesidad real que las justifica (agrupar por categoría), no al inicio.
- Git/deploy queda al final, cuando ya hay contenido real que vale la pena publicar.
- **La capa de decoración (columna derecha) es intencionalmente abierta**: en clase se exige que el ejercicio base funcione (la lógica, el evento, el dato mostrado); la estética personal — colores, tipografía, animaciones, orden del grid — queda para que cada estudiante la resuelva en casa a su ritmo, sin consumir horas de instrucción. Esto es lo que permite meter la capa de frontend completa sin recortar tiempo de lógica.
- **V1 (primer viernes) no tiene charla presencial.** Los estudiantes avanzan ese nivel por su cuenta, como tarea. Es una excepción deliberada al resto del diseño (que evita instrucción sin supervisión para quien no tiene base, §3), mitigada por dos factores: (a) el contenido de ese día es mayormente **consolidación**, no un concepto nuevo — los bucles ya se explicaron en Ju1, aquí solo se aplican a un caso distinto (repetición automática); solo `addEventListener` en botones es una extensión menor de lo visto en Ju1 (mismo comando, evento distinto); y (b) debe ir acompañado del material de apoyo autónomo de §7.5 (guía escrita paso a paso y/o video corto), que sin esta ausencia de charla sería solo "recomendado" y aquí pasa a ser **necesario** para ese día específico. Ver riesgo y seguimiento en §9.

### 4.1 Niveles (desbloqueo granular, no 1-por-día)

Con la capa de frontend integrada, varios días desbloquean más de un nivel — cada uno con su propio checkpoint de validación (test oculto). El catálogo detallado (qué es y qué no es un "nivel", numeración, dependencias, reglas de imágenes) vive en `niveles.md` — 16 niveles de tipo `code` en 9 días de contenido efectivo (el conteo inicial de 20 incluía contenido de apoyo sin test oculto, como diagramas de flujo o el tour de DevTools, que no son niveles jugables — ver `niveles.md` §"Cambios de esta revisión").

No cambia el cronograma ni las horas totales — es la misma secuencia, evaluada con más granularidad. El requisito técnico correspondiente está en §7.3.1: el autograder debe poder desbloquear y validar varios checkpoints dentro de una misma sesión (no solo al cierre del día), y la barra de progreso que ve el estudiante debe reflejar nivel, no día, para que el avance se sienta continuo — más parecido al juego original — en vez de en bloques de una jornada completa.

---

## 5. Capa de frontend — desarrollo completo

Este bloque estaba subdesarrollado en la versión anterior del documento: todo el cronograma resolvía lógica de programación general y el portafolio era solo el escenario donde se veía el resultado, pero CSS, HTML semántico, eventos, formularios y responsive no estaban asignados a ningún día. Se cierran aquí como confirmado por el equipo: **CSS, HTML semántica, eventos, formularios, responsive, división en columnas/secciones (grid/flexbox), y métodos/propiedades como `.length`/`.size`**. A diferencia de diagramas de flujo, pseudocódigo y matrices, el tema de HTML/frontend no viene impuesto por los superiores — es una decisión propia del equipo docente, lo cual da libertad para resolverlo con el criterio de costo-beneficio que sigue.

### 5.1 Por qué el modelo es "base en clase + decoración en casa"
El límite real del taller son las horas (28 totales, ~24 efectivas descontando diagnósticos y demo), no el temario. Enseñar CSS "de verdad" costaría varias horas que no existen. La salida es separar **funcionalidad** (se explica, se practica, se evalúa en clase) de **estética** (el estudiante la resuelve solo, fuera de clase, sin supervisión). Esto:
- Mantiene el foco de las horas de clase en lógica + la conexión mínima con el DOM/CSS/eventos.
- Le da a cada estudiante un portafolio visualmente distinto sin que eso cueste tiempo de instructor.
- Funciona como gancho motivacional adicional al de "tu página ya existe en internet": también se ve distinta a la de su compañero.

### 5.2 CSS — por clases, no por hoja de estilos desde cero
No se enseña CSS como bloque teórico. Se entrega una librería corta de clases ya escritas (`.card`, `.grid`, `.badge-destacado`, `.nav`, etc.) y el estudiante las aplica **desde JavaScript** con `classList.add()`/`classList.toggle()`. Esto reutiliza los condicionales que ya vieron (*si el proyecto es destacado, agrégale la clase destacado*) y enseña de una sola vez que las clases son el punto de unión entre HTML, CSS y JS. Variables CSS en `:root` para color/tipografía/espaciado son la vía de personalización en casa: cambiar 5 valores basta para que el portafolio se vea distinto.

### 5.3 HTML semántico — por lectura, no por escritura
Se mantiene la decisión de que el HTML dinámico sale del DOM, nunca escrito a mano por el estudiante — **excepto** el esqueleto base (`index.html` con `header`, `nav`, `main`, `section`, `footer` ya puestos), que se entrega resuelto y se **explica por qué existe cada etiqueta** en 15 minutos (Ma1). El estudiante lee y entiende la semántica; no la escribe desde cero. Esto resuelve la deuda de "todo termina siendo `div`" sin convertir el taller en un curso de HTML.

### 5.4 Eventos — nombrado explícitamente, no improvisado
En el cronograma anterior, el filtro de proyectos (L2) y el carrusel (V1) ya requerían `addEventListener` sin que el tema estuviera asignado a ningún día, dejándolo a la improvisación de quien dictara esa sesión. Ahora `addEventListener` se introduce formalmente en Ju1 (con el formulario de contacto) y se reutiliza en V1 (carrusel) y L2 (filtro), siguiendo la misma lógica de espiral que el resto del curso: se nombra una vez, se reusa varias.

### 5.5 Formularios
El formulario de contacto (estándar en un portafolio) se resuelve con lo mínimo necesario: leer valores de `input`/`textarea`, `addEventListener` en el evento `submit`, `preventDefault()`, y validación mínima con los condicionales que ya conocen (campo vacío, formato de email simple). No se entra en envío real a servidor (coherente con 2.5: sin persistencia en servidor).

### 5.6 Responsive y DevTools
Se resuelve en dos momentos baratos: (a) L1, como parte de la orientación inicial ("cómo funciona una página web"), tour de 10-15 min por el inspector/consola — es lo que los vuelve autónomos para depurar sin ayuda; (b) Mi2, media queries básicas ya provistas en las clases entregadas, y prueba real en el celular de cada estudiante como tarea.

### 5.7 División en columnas/secciones (Grid/Flexbox) y métodos como `.length`
Se introduce en Ma2, en el mismo momento que matrices y funciones, porque ahí aparece la necesidad real: agrupar proyectos por categoría o mostrar skills en tabla ya requiere pensar en filas/columnas visuales, no solo en la estructura de datos. Igual que con las clases CSS, se entrega el layout resuelto (clases de grid/flexbox ya escritas) y el estudiante decide cuántas columnas usar y cómo reordenar según sus datos. `.length` (y equivalentes como `.size` en otras estructuras) se enseña como herramienta que ya necesitan para saber cuántos elementos recorrer o mostrar — no como tema aislado, sino en el momento en que el bucle sobre el array lo exige.

### 5.8 Resumen por capas

| Capa | Qué significa | Qué entra |
|---|---|---|
| **Núcleo** (clase, evaluado) | Se explica, se practica, se evalúa | Lógica completa + DOM + eventos + formularios + aplicar clases CSS/grid desde JS + Git/deploy |
| **Andamiaje** (entregado, usado) | Se entrega funcionando; el estudiante lo usa y modifica, no lo escribe desde cero | Hoja de estilos con clases y variables `:root`, esqueleto HTML semántico, clases de grid/flexbox, media queries base |
| **Decoración libre** (tarea, no evaluado como núcleo) | El estudiante lo resuelve solo, a su gusto, fuera de clase | Paleta de colores, tipografía, animaciones, orden/cantidad de columnas, ajustes finos de estilo |

---

## 6. Otros elementos del taller

### 6.1 Sistema de pistas y ejercicios de depuración
- Módulo opcional de ejercicios de lectura/depuración de código (mostrar código con error o pedir predicción de output) como parte de la evaluación formativa.

### 6.2 Retos opcionales ("platino")
- Memoria de imágenes, Ahorcado, Buscaminas, Serpiente, Tanques, Space Invaders — implementados como mini-retos **separados** del portafolio principal, con su propio desbloqueo progresivo.
- No deben bloquear ni ser requisito para avanzar en el portafolio principal.
- Ejercicios adicionales sugeridos por retroalimentación de beta (banco de retos, no necesariamente en el flujo obligatorio):
  - Sumas y multiplicaciones básicas como primeros pasos de práctica temprana.
  - Generar una lista de pares/impares a partir de un array — dos caminos válidos de resolución: con un método de array (ej. `filter`), o con un `for` que incremente de dos en dos desde cero. Útil como ejemplo concreto en la sesión de bucles/arrays por tener más de una solución razonable.

### 6.3 Módulo de cierre (Git/Deploy)
- Guía o mini-tutorial integrado para: inicializar repo, `git add`/`commit`/`push`, y conexión con Vercel o Netlify para deploy automático.
- Idealmente con verificación de que el deploy fue exitoso (mostrar la URL pública generada al estudiante dentro de la plataforma).

---

## 7. Requisitos técnicos de la plataforma

### 7.1 Editor de código
- Editor embebido en el navegador: Monaco Editor (motor de VS Code) o CodeMirror.
- Debe soportar resaltado de sintaxis tipo JavaScript.

### 7.2 Entorno de ejecución / sandbox
- Ejecución del código del estudiante en `iframe` aislado o Web Worker.
- Debe reflejar en vivo el resultado (vista previa del portafolio actualizándose en tiempo real), simulando "ver el dron trabajar" del juego original.
- La vista previa debe poder alternarse entre tamaño de escritorio y móvil, para la práctica de responsive (Mi2).

### 7.3 Librería de clases CSS y esqueleto entregado
- El sistema debe poder inyectar en el sandbox del estudiante, desde el día 1: una hoja de estilos base con clases predefinidas (`.card`, `.grid`, `.badge-destacado`, `.nav`, utilidades de grid/flexbox), variables `:root` para paleta/tipografía/espaciado, y el `index.html` esqueleto con etiquetas semánticas.
- El estudiante no debe poder romper accidentalmente este archivo base al editar solo su JS (separación de archivos: su código vs. el andamiaje entregado).

### 7.3.1 Desbloqueo granular por nivel (no por día)
- El autograder debe soportar múltiples checkpoints/tests ocultos dentro de una misma sesión de clase, no solo uno al cierre del día — ver tabla de niveles en §4.1 (días de 4h llegan a desbloquear hasta 3 niveles).
- La barra/indicador de progreso visible para el estudiante debe representar nivel, no día, para que el avance se perciba continuo.
- El sistema de desbloqueo debe permitir que un nivel quede marcado como "autónomo" (sin charla asociada, ver V1 en §4.1) y aun así validarse con el mismo test oculto que un nivel con charla — la diferencia está en la ausencia de instrucción en vivo, no en el rigor de la evaluación.

*(Continúa igual que la versión anterior del documento: sistema de desbloqueo por día, autograder con tests ocultos, manejo de copias/checkpoints orales, retos opcionales, módulo de Git/deploy — ver secciones 6 y 8.)*

### 7.4 Hallazgos de la beta con tester técnico (retroalimentación por audio, 12-sep)

Un compañero con experiencia en programación probó la plataforma beta. Al ya conocer código, su lectura de "qué falta" pesa más en lo técnico que en la experiencia de un estudiante nuevo — pero él mismo advierte que para alguien de primer/segundo ciclo el punto de entrada sería más confuso todavía que lo que él vivió. Se separan ambos tipos de hallazgo:

**Correcciones de UI (bug, no diseño):**
- El botón "Entregar a revisión" tiene muy poco contraste frente al botón "Ejecutar", que sí resalta bien — el tester literalmente no lo encontró estando justo al lado. Requiere el mismo tratamiento visual (color/tono destacado) que "Ejecutar".
- El flujo de bloqueo por checkpoint (el sistema le impidió seguir probando porque "faltaba código de una revisión anterior") no comunica con claridad qué falta o qué revisar — riesgo de frustración también para un estudiante real, no solo para un tester.

**Desalineación entre diseño y build actual — requiere resolución antes de Ma2:**
- El autocompletado del editor **solo expone las funciones que el proyecto habilita explícitamente**, y actualmente **no incluye `.length`** ni condicionales asociadas a su uso. Esto choca directamente con la decisión de §5.7 (`.length` como parte del núcleo curricular en Ma2, enseñado en el momento en que el bucle sobre el array lo exige). Antes de llegar a esa sesión del taller, hay que confirmar si `.length` (y equivalentes que se necesiten, como comparar tamaño de dos strings) van a habilitarse en el editor, o si el diseño pedagógico debe ajustarse a lo que la plataforma realmente permite.
- El autocompletado también muestra entradas ambiguas sin distinguir origen ni funcionalidad: `decodeURI`, `decodeURIComponent`, `document`, `date`/`var date`, `image`, `file`. No queda claro para el usuario cuáles son nativas de JS, cuáles son del proyecto, ni si todas funcionan correctamente. Pendiente: auditar qué se expone en el editor, ocultar lo que no debe estar visible en esta etapa del curso, y documentar el resto.

### 7.5 Onboarding para primer contacto con el editor

Recomendación (no cerrada, sugerida por el tester como idea abierta): dado que él pudo intuir el flujo por su experiencia previa, pero anticipa que un estudiante de primer ciclo sin experiencia lo encontraría "riesgoso"/confuso al inicio, se evalúan dos mecanismos de entrada:
- **Video corto (1-2 min)** de demostración del flujo básico del editor — no un tutorial exhaustivo, sino "aquí escribes, aquí pasa esto, siguiente paso" (referencia: tutoriales de setup rápido tipo servidores de Minecraft).
- **Tour guiado en el primer uso** del editor, al estilo Google Sheets/Docs, señalando qué es cada botón/zona de la interfaz.

Ambos quedan como mejora recomendada para la plataforma en general, a evaluar según tiempo de desarrollo disponible — no bloquean el lanzamiento de la beta.

**Excepción:** para el día V1 (§4, sin charla presencial), al menos uno de los dos mecanismos deja de ser opcional y pasa a ser **necesario**, porque ese día no hay instructor explicando en vivo — el material de apoyo es la única guía que tendrá el estudiante para N10/N11.

---

## 8. Resumen de decisiones ya cerradas (no requieren más discusión)

- Lenguaje real: JavaScript. HTML dinámico como salida del DOM; el único HTML escrito de antemano es el esqueleto semántico entregado y explicado por lectura (ver 5.3).
- El sistema de niveles del juego original se traduce en "necesidad real" + desbloqueo por nivel (granular, no un checkpoint único por día — ver §4.1), no en instrucciones directas tipo "usa un for".
- Nombres de funciones/métodos descriptivos, sin ofuscación.
- Defensa anti-IA vía evaluación (tests ocultos + checkpoints orales + depuración), no vía dificultar la lectura del código.
- Portafolio construido de forma incremental y acumulativa (currículo en espiral), no en bloques separados por tema.
- Diagnósticos inicial y final: provistos por los superiores del equipo — fuera del alcance de diseño de este documento.
- Minijuegos: opcionales, fuera del flujo obligatorio, con su propio desbloqueo progresivo.
- **Frontend (CSS, HTML semántico, eventos, formularios, responsive, grid/flexbox) resuelto por capas**: núcleo evaluado en clase + andamiaje entregado + decoración libre en casa. Este tema no viene impuesto por los superiores, es decisión propia del equipo docente.

## 9. Pendiente de definir

- Si el progreso en los retos opcionales suma a la nota final o es extra-crédito no determinante.
- Detalle de implementación exacta del sistema de pistas progresivas (umbral de tiempo/repetición para activarlas).
- Formato final de los checkpoints orales (¿registrados en la plataforma o solo proceso manual del instructor?).
- Si la "decoración libre" en casa se revisa/valida de alguna forma mínima (por ejemplo, checklist de que no rompió el andamiaje) o queda totalmente sin supervisión hasta la demo final.
- **Resolver antes de Ma2**: si `.length` y equivalentes se habilitan en el autocompletado del editor (requisito de §5.7) o si el diseño pedagógico de esa sesión debe ajustarse a lo que la plataforma actual permite (ver hallazgo de beta, §7.4).
- Si se invierte tiempo de desarrollo en el onboarding sugerido (video corto y/o tour guiado, §7.5) o si se deja para una iteración posterior a la primera cohorte.
- **Riesgo de V1 sin charla (§4, §4.1)**: es el único día autónomo de toda la primera semana, y cae temprano en el taller (día 5 de 10), cuando la mitad del grupo sin base previa aún depende de supervisión cercana (§3). Falta definir: qué pasa con quien no logre N10/N11 por su cuenta — ¿se retoma al inicio de L2, se ofrece una sesión de dudas breve, o queda como deuda que se resuelve en la práctica de Mi1/L2 sin bloquear el avance?
