# Progresión de encargos

> Diseño de contenido del taller. Fuente de principios: `brief.md` (§2.1 currículo en espiral,
> §2.2 necesidad real, §2.3 tests ocultos, §2.4 nombres descriptivos). Aquí se concreta la secuencia.
>
> **Estado:** borrador para revisión del equipo del taller. El *copy* de cada encargo es borrador
> (a diferencia del copy de las pantallas, que el handoff marca como final).

---

## 1. El problema que resuelve este documento

El mockup muestra a un estudiante a mitad del encargo del bucle, con código como
`const datos = obtenerDatos()` ya escrito. Eso **no es un punto de partida** para alguien que
nunca programó. Sin una rampa diseñada, el primer día es un muro.

## 2. Principios de la rampa

### 2.1 El código inicial de cada encargo ≈ la solución del encargo anterior

El estudiante nunca abre un encargo frente a código ajeno que tiene que descifrar. Abre frente a
**lo que él mismo entregó la vez pasada**, más —al principio— una línea nueva a medio escribir.
La dificultad sube porque el *problema* cambia, no porque haya que releer todo.

### 2.2 Una sola cosa nueva por encargo

Cada encargo introduce **un** concepto. Todo lo demás ya se vio y se reutiliza.

### 2.3 Andamiaje decreciente

| Nivel | Qué hace el estudiante | Encargos |
| --- | --- | --- |
| **N1 · Rellenar** | El código está completo; cambia valores entre comillas | E1 |
| **N2 · Copiar el patrón** | Hay una línea de ejemplo; escribe 2–3 más iguales | E2, E5 |
| **N3 · Completar una línea** | Falta media línea (la condición, un dato) | E3, E4 |
| **N4 · Traducir un plan** | El pseudocódigo/diagrama está escrito; lo pasa a código | E6, E7 |
| **N5 · Desde las herramientas** | Solo la necesidad y la lista de herramientas disponibles | E8, E9, E10 |

### 2.4 La necesidad real es una incógnita, no una instrucción

Para cada encargo: *¿qué cantidad o condición no puede saber el estudiante cuando escribe el código?*
Esa incógnita fuerza la técnica. Nunca se lee "usa un bucle".

---

## 3. API revisada (propuesta)

El brief §2.4 pide **nombres descriptivos, sin ofuscación** — no un número mínimo de funciones. La lista
del brief (`crearElemento`, `agregarA`, `obtenerDatos`, `repetir`, `si/sino`) era un boceto. Problemas
detectados y cambios propuestos:

| Brief | Problema | Propuesta |
| --- | --- | --- |
| `crearElemento("h1", texto)` | El `"h1"` es una etiqueta HTML. El brief dice que el estudiante **nunca** toca HTML | Funciones semánticas: `crearTitulo`, `crearParrafo`, `crearLista`, `crearItem`, `crearEnlace`, `crearImagen`, `crearBoton`. Más funciones, cero HTML |
| `agregarA(pagina, x)` | El primer argumento `pagina` es ruido en el encargo 1 (siempre se agrega a la página) | Añadir `mostrar(x)` = agregar a la página. `agregarA(contenedor, x)` aparece recién cuando hay un contenedor propio (listas, E5) |
| `obtenerDatos()` | `const datos = obtenerDatos()` mete asignación + llamada + valor de retorno en la línea 1 de la vida del estudiante | `datos` es una **variable global ya lista**, igual que `pagina`. Se usa `datos.nombre`, `datos.hobbies` directo |
| `repetir(n, hacer)` | "repetir" implica un número; el concepto es *recorrer una colección de tamaño desconocido* | **`for (const x of lista) { … }`** real. Se presenta como "por cada X de la lista". Es JS de verdad y transferible |
| `si / sino` | No se puede aliasar `if` (es palabra clave); un `si(cond, hacer, sino)` con callbacks es más raro que el `if` real | **`if` / `else`** reales. En el panel de herramientas se rotula "condición". El framing es "muestra esto solo cuando…", nunca "usa un if" |

Cada herramienta del panel "Herramientas disponibles" abre, al hacer clic, una **ficha de ayuda**
(estilo *The Farmer Was Replaced*): qué hace, qué devuelve, un ejemplo y enlaces a herramientas
relacionadas. El texto vive en `frontend/src/lib/apiDocs.ts`. Esto no rompe el descubrimiento
(brief §2.4): el descubrimiento está en *cuándo combinar*, no en adivinar qué hace cada nombre.

**Regla resultante:** la plataforma provee **funciones de construcción del DOM con nombres
descriptivos en español**; el control de flujo (`const`, `if`, `for…of`, `function`) es
**JavaScript real**, aprendido por necesidad. Cumple el brief en los cuatro puntos (JS es el lenguaje
real · nada de HTML a mano · nombres descriptivos · el descubrimiento está en cuándo combinar, no en
descifrar nombres).

### 3.1 Referencia rápida del API

```
// Globales ya listas
pagina              la página
datos               los datos del portafolio (datos.nombre, datos.hobbies, datos.proyectos, …)

// Crear (sin etiquetas HTML)
crearTitulo(texto)              crearParrafo(texto)
crearLista()                   crearItem(texto)
crearEnlace(texto, url)        crearImagen(url, descripcion)
crearBoton(texto)

// Poner en la página
mostrar(elemento)                       agregar a la página
agregarA(contenedor, elemento)          agregar dentro de otro elemento

// Repetición que no termina (reloj, actualizaciones en vivo)
cadaSegundo(() => { … })

// Control de flujo: JavaScript real
const  ·  if / else  ·  for (const x of lista) { … }  ·  function
```

### 3.2 Desbloqueo por día

| Sesión | Se desbloquea |
| --- | --- |
| Ma1 | `crearTitulo`, `crearSubtitulo`, `crearParrafo`, `mostrar`, `const`, `datos` |
| Mi1 | `crearEnlace`, `if` / `else` |
| Ju1 | `crearLista`, `crearItem`, `agregarA`, `for … of` |
| V1 | `cadaSegundo` |
| L2 | (nada nuevo — combina `for` + `if`) |
| Ma2 | `function` |
| Mi2 | (nada nuevo — combina todo) |

---

## 4. Los 11 encargos

Cada encargo se mapea a una pieza del portafolio del cronograma (`brief.md` §4). La columna
**capa** es la del currículo en espiral que se muestra en la pantalla del mapa (1e).

### E1 — "Tu nombre" · Ma1 · Header · N1 · capa 1

- **Necesidad.** La página está en blanco. Tiene que decir quién sos.
- **Incógnita.** Ninguna todavía — es el primer contacto. El descubrimiento es *lo que escribo aparece*.
- **Andamiaje inicial:**
  ```
  // La página está vacía. Escribe tu nombre entre las comillas y pulsa Ejecutar.
  const titulo = crearTitulo("tu nombre")
  mostrar(titulo)
  ```
- **Entrega.** El título con su nombre real.
- **Tests ocultos.** Existe un título · su texto no es el placeholder `"tu nombre"` · hay exactamente uno.
- **Concepto.** Un valor, una acción, ver el resultado.
- **Copy (borrador).** «Esta página va a ser tu portafolio. Ahora mismo no dice nada. Lo primero que
  cualquiera tiene que ver es tu nombre.»

### E2 — "Sobre mí" · Ma1 · sección sobre mí · N2 · capa 1

- **Necesidad.** Un nombre solo no es una página. Falta contar quién sos en un par de frases.
- **Incógnita.** Ninguna dura; es consolidación de E1 con más de una línea.
- **Andamiaje inicial** — el título es **el que el estudiante escribió en E1** (su nombre real),
  no un ejemplo. No se da la estructura hecha: se pide que la deduzca de su propio código.
  ```
  // ← Tu código del encargo 1
  const titulo = crearTitulo("Daniel")
  mostrar(titulo)

  // Ahora escribí dos párrafos sobre vos, debajo del título.
  // Pista: fijate cómo armaste el título arriba (una variable + mostrar())
  // y hacé lo mismo con crearParrafo().
  ```
  El salto analítico —reconocer el patrón `const X = herramienta("…"); mostrar(X)` y aplicarlo
  a los párrafos— es el primer entrenamiento real de pensamiento computacional. Regalar
  `const p1 = crearParrafo(…)` ya escrito lo convierte en copiar/pegar en piloto automático.
- **Entrega.** Título + 2 o más párrafos propios.
- **Tests ocultos.** ≥2 párrafos · texto no vacío · el título de E1 sigue presente (acumulativo).
- **Concepto.** Repetir una acción a mano; variables distintas para cosas distintas.

### E3 — "Dale forma con secciones" · Ma1 · secciones · N2 · capa 1

- **Necesidad.** La página ya dice cosas pero es un bloque de párrafos sin forma. Hay que dividir el
  contenido en secciones con un título arriba de cada parte.
- **Incógnita.** Ninguna dura — es organización. El descubrimiento es que hay más de un tamaño de título.
- **Andamiaje inicial** — sus párrafos de E2 + una pista:
  ```
  // ← Tu código del encargo 2 (título + párrafos)
  ...

  // Poné un título de sección ("Sobre mí") ANTES de tus párrafos.
  // Pista: crearSubtitulo() funciona igual que crearParrafo(), pero hace un título más chico.
  ```
- **Entrega.** Un subtítulo de sección antes de los párrafos; el título y los párrafos siguen.
- **Tests ocultos.** Hay un `h2` con texto · el `h2` viene antes de los `p` · el contenido de E1–E2 sigue.
- **Concepto.** Un segundo nivel de encabezado; empezar a estructurar la página, no solo llenarla.
  Es el paso previo a mover cosas por el espacio, cuadrículas y color (más adelante, fuera de este taller).

### E4 — "Cómo encontrarte" · Mi1 · contacto / redes · N2→N3 · capa 2

- **Necesidad.** Un portafolio sin forma de contactarte no sirve. Tus redes están en `datos.redes`
  y **solo algunas están cargadas** — hay que mostrar los enlaces que existen y ninguno más.
- **Incógnita.** Cuáles redes cargó el estudiante (y cuáles prueba el evaluador). El código no puede
  asumir que están todas.
- **Andamiaje inicial:**
  ```
  // datos.redes puede tener: correo, github, linkedin (o solo algunas)
  if (datos.redes.github) {
    mostrar(crearEnlace("GitHub", datos.redes.github))
  }
  // haz lo mismo para correo y linkedin
  ```
- **Entrega.** Un enlace por cada red presente en `datos.redes`; ninguno para las ausentes.
- **Tests ocultos.** Con las 3 redes → 3 enlaces · con 1 red → 1 enlace · con 0 → sin enlaces, sin romper.
- **Concepto.** Condicional: hacer algo **solo cuando** un dato existe.

### E5 — "En construcción" · Mi1 · aviso condicional · N3 · capa 2

- **Necesidad.** Si todavía no escribiste tu "sobre mí", un visitante ve una página vacía y rara.
  Debería aparecer un aviso "en construcción" — pero solo mientras esté vacío.
- **Incógnita.** No sabés si tu bio va a estar vacía cuando alguien abra la página (podrías borrarla;
  el evaluador prueba con bio vacía y con bio llena).
- **Andamiaje inicial:**
  ```
  const bio = crearParrafo(datos.sobreMi)
  mostrar(bio)

  const aviso = crearParrafo("Página en construcción — vuelve pronto.")
  if (/* ¿cuándo debe aparecer? */) {
    mostrar(aviso)
  }
  ```
- **Entrega.** El aviso aparece si y solo si `datos.sobreMi` está vacío.
- **Tests ocultos.** bio llena → sin aviso · bio vacía → con aviso · el aviso nunca aparece dos veces.
- **Concepto.** Condicional sobre el estado de un dato (no solo su existencia).

### E6 — "Tus hobbies, a mano" · Ju1 (1ª mitad) · lista de hobbies · N2 · capa 1

- **Necesidad.** Agregar tus pasatiempos como una lista.
- **Incógnita.** Por ahora vos elegís cuántos (tres). **Deliberadamente manual.**
- **Andamiaje inicial:**
  ```
  const lista = crearLista()
  mostrar(lista)

  agregarA(lista, crearItem("Escalada en roca"))
  agregarA(lista, crearItem("Fotografía analógica"))
  // agrega tu tercer hobby igual que los de arriba
  ```
- **Entrega.** Lista con 3 items.
- **Tests ocultos.** ≥3 items · textos no vacíos.
- **Concepto.** `agregarA` con un contenedor propio (no `pagina`); patrón repetido a mano.
  **Este encargo siembra el tedio** que E7 resuelve.

### E7 — "La lista que no se queda quieta" · Ju1 (2ª mitad) / V1 · hobbies desde datos · N4 · capa 3

*(este es el encargo que ilustra el mockup)*

- **Necesidad.** Ahora los hobbies viven en `datos.hobbies`, un archivo que vos no escribís. Hoy tiene
  tres. La semana que viene puede tener catorce, o ninguno, y la página tiene que verse bien en los
  tres casos sin que vuelvas a tocar el código.
- **Incógnita.** **Cuántos hobbies hay.** No lo sabés al escribir el código.
- **Andamiaje inicial** — su propio código de E6 + un plan en pseudocódigo:
  ```
  const lista = crearLista()
  mostrar(lista)

  agregarA(lista, crearItem(datos.hobbies[0]))
  agregarA(lista, crearItem(datos.hobbies[1]))
  agregarA(lista, crearItem(datos.hobbies[2]))
  // ¿y si datos.hobbies tiene 14? ¿y si tiene 0?

  // plan:
  //   por cada hobby de datos.hobbies:
  //       agregar a la lista un item con ese hobby
  ```
- **Entrega.** La lista se construye a partir de `datos.hobbies` sea cual sea su tamaño; si está
  vacío, un mensaje ("Todavía no cargué hobbies") en vez de una lista en blanco.
- **Tests ocultos.** 3 → 3 items · 14 → 14 · 0 → mensaje, sin romper · **sin índices fijos**
  (`[0]`, `[1]`, `[2]`) en el código · el resto del portafolio (E1–E5) sigue presente.
- **Concepto.** Recorrer una colección de tamaño desconocido: `for (const hobby of datos.hobbies)`.

### E8 — "El saludo que cambia solo" · V1 · reloj / saludo dinámico · N4 · capa 3

- **Necesidad.** La página debería saludar según la hora ("Buenos días / Buenas tardes / Buenas
  noches") y la hora tiene que seguir corriendo mientras la página esté abierta.
- **Incógnita.** La hora a la que alguien abre la página **y** que sigue avanzando — imposible de
  escribir a mano.
- **Andamiaje inicial** — plan en pseudocódigo:
  ```
  // plan:
  //   cada segundo:
  //       mirar la hora
  //       si es antes del mediodía  -> "Buenos días"
  //       si es antes de las 19h    -> "Buenas tardes"
  //       si no                     -> "Buenas noches"
  //       poner ese saludo en la página
  ```
- **Entrega.** El saludo corresponde a la hora y se actualiza solo.
- **Tests ocultos.** El saludo coincide con la hora simulada que inyecta el test · cambia si el test
  adelanta el reloj · no se acumulan saludos (uno solo, se reemplaza).
- **Concepto.** Repetición que no termina (`cadaSegundo`) **con una condición adentro**. Primera vez
  que se combinan las dos capas.

### E9 — "Solo los proyectos terminados" · L2 · sección de proyectos con filtro · N4→N5 · capa 4

- **Necesidad.** Mostrar tus proyectos, pero solo los terminados — los que están a medias no van en
  el portafolio todavía. Están en `datos.proyectos`, cada uno con un campo `terminado`.
- **Incógnita.** Cuántos proyectos hay y cuáles están terminados.
- **Andamiaje inicial.** Solo la necesidad + herramientas. (El estudiante ya tiene `for` de E7 y `if`
  de E4/E5; acá los junta.)
- **Entrega.** Una tarjeta por cada proyecto terminado; nada para los no terminados; mensaje si no
  hay ninguno terminado.
- **Tests ocultos.** 5 proyectos, 2 terminados → 2 tarjetas · todos sin terminar → mensaje ·
  lista vacía → mensaje · sin contar a mano cuántos terminados hay.
- **Concepto.** Bucle + condición combinados: recorrer y decidir en cada vuelta.

### E10 — "Agrupar por categoría" · Ma2 · skills / proyectos agrupados · N5 · capa 4→5

- **Necesidad.** Tus skills están en `datos.skills`, agrupadas por categoría (una lista de listas:
  "Frontend" → [...], "Backend" → [...]). Hay que mostrar cada categoría con su título y sus items
  debajo.
- **Incógnita.** Cuántas categorías y cuántos items por categoría.
- **Andamiaje inicial.** Necesidad + herramientas + una pista: "vas a repetir lo mismo por cada
  categoría — ponelo en una `function` para no copiar y pegar".
- **Entrega.** Un bloque por categoría (título + lista), para cualquier cantidad de categorías/items.
- **Tests ocultos.** 3 categorías → 3 bloques · una categoría vacía → título sin items (o se omite) ·
  estructura vacía → mensaje.
- **Concepto.** Matrices (array de arrays) + primera `function` propia para no repetir código.

### E11 — "Cada proyecto se ve distinto" · Mi2 · render según tipo · N5 · capa 5

- **Necesidad.** Los proyectos no son todos iguales: unos tienen enlace a demo, otros son solo texto,
  otros tienen imagen. Cada `tipo` se muestra distinto.
- **Incógnita.** Qué tipos hay en `datos.proyectos` y en qué orden.
- **Andamiaje inicial.** Necesidad + herramientas.
- **Entrega.** Cada proyecto renderizado según su `tipo`; un tipo desconocido no rompe la página
  (se muestra en su forma más simple).
- **Tests ocultos.** Mezcla de tipos → cada uno con su formato · tipo no previsto → forma simple, sin
  romper · lista vacía → mensaje.
- **Concepto.** Bucle + **acciones distintas según el tipo de dato** — una `function` que decide.
  Cierra el currículo en espiral (capa 5).

---

## 5. Flujo entre encargos

### 5.1 Estados de un encargo (por estudiante)

| Estado | Significado |
| --- | --- |
| `bloqueado` | Su sesión del calendario todavía no llegó |
| `disponible` | Desbloqueado por calendario; sin código guardado aún |
| `en_progreso` | Tiene código guardado y/o intentos, pero no pasó todos los casos |
| `aceptado` | Pasó todos los casos ocultos de la revisión |
| `checkpoint_pendiente` | Aceptado, pero falta el checkpoint oral (solo en los encargos marcados para checkpoint) |

### 5.2 Qué pasa al aceptar un encargo

1. La revisión devuelve todos los casos en verde → el encargo pasa a `aceptado`.
2. El panel muestra el sello **"encargo aceptado"** por un instante y la plataforma **salta sola al
   encargo N+1** en ~1 s — sin botón, sin aviso, siempre (también si volviste a repasar un encargo
   ya hecho: pasa al siguiente igual). Para ir a un encargo concreto está el mapa (1e).
   El último encargo no salta: muestra *"Terminaste el último encargo."*
   En producción, si el siguiente está bloqueado por fecha, el sello queda sin salto.

   El panel de revisión, antes de entregar, dice explícitamente que **Entregar a revisión** es lo
   que hace avanzar.
3. Al pasar al siguiente encargo, el editor carga el **andamiaje del encargo N+1**, compuesto como
   `archivo_inicial(N+1) = solución_aceptada(N) + líneas_nuevas(N+1)`. La parte heredada es el
   código **real** del estudiante (su nombre, sus frases), no un ejemplo — si en E1 escribió
   "Daniel", E2 arranca con "Daniel". Las líneas nuevas son comentarios y una pista, **sin dar la
   estructura hecha**: el estudiante deduce el patrón de su propio código y lo escribe (§2.5).
   Así se cumple el principio de la §2.1: nunca se abre frente a código ajeno ni en piloto automático.
4. El portafolio de la vista previa es acumulativo: lo construido en encargos anteriores sigue ahí.
5. Si el encargo tiene checkpoint oral, queda en `checkpoint_pendiente` y el panel añade
   *"Queda un checkpoint oral pendiente · Agendar"* (pantalla 1c del handoff). El checkpoint no
   bloquea avanzar al siguiente encargo, pero sí cuenta para la evaluación formativa.

### 5.3 Habilitación por calendario (producción)

Regla del brief (§2.7, §3, §5.3): **el desbloqueo es por día y para todo el grupo a la vez**,
independiente del avance individual.

- Cada encargo pertenece a una sesión (`E1–E3 → Ma1`, `E4,E5 → Mi1`, `E6,E7 → Ju1`, `E8 → V1`,
  `E9 → L2`, `E10 → Ma2`, `E11 → Mi2` — ver la tabla de la §4).
- Un encargo está `disponible` cuando **hoy ≥ la fecha de su sesión**. No importa si terminaste los
  anteriores ni cuántos intentos llevás.
- Dentro de una sesión con dos encargos, la plataforma presenta como "activo" el primero que no
  esté `aceptado`; el estudiante puede volver a cualquiera ya disponible.
- Quien termina todos los encargos del día **espera al día siguiente** — ese es el punto del
  desbloqueo por día (evita que quien ya sabe se adelante saltándose el descubrimiento guiado,
  brief §2.7). Mientras tanto puede tomar retos platino.
- El calendario de sesiones (fecha por sesión) lo configura el instructor por cohorte. El backend
  guarda `sesion → fecha` y deriva el estado de cada encargo.

### 5.4 Desarrollo (sin calendario)

**No hay selector manual de encargo en la interfaz.** El avance es solo el automático al aceptar
(§5.2). La única puerta trasera para desarrollo es la **URL**:

- `/portafolio?e=3` abre el encargo 3 directamente. Sin `?e`, arranca en el 1. El salto automático
  al aceptar no comprueba fecha (no hay calendario todavía).
- **Dos caches en `sessionStorage`** (efímeras — sobreviven recargas, se pierden al cerrar la
  pestaña; mismo criterio "sin persistencia en servidor" del brief §2.6):
  - `ve:soluciones` — el código **aceptado** por encargo. El siguiente encargo lo prepende
    (herencia). Si abrís por URL un encargo sin solución previa, se usa el `fallbackHeredado`
    de `encargos.ts`.
  - `ve:borradores` — el código **en curso** por encargo. Al cambiar de encargo, el del que salís
    se guarda y el del que entrás se recupera; así no se pierde trabajo mientras la pestaña esté abierta.
- Los datos (`datos.js`) y los andamiajes de cada encargo salen de `frontend/src/lib/encargos.ts`.

Cuando exista el backend: `api.encargo(n)` pasa a pegarle a `/encargos/:n`, que responde 403 si la
sesión aún no abrió. La navegación entre encargos ya disponibles será la pantalla del mapa (1e).

### 5.5 "Mis datos" — el portafolio se siente propio desde E1

El estudiante llena una vez un formulario **"Mis datos"** (nombre, sobre mí, redes, hobbies), abierto
desde el botón *editar mis datos* de la pestaña `datos.js`. Eso alimenta el objeto `datos` de la
**vista previa**, así el portafolio muestra *sus* cosas y no un ejemplo genérico.

- Precargado con datos de ejemplo que el estudiante reemplaza por los suyos.
- `datos` de la preview = **perfil del estudiante** + *override del encargo* (donde el encargo
  necesita un estado concreto: E5 fuerza `sobreMi: ""` para que se vea el aviso "en construcción").
- Los **tests ocultos** del servidor siguen inyectando datos de tamaño variable (E7: 0 / 3 / 14
  hobbies). El perfil no afecta la evaluación — solo la preview. Ownership sin romper la pedagogía.
- Dev: `localStorage` `ve:perfil`. Producción: pantalla de perfil / diagnóstico inicial (1f).

---

## 6. Después de los encargos

- **Ju2 — Git + deploy.** No es un encargo con autograder: es un módulo guiado (`brief.md` §5.9).
  Inicializar repo, `add`/`commit`/`push`, conectar Vercel/Netlify, verificar que la URL responde.
- **V2 — Diagnóstico final + demo.** El mismo formulario del diagnóstico inicial, para comparar.

---

## 7. Decisiones abiertas (para el equipo del taller)

| # | Tema | Notas |
| --- | --- | --- |
| EN1 | **El número de encargos.** La pantalla de entrada (1f) dice "7 encargos" y el handoff marca ese copy como final. Esta progresión tiene 11 | O se actualiza el copy de 1f, o se agrupan en "entregas" (p. ej. E1–E3 = "entrega 1"). Recomendado: actualizar 1f |
| EN7 | **"Mis datos" y el diagnóstico inicial** | El perfil del estudiante (§5.5) probablemente sale del diagnóstico inicial (1f), que lo provee el equipo del taller. Confirmar qué campos capturar y si el estudiante los puede editar después |
| EN2 | **API: funciones semánticas vs `crearElemento`** | La propuesta reemplaza `crearElemento("h1")` por `crearTitulo` etc. para no exponer HTML. Confirmar |
| EN3 | **API: `if`/`for` reales vs helpers `si`/`repetir`** | La propuesta usa JS real y lo rotula en español en el panel. Confirmar que no se quiere un DSL |
| EN4 | **`datos` global vs `obtenerDatos()`** | La propuesta lo hace global para quitar carga del encargo 1. `obtenerDatos()` podría volver como lección sobre valores de retorno más adelante |
| EN5 | **Caso vacío: ¿mensaje obligatorio desde E6?** | El brief lo pide (§2.3). Definir el texto estándar del mensaje vacío por sección |
| EN6 | **`cadaSegundo` y los tests** | El autograder necesita poder simular el paso del tiempo (inyectar la hora, adelantar el reloj). Detalle de implementación del grader |
