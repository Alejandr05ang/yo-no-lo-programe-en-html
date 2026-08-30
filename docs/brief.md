# Diseño de Plataforma — Taller de Desarrollo Web para Principiantes

## 1. Concepto general

Plataforma educativa inspirada en la mecánica de **The Farmer Was Replaced**: en vez de niveles explícitos con instrucciones directas ("ahora usa un bucle"), el estudiante enfrenta **necesidades reales** dentro de un proyecto continuo — un portafolio web personal — que solo pueden resolverse aprendiendo el concepto de programación correspondiente. El aprendizaje se descubre por presión del problema, no por instrucción directa.

**Restricción del equipo:** no basarse en HTML5 como lenguaje principal (no se considera "lenguaje de programación" para efectos del taller). Solución: **JavaScript es el lenguaje real**; el HTML se genera como *salida* del código (manipulación del DOM: `createElement`, `appendChild`, `style`, etc.), nunca escrito a mano por el estudiante.

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

### 2.2 Necesidad real, no ejercicio artificial
El disparador de cada concepto debe ser una **cantidad o condición desconocida en el momento de escribir el código**, no una instrucción directa tipo "ahora usen un for". Ejemplos:

- **Bucle real:** el estudiante no sabe cuántos proyectos/hobbies tendrá la lista de datos (viene de un archivo externo que el evaluador puede cambiar sin avisar) → copiar/pegar manual dejar de ser viable.
- **Bucle infinito real:** un reloj en vivo, un carrusel, un polling simulado — nada de esto puede escribirse "a mano" porque debe seguir ocurriendo mientras la página esté abierta.
- **Contenido verdaderamente imposible de anticipar:** un botón "+ Agregar hobby/proyecto" que el usuario que visita la página usa en vivo — ese contenido no existe en el momento en que se escribe el código.

Regla de diseño general: para cada concepto, preguntar "¿qué cantidad, en esta tarea, el estudiante no puede saber al escribir el código?" Esa incógnita es la que fuerza la técnica correcta.

### 2.3 Validación automática (autograder / hidden tests)
Al estilo de Codewars/HackerRank/autograders universitarios: el estudiante ve un caso de ejemplo, pero la evaluación corre contra **casos ocultos** que él no controla:

- Inyectar un array de datos con cantidad variable (3, 15, 40 elementos) y verificar que el DOM generado coincide (`document.querySelectorAll(...).length`).
- Verificar manejo de caso vacío (array sin elementos → debe mostrar mensaje, no romperse ni quedar en blanco).
- Verificar que el conteo de elementos generados por eventos no está limitado a un número fijo hardcodeado.

Esta es también la defensa principal contra el uso de IA para "resolver sin entender": una solución copiada que no generaliza correctamente falla los tests ocultos.

### 2.4 Nombres de métodos/funciones claros, no ofuscados
Se descartó la idea de disfrazar nombres de métodos para forzar descubrimiento. Los nombres deben ser descriptivos (`agregarProyecto()`, `moverDron()`, etc.), igual que en el juego original (`move()`, `harvest()`, `plant()`). El descubrimiento debe estar en **cuándo y cómo combinar** las herramientas disponibles, no en descifrar qué significan sus nombres — eso solo añade carga cognitiva ajena al objetivo y no es una defensa real contra el uso de IA (que infiere semántica fácilmente).

### 2.5 Defensa anti-IA (vía evaluación, no vía ofuscación)
- Tests ocultos que revelan si la solución generaliza o fue copiada sin entender el problema real.
- Checkpoints orales breves en clase: el estudiante explica qué hace su código y por qué.
- Ejercicios de lectura/depuración: código roto que hay que arreglar, o predecir qué hace un fragmento antes de ejecutarlo.
- Evaluación formativa continua (no solo el entregable final), para detectar temprano si alguien avanza sin comprensión real.
- Uso de IA como herramienta legítima solo se introduce más adelante (no en este taller), una vez demostrados los fundamentos sin ella.

### 2.6 Estado dinámico sin persistencia en servidor
Para permitir contenido interactivo real (visitante agrega un hobby/comentario en vivo) sin generar problema de memoria por múltiples copias en el servidor: los cambios viven en el **estado del navegador del visitante** (variables de JS en memoria, o `localStorage`), no se envían ni persisten en el backend. Al recargar, vuelve al estado original. Es el mismo patrón usado en demos reales (carritos de ejemplo, configuradores).

### 2.7 Sistema de desbloqueo por día
Cada día del taller desbloquea nuevas funciones/capacidades disponibles para todos los estudiantes al mismo tiempo, para controlar el ritmo y evitar que quien ya sabe programar se adelante saltándose el descubrimiento guiado. El desbloqueo por día controla *cuándo* algo está disponible; la necesidad real (2.2) sigue siendo lo que fuerza el aprendizaje dentro de cada día — ambas capas trabajan juntas, una no reemplaza a la otra.

### 2.8 Retos opcionales ("platino")
Para estudiantes que avanzan más rápido (grupo con bases previas). No son obligatorios ni cuentan como bloqueo del avance del resto — deben poder tomarse sin interrumpir el ritmo general de la clase.

| Minijuego | Se desbloquea después de | Motivo |
|---|---|---|
| Memoria de imágenes | Condicionales + bucles (o antes, versión simple) | Solo requiere array, bucle, condicional, evento de clic — ya visto |
| Ahorcado | Matrices / funciones | Array de letras, condicional; se beneficia de funciones para organizar código |
| Buscaminas | Etapa final (todo lo anterior + recursión) | Requiere propagación/recursión, concepto no cubierto en el flujo obligatorio — reto "extremo" |

Descartados por alcance (game loop, canvas, colisiones, coordenadas — fuera del alcance de un taller introductorio de 2 semanas): Snake, Tanques, Space Invaders. Pueden mencionarse como gancho para un taller/nivel futuro.

**Decisión pendiente de definir por el equipo:** si el progreso en estos retos suma a la nota final o queda como extra-crédito puramente motivacional (recomendado: extra-crédito visible pero no determinante, para no reintroducir presión en quien recién va llegando al ritmo base).

---

## 3. Manejo de grupo heterogéneo (mitad con bases, mitad sin ninguna)

- El diagnóstico inicial (provisto por los superiores, no diseñado por el equipo del taller) se usa para **formar parejas o tríos mixtos** desde el día 1 (uno con base + uno sin base) — refuerza el aprendizaje de ambos vía efecto tutor/protégé.
- El **desbloqueo de funciones** sigue calendario fijo para todo el grupo; el **ritmo de explicación en clase** se calibra pensando en quien no tiene ninguna base — quien ya sabe programar avanza más rápido en la práctica porque necesita menos tiempo de explicación, no porque tenga contenido distinto.
- Los días de 4 horas (martes/jueves) se dividen en dos bloques: primera mitad explicación a ritmo de principiante para todos, segunda mitad práctica con supervisión cercana a quien no tiene base, mientras quien sí tiene experiencia avanza con menos supervisión hacia los retos opcionales.
- El diagnóstico final (mismo formato, provisto por superiores) sirve como comparación y como señal para ajustar el ritmo en futuras cohortes.

---

## 4. Cronograma — 2 semanas, 5 días/semana

Formato de sesión: Lunes/Miércoles/Viernes = 2h · Martes/Jueves = 4h

| Día | Duración | Contenido | Pieza del portafolio que se construye |
|---|---|---|---|
| L1 | 2h | Diagnóstico inicial (provisto por superiores) + introducción a programación (qué es un algoritmo, pensar antes de codificar) | Setup del entorno |
| Ma1 | 4h | Diagramas de flujo + pseudocódigo (introducción formal) → Variables + creación de elementos vía DOM | Header + sección "sobre mí" |
| Mi1 | 2h | Práctica de variables, más elementos, primer vistazo a condicionales | Info de contacto / redes |
| Ju1 | 4h | Condicionales completos (con flowchart/pseudocódigo breve previo) → introducción a bucles | Saludo dinámico + navegación/lista repetitiva |
| V1 | 2h | Consolidación de bucles (elemento que se repite solo: reloj o carrusel) | Reloj/carrusel en la página |
| L2 | 2h | Bucle + condicional combinados (filtrar lista de proyectos) | Sección de proyectos con filtro |
| Ma2 | 4h | Manejo de matrices (arrays de arrays: proyectos agrupados por categoría, tabla de skills) + introducción a funciones/métodos | Skills o proyectos agrupados |
| Mi2 | 2h | Funciones: bucle + acciones distintas según tipo de dato | Proyectos con renderizado distinto según tipo |
| Ju2 | 4h | Git/GitHub básico (`add`, `commit`, `push`) + deploy en Vercel/Netlify + pulido general | Página publicada con URL real |
| V2 | 2h | Diagnóstico final (comparación) + demo/presentación de portafolios | — |

Notas:
- Diagramas de flujo y pseudocódigo no son un bloque teórico aislado: se reutilizan brevemente antes de cada concepto nuevo (condicionales, bucles, etc.) como herramienta de planeación, no como tema separado.
- Matrices se introducen a mitad de curso, cuando ya existe una necesidad real que las justifica (agrupar por categoría), no al inicio.
- Git/deploy queda al final, cuando ya hay contenido real que vale la pena publicar.

---

## 5. Requisitos técnicos de la plataforma

### 5.1 Editor de código
- Editor embebido en el navegador: Monaco Editor (motor de VS Code) o CodeMirror.
- Debe soportar resaltado de sintaxis tipo JavaScript.

### 5.2 Entorno de ejecución / sandbox
- Ejecución del código del estudiante en `iframe` aislado o Web Worker.
- Debe reflejar en vivo el resultado (vista previa del portafolio actualizándose en tiempo real), simulando "ver el dron trabajar" del juego original.

### 5.3 Sistema de niveles / desbloqueo
- Backend con lógica de qué funciones/métodos/APIs están disponibles según el día del calendario del taller.
- Debe aplicar igual para todos los estudiantes en la misma sesión (control de ritmo grupal), independiente de su avance individual dentro del día.
- Panel separado y visible de "retos extra" que se desbloquea de forma independiente al flujo obligatorio, sin interrumpir la vista principal del portafolio en construcción.

### 5.4 Motor de validación automática (autograder)
- Debe poder inyectar datos de prueba variables (arrays de distinto tamaño, casos vacíos) sin que el estudiante los vea de antemano.
- Debe inspeccionar el DOM resultante (`querySelectorAll`, valores de estilo, conteo de elementos) y/o el estado JS expuesto por el estudiante.
- Debe dar feedback inmediato tras cada intento (éxito/fallo + pista, sin resolver el problema).
- Sistema de pistas progresivas: se activan solo si el estudiante lleva un tiempo estancado o repite un patrón manual ineficiente (ej. copiar/pegar detectado), preservando el descubrimiento para quien puede resolverlo solo.

### 5.5 Copias por estudiante
- Cada estudiante trabaja sobre su propia copia de la plantilla base en el servidor (una copia por estudiante, escala manejable — no confundir con el manejo de visitantes del portafolio publicado, ver 5.6).

### 5.6 Contenido dinámico del portafolio (para visitantes externos)
- Cambios hechos por un visitante externo (agregar hobby, comentario, etc.) deben vivir únicamente en el estado del navegador de ese visitante (variables JS en memoria o `localStorage`), **sin persistencia en el backend del taller**. Evita problema de escalamiento de memoria por múltiples copias generadas.

### 5.7 Checkpoints de evaluación
- Espacio en la plataforma (o proceso manual del instructor) para registrar checkpoints orales breves por estudiante a lo largo del curso.
- Módulo opcional de ejercicios de lectura/depuración de código (mostrar código con error o pedir predicción de output) como parte de la evaluación formativa.

### 5.8 Retos opcionales ("platino")
- Memoria de imágenes, Ahorcado, Buscaminas — implementados como mini-retos separados del flujo principal, con su propio desbloqueo (ver tabla en 2.8).
- No deben bloquear ni ser requisito para avanzar en el portafolio principal.

### 5.9 Módulo de cierre (Git/Deploy)
- Guía o mini-tutorial integrado para: inicializar repo, `git add`/`commit`/`push`, y conexión con Vercel o Netlify para deploy automático.
- Idealmente con verificación de que el deploy fue exitoso (mostrar la URL pública generada al estudiante dentro de la plataforma).

---

## 6. Resumen de decisiones ya cerradas (no requieren más discusión)

- Lenguaje real: JavaScript. HTML como salida del DOM, nunca escrito a mano.
- El sistema de niveles del juego original se traduce en "necesidad real" + desbloqueo por día, no en instrucciones directas tipo "usa un for".
- Nombres de funciones/métodos descriptivos, sin ofuscación.
- Defensa anti-IA vía evaluación (tests ocultos + checkpoints orales + depuración), no vía dificultar la lectura del código.
- Portafolio construido de forma incremental y acumulativa (currículo en espiral), no en bloques separados por tema.
- Diagnósticos inicial y final: provistos por los superiores del equipo — fuera del alcance de diseño de este documento.
- Minijuegos: opcionales, fuera del flujo obligatorio, con su propio desbloqueo progresivo.

## 7. Pendiente de definir

- Si el progreso en los retos opcionales suma a la nota final o es extra-crédito no determinante.
- Detalle de implementación exacta del sistema de pistas progresivas (umbral de tiempo/repetición para activarlas).
- Formato final de los checkpoints orales (¿registrados en la plataforma o solo proceso manual del instructor?).
