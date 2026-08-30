# Handoff: Plataforma del Taller de Desarrollo Web (2 semanas)

> **Nota de reorganización (2026-08-30).** Este documento vivía en `design_handoff_plataforma_taller/README.md`. Ahora las rutas son relativas a la raíz del repo: los mockups y el design system están en `design/`, el brief en `docs/brief.md`. El contenido de abajo no se modificó salvo esas rutas.

## Overview

Plataforma web para un taller presencial de programación para principiantes (10 sesiones / 2 semanas, ~24 estudiantes, mitad sin base previa). El estudiante nunca escribe HTML a mano: escribe JavaScript contra una API acotada que construye el DOM, y cada sesión suma una pieza a un portafolio personal que al final se publica en una URL real.

Este paquete documenta siete pantallas mockeadas en HTML: la vista principal del estudiante (en tres variantes de cómo se comunica el reto), el dashboard del instructor, el mapa de progreso de dos semanas, la entrada con diagnóstico inicial, y dos vistas móviles.

El brief original del que se derivó todo está en `docs/brief.md`. Ante cualquier duda de producto, ese documento manda; este README manda en lo visual.

## About the Design Files

Los archivos de `design/` son **referencias de diseño hechas en HTML** — prototipos que muestran el aspecto y el comportamiento pretendidos. **No son código de producción para copiar y pegar.**

La tarea es **recrear estos diseños en el entorno del codebase destino** (React, Vue, Svelte, etc.) usando sus patrones, su router, sus componentes y sus librerías establecidas. Si todavía no existe codebase, elige el stack más adecuado (para esta plataforma la recomendación se detalla en *Notas de implementación*) e impleméntalo allí.

En particular, `design/support.js` es el runtime de la herramienta de diseño con la que se autoró el mockup. **No lo lleves al proyecto.** Se incluye solo para que `design/Plataforma Taller.dc.html` abra en un navegador y se pueda ver el diseño. `design/styles.css` (los tokens del design system) sí es reutilizable tal cual.

## Fidelity

**Alta fidelidad (hifi).** Colores, tipografía, espaciado, jerarquía y copy son finales y deben recrearse fielmente. Todos los valores vienen del design system Classical (`design/styles.css`), así que la recreación fiel se logra usando esas variables CSS, no midiendo píxeles a ojo.

Dos matices:
- El **copy** de las pantallas es final en español y no debe reescribirse sin consultar.
- Los **datos** (nombres de estudiantes, cifras, contenido del código en el editor) son de ejemplo.

## Cómo abrir los mockups

Abre `design/Plataforma Taller.dc.html` en un navegador (o sírvelo con cualquier servidor estático). Es un lienzo con zoom/pan: todas las pantallas están en la misma página, cada una con un id visible (`1a`…`1g`) y anotaciones numeradas que apuntan a la sección del brief que la justifica.

El archivo tiene dos interruptores de autor (props): `showAnnotations` (apaga las anotaciones de handoff) y `mostrarPistas` (muestra el panel de pistas abierto en `1b`). Son andamiaje de la presentación, **no** features del producto.

---

## Sistema de diseño (Classical)

Todo sale de `design/styles.css` y de `design/design-system/readme.md`. Reglas de oro del sistema, porque condicionan cada pantalla:

- Fondo casi blanco (`--color-bg` `#f3f2f2`), texto tinta cálida (`--color-text` `#201f1d`), **un solo** acento oro (`--color-accent` `#b68235`).
- El acento se usa como **trazo**: bordes, filetes, subrayados, tags tintados. Nunca como relleno grande. Los botones primarios son *outline* de acento sobre transparente, no botones sólidos.
- Tipografía: `Cormorant Garamond` (`--font-heading`) para títulos, `Lora` (`--font-body`) para cuerpo. Sin negritas fuertes: el techo es semibold (600) y los tamaños display van en peso normal (400). Nunca sustituir por una sans para dar énfasis — eso lo hacen la itálica y el peso.
- Los filetes (`--color-divider`, hairline de 1px) cargan la estructura. Sombras: apenas un susurro (`--shadow-sm/md/lg`).
- Prosa justificada (`text-align: justify`) en los bloques de texto de lectura.
- Cifras y tablas en cifras tabulares (`font-variant-numeric: tabular-nums`); la prosa corrida conserva sus cifras de texto.

### La regla propia de este producto: dos voces

La decisión de diseño que ordena todas las pantallas:

| Voz | Qué contiene | Cómo se ve |
| --- | --- | --- |
| **Humana / libro** | encargos, condiciones de aceptación, revisión, checkpoints, mapa, formularios | fondo claro `--color-bg`, serif, prosa justificada, filetes, oro como trazo |
| **Máquina** | editor de código, consola, archivo de datos, cifras de la terminal | fondo negro cálido `#191816` (un paso por debajo de `--color-neutral-900`), monoespaciada, texto `#d7d3d3` |

Cualquier pantalla nueva debe caer de un lado o del otro. El "toque de juego" vive en el desbloqueo por día, la revisión automática y los retos platino — **no** en colores brillantes, badges saturados ni ilustración.

### Paleta del panel oscuro (fuera de los tokens)

Estos cuatro valores son específicos de la voz "máquina" y no están en el sistema; si el codebase tiene un tema de editor, úsalo en su lugar y respeta el contraste:

| Uso | Valor |
| --- | --- |
| fondo del editor | `#191816` |
| fondo de la consola | `#151412` |
| bordes internos del panel oscuro | `#2d2b2b` (= `--color-neutral-900`) |
| texto de código | `#d7d3d3` (= `--color-neutral-300`) |
| números de línea, texto apagado | `#605d5d` (= `--color-neutral-700`) |
| comentarios | `#7d7979` (= `--color-neutral-600`) |
| literales numéricos | `#e1ad66` (= `--color-accent-400`) |
| cursor / selección activa | fondo `#3a270d` (`--color-accent-900`), borde `#7d5411` (`--color-accent-700`) |

Los botones dentro del panel oscuro usan borde `--color-accent-400` y texto `--color-accent-300` (el outline de acento del sistema no tiene contraste suficiente sobre negro).

---

## Design Tokens

### Color

| Token | Valor |
| --- | --- |
| `--color-bg` | `#f3f2f2` |
| `--color-surface` | `#eae9e9` |
| `--color-text` | `#201f1d` |
| `--color-accent` | `#b68235` |
| `--color-divider` | `color-mix(in srgb, #201f1d 16%, transparent)` |

Rampa neutral 100→900: `#f8f4f4` `#eae7e7` `#d7d3d3` `#bab6b6` `#9b9797` `#7d7979` `#605d5d` `#444141` `#2d2b2b`

Rampa de acento 100→900: `#fff3e4` `#ffe3bf` `#facb8d` `#e1ad66` `#c28d41` `#a06f24` `#7d5411` `#5a3b0a` `#3a270d`

`--color-accent-2-*` existe pero es un sinónimo derivado del mismo acento: **trátalo como un solo rol** y no lo uses como segundo color.

Contraste: el par acento/fondo está afinado a ≥3:1 — sirve para iconos, texto grande y cromo de interfaz, **no** para texto de párrafo. Para texto pequeño en acento usa `--color-accent-700` o más oscuro.

### Espaciado

Escala con densidad 1.15× ya incorporada. Usa las variables, no los px:

`--space-1: 4.6px` · `--space-2: 9.2px` · `--space-3: 13.8px` · `--space-4: 18.4px` · `--space-6: 27.6px` · `--space-8: 36.8px`

### Radios y sombras

`--radius-sm: 2px` · `--radius-md: 4px` · `--radius-lg: 7px`

`--shadow-sm: 0 1px 2px rgba(45,43,43,.14)` · `--shadow-md: 0 3px 10px rgba(45,43,43,.16)` · `--shadow-lg: 0 12px 32px rgba(45,43,43,.22)`

### Tipografía usada en las pantallas

| Rol | Familia | Tamaño / peso |
| --- | --- | --- |
| Display (hero de entrada) | Cormorant Garamond | 52px / 400, `line-height` 1.05–1.1 |
| H2 de sección | Cormorant Garamond | 30–34px / 400 |
| Título de pantalla (`h3`) | Cormorant Garamond | 22–26px / 600 |
| Título de tarjeta / día del mapa | Cormorant Garamond | 16px / 600 |
| Cuerpo de lectura | Lora | 13–13.5px / 400, justificado |
| Cuerpo móvil | Lora | 13px / 400 |
| Cifra grande de métrica | Cormorant Garamond | 34px / 400, tabular |
| Kicker / etiqueta de sección | monoespaciada del sistema | 10px / 600, `letter-spacing: .1em`, mayúsculas, color `--color-accent` |
| Código, consola, cifras técnicas, tags de API | monoespaciada del sistema (`ui-monospace, SFMono-Regular, Menlo, monospace`) | 11–13px, `line-height` 1.7–1.8 |

El brief pide una plataforma para principiantes; los tamaños de cuerpo del mockup (13px) son cómodos en el lienzo de handoff, pero **al implementar sube el cuerpo de lectura a 15–16px** en la vista real del estudiante. Es la única desviación que se espera del mockup.

### Clases del sistema disponibles

`.btn` (+`.btn-primary` `.btn-secondary` `.btn-ghost` `.btn-icon` `.btn-block`) · `.tag` (+`.tag-accent` `.tag-neutral` `.tag-outline`) · `.field`+`label`+`.input` · `.radio`+`.dot` · `.seg`+`.seg-opt` · `.card` (+`.card-kicker` `.card-title` `.card-body` `.card-meta`) · `.nav`+`.nav-brand` · `.table` · `.dialog-backdrop`+`.dialog` · `.hr` · `.plate` (todas las fotografías van envueltas aquí).

Los estados vienen incorporados: hover y pressed desde la rampa de acento, foco de teclado como `outline: 2px solid var(--color-accent); outline-offset: 2px`, `::selection` tintado, disabled al 45% de opacidad. **No los re-estilices por pantalla, y no dejes el foco azul del navegador.**

Iconos: **Lucide** (https://lucide.dev). El mockup casi no usa iconos a propósito — el sistema resuelve la jerarquía con tipografía y filetes. No agregues iconografía decorativa.

---

## Screens / Views

### 1a · 1b · 1c — Vista principal del estudiante (tres variantes del mismo layout)

**Propósito.** Es la pantalla donde el estudiante pasa el 80% del taller: lee el reto del día, escribe código, ve su portafolio actualizarse y recibe el veredicto de la revisión automática.

**Layout.** Ancho de diseño 1280px (objetivo real: 1440px, ver *Responsive*). Barra `.nav` arriba (altura natural del componente). Debajo, un grid de tres columnas a altura completa:

```
grid-template-columns: 340px  1fr  404px;   /* reto | editor | preview + revisión */
altura del área de trabajo: 716px en el mockup → 100vh - alto del nav en producción
```

- Columna izquierda y derecha: fondo claro, voz humana. Bordes: la columna central lleva `border-inline: 1px solid var(--color-divider)`.
- Columna central: panel oscuro, voz máquina, `display:flex; flex-direction:column`.
- Columna derecha: dividida verticalmente — barra de URL (arriba), preview (`flex:1`, fondo `#fff`), panel de revisión automática (abajo, fondo `--color-surface`, separado por filete).

**Barra `.nav`** (`gap: 18px`): marca `Taller · Portafolio` (el `·` en color acento) · tag outline `Día 4 — Ju1` · enlaces `Mi portafolio` (con `aria-current="page"`) · `Mapa` · `Retos platino` · `Bitácora` · avatar circular de 30px, borde de 1px `--color-divider`, iniciales en Cormorant 13px.

**Columna del editor** (idéntica en las tres variantes):
1. Tira de pestañas: `portafolio.js` (activa: texto `#f8f4f4` + `box-shadow: inset 0 -1px 0 var(--color-accent)`), `datos.js — solo lectura` (texto `#7d7979`), y en `1c` además `plan.txt`. Padding `12px 16px`, mono 12px, borde inferior `#2d2b2b`.
2. Área de código: `display:flex; gap:16px; padding:18px 20px`. Canaleta de números de línea alineada a la derecha, `user-select:none`, color `#605d5d`. Mono 13px / 1.8.
3. Consola: fondo `#151412`, borde superior `#2d2b2b`, padding `10px 20px`, mono 11.5px/1.7. Prefijo `consola` en `--color-accent-400`; el detalle en `opacity:.55`.
4. Barra de acciones: `Ejecutar` y `Entregar a revisión` + a la derecha, en mono 11px `#605d5d`, «guardado hace N s · N intentos».

**Panel de revisión automática** (columna derecha, abajo): título `h5` «Revisión automática», contador `N / 4 casos` a la derecha en mono 11px, y una `.table` de cuatro filas con tag `pasa` (`.tag-accent`) o `falla` (`.tag-outline`), padding de celda `7px var(--space-1)`. Al final, una línea de prosa que recuerda que los casos ocultos cambian de tamaño en cada revisión y que no se entrega la solución.

**Lo único que cambia entre las tres variantes es la columna izquierda** (y el estado del código/preview, que ilustra el momento del ejercicio):

| | Cómo se enuncia el reto | Columna izquierda | Estado ilustrado |
| --- | --- | --- | --- |
| **1a** | Encargo escrito, en prosa, cero vocabulario técnico | kicker `Encargo 07 · desbloqueado hoy 10:00`, `h3` «La lista que no se queda quieta», dos párrafos justificados, bloque «Herramientas disponibles» con tags de la API, y al pie contador de pista bloqueada («Pista disponible en 6:12», botón `disabled`) | 3 intentos, 1/4 casos, error de `TypeError` en consola, código con índices fijos |
| **1b** | Puro síntoma: nada que leer, la página está mal | `h3` «3 de 4 comprobaciones fallan» y tres síntomas observables (par: cifra mono en `--color-accent-700` + descripción); mismo bloque de herramientas; panel de pista abierta (borde `--color-accent-300`, fondo `--color-accent-100`, texto `--color-accent-900`); al pie «estancada 8 min · patrón copiar/pegar» + botón activo `Pedir pista` | 7 intentos, 3/4 casos, bucle resuelto pero sin caso vacío; en la barra de URL, un `.seg` de casos `3 / 14 / 0` para ver el preview con otros datos |
| **1c** | Contrato de aceptación: condiciones verificables, ninguna técnica | `h3` «Se acepta cuando…» y cuatro condiciones numeradas en romanas (`i`–`iv`, numeral mono en acento); mismo bloque de herramientas; al pie `Abrir hoja de pseudocódigo` | 9 intentos, 4/4 casos, tag `encargo aceptado`, preview con 8 hobbies en dos columnas y botón «+ Agregar hobby» del visitante; el panel de revisión añade «Queda un checkpoint oral pendiente» + `Agendar` |

**Decisión pendiente del equipo:** 1a / 1b / 1c es una elección de producto, no de estilo. 1b es lo más fiel al juego original del brief y lo más riesgoso con la mitad de la cohorte sin base; 1c es lo más fácil de mapear 1:1 al autograder. Es combinable: prosa la primera semana, contrato la segunda, síntoma puro solo en los retos platino. **Confirmar con el equipo del taller antes de construir.**

### 1d — Dashboard del instructor

**Propósito.** Ver en 10 segundos quién está estancado, quién pasó los casos sin entender, y registrar los checkpoints orales de la sesión.

**Layout.** `.nav` (marca `Taller · Instructor`, tag `Cohorte 2026-B · 24 estudiantes`, enlaces Avance / Checkpoints / Calendario / Parejas). Debajo, grid `1fr 372px`, mínimo 620px de alto. La columna derecha lleva `border-left: 1px solid var(--color-divider)` y fondo `--color-surface`.

**Columna principal:** título `h3` del encargo + «actualizado hace 30 s» a la derecha. Luego cuatro `.card` en grid de 4 columnas (`gap: var(--space-3)`): Aceptado 11/24 · En progreso 9 · **Estancados 4** (borde `--color-accent-300`, cifra en `--color-accent-700`) · Retos platino 6. La cifra es Cormorant 34px tabular, `line-height: 1`.

Debajo, `.table` con columnas: Pareja · Estudiante · Base previa · Casos ocultos · Intentos · Checkpoint oral · Señal. Ocho filas (cuatro parejas). Las señales son tags outline derivados, **no calificaciones**: `copiar/pegar`, `pasó sin explicar`, `estancada 22 min`, `listo para platino`.

**Columna derecha — registro de checkpoint oral (3 min):** nombre del estudiante, `textarea` con la pregunta «¿Qué hace tu código y por qué?», tres radios de comprensión (Explica y generaliza / Explica con ayuda / No puede explicar su propio código), botón `Registrar checkpoint` a ancho completo. Bajo un `.hr`, un bloque «Sugerido por el sistema» con una recomendación en prosa y su acción.

### 1e — Mapa de progreso (2 semanas)

**Propósito.** Que el estudiante vea que el portafolio se construye una pieza por sesión y que nada de lo anterior se reemplaza.

**Layout.** `.nav` + contenido con padding `var(--space-6) var(--space-4) var(--space-4)`.
1. Encabezado: `h2` a peso 400 + un párrafo justificado de máx. 420px a su derecha.
2. **Calendario:** grid de **10 columnas iguales** (`repeat(10, 1fr)`), sin gap, delimitado arriba y abajo por filetes, y cada celda separada por `border-right`. Cada celda: código de sesión y duración en mono acento (`L1 · 2h`), nombre del tema en Cormorant 16px, pieza del portafolio en 11.5px, y un tag de estado (`hecho` neutral / `hoy · 1 de 2` acento / `mañana` outline / `cerrado` neutral apagado). El día actual lleva fondo `--color-accent-100` y `box-shadow: inset 0 2px 0 var(--color-accent)`; los días futuros van con texto en `--color-neutral-600`.
   Sesiones: L1 diagnóstico+algoritmos · Ma1 variables+DOM · Mi1 más elementos · **Ju1 condicionales→bucles (hoy)** · V1 bucles que no paran · L2 bucle+condición · Ma2 matrices+funciones · Mi2 funciones · Ju2 Git+deploy · V2 diagnóstico final.
3. Grid `1.15fr 1fr` con dos bloques:
   - **Currículo en espiral:** cinco filas separadas por filetes; en cada una, número en mono acento, nombre de la capa, y una barra de 2px que crece (44 / 88 / 132 / 176 / 220px) — la capa actual con fondo `--color-accent-100` y barra en acento, las futuras en `--color-neutral-400`.
   - **Retos platino:** tres `.card` en fila (`flex-direction: row`), título + meta + tag de estado. El tercero (Buscaminas, recursión) va con `border-style: dashed` porque queda fuera del flujo obligatorio. Al pie, en mono 11px, la pregunta abierta: si el platino suma a la nota o es extra-crédito visible.

### 1f — Entrada y diagnóstico inicial (L1)

**Propósito.** Primera pantalla del taller: enmarcar la promesa y capturar el diagnóstico que arma las parejas.

**Layout.** Grid `1fr 1fr`, mínimo 600px de alto, sin `.nav`.
- **Izquierda (voz máquina):** fondo `#191816`, padding `var(--space-8)`. Kicker mono en `--color-accent-400`, `h1` Cormorant **52px peso 400** en tres líneas («Dos semanas. / Un portafolio / publicado.»), párrafo justificado en `#bab6b6` a máx. 400px. Al fondo (`margin-top:auto`), tras un filete `#2d2b2b`, tres cifras: 10 sesiones · 7 encargos · 1 URL real (Cormorant 30px tabular `#f8f4f4`, etiqueta mono `#7d7979`).
- **Derecha (voz humana):** kicker `Paso 1 de 3 · diagnóstico inicial`, `h3` «Antes de empezar», aclaración de que no es examen ni afecta la nota, y luego los campos: nombre (`.input`), «¿Has programado antes?» (tres radios), y una pregunta de lectura de código — fragmento en el panel oscuro (mono 12.5px, `border-radius: var(--radius-md)`) seguido de un `textarea`. Al pie: «Preguntas 1 – 3 de 12» + botón `Continuar`.

El **contenido** del diagnóstico lo entrega el equipo del taller (§6 del brief); la plataforma solo lo presenta y guarda. El mismo formulario se reutiliza en V2 para comparar antes/después.

### 1g — Móvil (390pt): dos vistas

**Decisión de diseño:** el móvil es de **consulta, no de edición**. Escribir código en 390pt no es realista para un principiante, así que en móvil solo viven el encargo del día, el avance y el portafolio publicado. La vista principal (1a–1c) **no tiene versión móvil**; por debajo de ~1024px se muestra la vista de consulta con el aviso «Editar código requiere computador».

- **Vista A — encargo del día.** Barra de estado simulada, cabecera con marca + tag del día. Cuerpo: kicker, `h3` 22px, resumen del encargo en prosa, una tarjeta de avance (contador `1 / 4` + cuatro barras de 4px, llenas en `--color-accent` y vacías en `--color-neutral-300`, con el aviso de que editar requiere computador), `.hr`, bloque «Se desbloqueó hoy» con los tags de la API nueva, y dos botones a ancho completo.
- **Vista B — portafolio publicado** (lo que ve cualquier visitante en `ana-rivas.taller.dev`): fondo `#fff`, nombre en Cormorant 32px, reloj/saludo dinámico en mono `--color-accent-700`, «sobre mí», lista de hobbies, botón `+ Agregar hobby` y la aclaración de que lo agregado vive solo en el navegador del visitante. Sección «Proyectos» como marcador punteado: «se construye el lunes (L2)».

**Áreas de toque en móvil: mínimo 46px** (`min-height: 46px` en los botones del mockup). No bajar de 44.

---

## Interactions & Behavior

### Vista del estudiante

- **Ejecutar** ejecuta el código del estudiante en un iframe aislado (sandbox) y repinta el preview; los errores aparecen en la consola con archivo y línea.
- **Autoguardado** continuo; el sello «guardado hace N s» refleja el último guardado real.
- **Entregar a revisión** dispara el autograder: 4+ casos ocultos, de **tamaño variable en cada corrida** (3 / 14 / 40 / 0 elementos). El feedback dice **qué** falla, nunca **cómo** arreglarlo. El número real de casos y sus tamaños no se revelan.
- **Pistas progresivas** (3 niveles). Disparadores: tiempo estancado sin cambios en el código + patrones detectados (p. ej. líneas casi idénticas = copiar/pegar). Antes de estar disponible, el botón está `disabled` con cuenta atrás visible. Cada pista es una pregunta, no una solución.
- **`datos.js` es de solo lectura** y no se puede editar desde el editor.
- **API por día:** las funciones disponibles se desbloquean por calendario y se muestran como tags; la nueva del día va con `.tag-accent` y el prefijo «nuevo hoy:».
- **Selector de caso 3 / 14 / 0** (variante 1b): repinta el preview con ese tamaño de datos. No revela los casos del autograder.

### Dashboard del instructor

- Refresco en vivo del avance (websocket o polling corto); el sello «actualizado hace N s» debe ser real.
- Las **señales son derivadas**, no notas: estancamiento por tiempo sin cambios, copiar/pegar por similitud de líneas, «pasó sin explicar» = casos completos + pocos intentos + sin checkpoint del día.
- Registrar un checkpoint escribe nota + nivel de comprensión y lo marca en la fila del estudiante.

### Animación y transiciones

El sistema es editorial y quieto: sin animación decorativa. Solo lo funcional, corto y sobrio — 120–180ms, `ease-out`: aparición de la pista, repintado del preview, aparición de resultados del autograder fila por fila. Ninguna celebración animada.

### Estados a cubrir (el mockup no los muestra todos)

Para cada panel hace falta además: cargando (ejecución en curso, revisión en curso), vacío (sesión sin encargo abierto), error de red / sandbox caído, guardado fallido, y día bloqueado (intentar abrir una sesión futura). Trátalos con la misma sobriedad: texto en `--color-neutral-700`, sin iconos de alarma.

### Responsive

- ≥1280px: layout de tres columnas tal cual.
- 1024–1280px: la columna del reto colapsa a un panel plegable sobre el editor; el editor y el preview se reparten el ancho.
- <1024px: se sirve la vista de consulta móvil (1g), sin editor.

---

## State Management

Por vista, el estado mínimo:

**Estudiante:** sesión/día actual y su encargo · código del archivo editable (+ contenido de solo lectura de `datos.js`) · estado de guardado y timestamp · salida de la última ejecución (logs, errores con línea) · resultado del autograder (por caso: pasa/falla, más el conteo agregado) · nº de intentos · nivel de pista desbloqueado y contador hasta el siguiente · API desbloqueada del día · caso de preview seleccionado (1b) · estado de publicación del portafolio.

**Instructor:** cohorte y encargo seleccionados · métricas agregadas · lista de estudiantes con avance, base previa, intentos, checkpoints y señales · borrador del checkpoint en curso.

**Datos que necesita el cliente:** encargo del día y sus condiciones · API disponible por sesión · resultado del autograder (nunca los casos en sí — se evalúan en servidor) · calendario de las 10 sesiones con estado · parejas · resultados del diagnóstico.

Regla de seguridad: **los casos de prueba y la evaluación viven en el servidor.** El cliente nunca debe poder leer los casos ocultos, ni sus tamaños, ni la solución.

## Assets

Ninguno propio. No hay imágenes, ilustración ni iconografía en estas pantallas — es intencional. Si más adelante se agregan fotografías, van envueltas en `.plate` (ver `design/design-system/foundations/image.html`).

Fuentes: Cormorant Garamond y Lora desde Google Fonts (el `@import` está en la primera línea de `design/styles.css`; en producción conviene autoalojarlas o precargarlas). Iconos, si hacen falta: Lucide.

## Notas de implementación

- Si no hay codebase: cualquier framework de componentes sirve para el cascarón; lo que **sí** exige decisión es el editor y el sandbox. En el mockup el editor es una maqueta; en producción usa un editor real (Monaco o CodeMirror 6) y ejecuta el código del estudiante en un `iframe` con `sandbox` y origen distinto, comunicándose por `postMessage`. Nunca `eval` en la ventana principal.
- La API expuesta al estudiante usa nombres descriptivos **en español** (`crearElemento`, `agregarA`, `obtenerDatos`, `repetir`, `si/sino`), por §2.4 del brief. Mantener esos nombres: son parte del diseño pedagógico, no un detalle de mockup.
- El vocabulario del producto es deliberado: se llama **encargo** a lo que internamente es un nivel o ejercicio; el estudiante nunca lee «usa un for». Respetar el copy.
- Toda la UI en español.

## Files

```
docs/brief.md                             Brief original del taller (fuente de verdad de producto)
design/Plataforma Taller.dc.html          Los siete mockups (1a–1g) + anotaciones de handoff
design/styles.css                         Tokens y clases del design system Classical — reutilizable
design/support.js                         Runtime de la herramienta de diseño — NO llevar al proyecto
design/design-system/                     Guía del sistema: readme.md, styles.css, _ds_bundle.js,
                                          _ds_manifest.json, _adherence.oxlintrc.json
design/canvas-preview.webp                Miniatura del lienzo de diseño
```

> El `readme.md` del design system menciona `theme.json`, `foundations/`, `components/` y `templates/`; ese material no vino en este paquete. Lo disponible es `design/design-system/readme.md` + `design/styles.css` (los tokens reales) y el propio `.dc.html`, cuyo *view source* sirve como referencia de markup.

Empieza por `design/design-system/readme.md` (la guía del sistema) y luego abre `design/Plataforma Taller.dc.html` en un navegador.
