# Auditoría de niveles — 2026-09-20

## Alcance y método

Auditoría sin cambios de producto ni de código. Se leyeron `README.md`, `docs/brief.md`,
`docs/arquitectura.md`, `docs/decisiones.md`, `docs/design-handoff.md`,
`docs/encargos.md`, `docs/niveles.md`, `docs/backend-propuesta.md`, `frontend/README.md` y
el código de `frontend/src/`. Se inspeccionaron también las rutas, el sandbox, el almacenamiento
local y el evaluador local.

Se ejecutó `npm ci`, `npm run build` y `npm run lint` desde `frontend/`. El servidor de Vite
arrancó en `http://localhost:5173/`, pero la compilación de TypeScript falla antes de poder
producir un build navegable; además, el navegador de auditoría rechazó la apertura de localhost
con `ERR_BLOCKED_BY_CLIENT`. Por eso las pruebas de nivel se hicieron por lectura de la solución
mínima, trazado del runtime y criterios de `revisionLocal`; **no es correcto afirmar que todos los
casos se ejecutaron en navegador**. La primera acción de la siguiente fase debe ser restaurar la
compilación y repetir la matriz dinámica completa contra el sandbox.

## 1. Estado de compilación

| Comando | Resultado | Evidencia / impacto |
|---|---|---|
| `npm ci` | OK | 40 paquetes instalados. `npm audit` informa 2 vulnerabilidades: 1 low y 1 moderate; no se aplicó `npm audit fix`. |
| `npm run build` | **BLOCKER** | `src/lib/revisionLocal.ts:259:25 TS18046: 'n' is of type 'unknown'`. TypeScript 6 no infiere el acumulador de `reduce` al sumar `Object.values(skills)`. Vite no llega a ejecutarse en el build. |
| `npm run lint` | OK con warning | `src/lib/sandbox.ts:111`: escape innecesario `\/`; no bloquea. |
| `npm run dev` | Arranca | Vite 8.2.2 anuncia `http://localhost:5173/`. La inspección visual automatizada quedó bloqueada por el cliente de navegador, no por una corrección realizada al proyecto. |

Recursos externos: Monaco se carga por defecto desde jsDelivr; las fuentes vienen de Google Fonts;
los MP3 son locales salvo que se configure `VITE_MUSICA_URL`; `VITE_API_URL` no está configurada
porque hoy `api.ts` usa mocks. No existe `.env` en el checkout, solo `.env.example`. Hay un bug
documentado: falta `malibu.mp3` del catálogo musical.

## 2. Arquitectura actual y flujo de rutas

El frontend es React 19 + Vite + TypeScript, React Router, TanStack Query y Monaco. `api.ts` es
un adaptador mock: devuelve `ENCARGOS` y llama a `revisionLocal`; no hay tráfico hacia FastAPI.
El preview sí ejecuta código en un iframe `sandbox="allow-scripts"` y recibe HTML con
`postMessage`. Es una separación apropiada para preview, pero no una evaluación de producción.

```
/  -> /inicio
/inicio -> /entrar (sin diagnóstico) | /portafolio (tras botón de bienvenida)
/entrar -> /portafolio
/portafolio?e=N <-> /mapa
/bitacora (accesible por URL y navegación, sin rol)
* -> /inicio
```

| Ruta | Componente / propósito | Audiencia | Estado y persistencia | Protección / problema |
|---|---|---|---|---|
| `/` | redirección | pública | redirige a `/inicio` | ninguna |
| `/inicio` | `Inicio` | participante | `localStorage` de diagnóstico/último acceso y `sessionStorage` de progreso | no hay auth; presenta un flujo local como si fuera sesión |
| `/entrar` | `Entrada` | participante | diagnóstico de ejemplo y perfil en `localStorage` | no registra usuario ni cohorte; redirige a portafolio si ya existe flag |
| `/portafolio?e=N` | `VistaEstudiante` | participante | perfil local + borradores/soluciones por pestaña | consulta `e` permite abrir 1–11 sin autorización; no garantiza la sesión actual |
| `/mapa` | `Mapa` | participante | deriva estado de `sessionStorage` | muestra sesiones y Platino; sus enlaces pueden dirigir a cualquier encargo disponible por URL |
| `/bitacora` | `Bitacora` | instructor/admin | datos y acciones totalmente mock, estado React efímero | **sin guardia de rol**; cualquier visitante puede verla y “registrar” un checkpoint ficticio |
| `/retos` | inexistente | — | — | enlace visible en `Nav` cae en la ruta comodín y vuelve a `/inicio` |

Componentes compartidos: `Nav` mezcla enlaces de participante, “Retos platino” e instructor;
`ControlesMusica` se comparte. `Mapa` es de estudiante, pero `Bitacora` enlaza a él como
“Calendario”. Esta es la mezcla principal de superficies, no un problema de carpetas todavía.

## 3. Catálogo real y prueba de niveles

El catálogo ejecutable contiene exactamente E1–E11 (`frontend/src/lib/encargos.ts`). E1–E3 no
están marcados como borrador; E4–E11 sí muestran “encargo de ejemplo” por `esBorrador: true`.
Todos tienen tres o cuatro verificaciones locales. Esto no satisface la regla de pruebas ocultas
del brief: son snapshots con un único conjunto de datos visible.

### Resumen de QA

| Encargo | Sesión / pieza | Concepto pedido | ¿Solución mínima razonable con lo desbloqueado? | Herencia y evaluación local | Estado |
|---|---|---|---|---|---|
| E1 Tu nombre | Ma1 / header | cambiar texto | Sí: cambiar `"tu nombre"` y ejecutar | valida `h1`, no placeholder y uno solo | PASS conceptual; feedback comprensible |
| E2 Sobre mí | Ma1 / bio | repetir patrón crear+mostrar | Sí | hereda E1; exige dos `p` no vacíos | PASS conceptual; introduce dos frases, no una novedad técnica |
| E3 Dale forma | Ma1 / secciones | subtítulo y orden | Solo editando/reordenando código heredado | local exige que `h2` quede **antes** de `p`, pero el andamiaje añade abajo | **BLOCKER pedagógico** |
| E4 Cómo encontrarte | Mi1 / contacto | condición sobre red existente | No, con las herramientas visibles | `datos.redes` es objeto; requiere `Object.entries`/destructuring no presentados. Local no comprueba omitir valores vacíos | **BLOCKER** |
| E5 Tus hobbies | Mi1 / lista manual | lista + items | Sí | tres `li` no vacíos; no exige conservar E1–E4 | MEDIUM: el objetivo de transición queda pobre |
| E6 Lista que no se queda quieta | Mi1 / lista dinámica | `for...of` de array | Solo reemplazando E5, no sumando debajo | los tres `li` manuales heredados hacen fallar el conteo exacto | **BLOCKER** |
| E7 En construcción | V1 / aviso | `if` por dato vacío | Parcialmente | evalúa solo estado vacío; no prueba rama normal ni exclusión mutua | HIGH |
| E8 Carrusel destacados | V1 / carrusel | filtrar + repetición temporal | No con API/documentación actuales | snapshot inicial valida una imagen; no movimiento, 0/1 destacados, ni “una a la vez” | **BLOCKER** |
| E9 Solo terminados | L2 / proyectos | `for` + `if` | Sí si se reconstruye sección | local valida una sola muestra; no vacío ni mensaje. Fallback pierde contenido previo | HIGH |
| E10 Agrupar categoría | Ma2 / skills | objeto, doble bucle, función | No con herramientas visibles | requiere `Object.entries`; `revisionLocal` ni compila; conteo incluye hobbies heredados | **BLOCKER** |
| E11 Cada proyecto distinto | Mi2 / render por tipo | rama por tipo / función | Parcialmente | no exige función ni formato de imagen; no prueba lista vacía; fallback destruye herencia | HIGH |

### Fichas por encargo

#### E1 — Tu nombre

Objetivo: que la página deje de estar vacía. Nuevo: editar un string dentro de una llamada ya
armada. Herramientas: `crearTitulo`, `mostrar`, `const`. Datos: ninguno. Solución mínima:
`const titulo = crearTitulo("Ana"); mostrar(titulo)`. `revisionLocal` verifica exactamente un
`h1` no placeholder. Casos ocultos recomendados: whitespace, texto vacío y dos títulos. Es
resoluble y entendible para un principiante. Riesgo LOW: el test no obliga a usar el nombre del
perfil, lo cual es correcto para este primer paso.

#### E2 — Sobre mí

Objetivo: añadir dos frases personales. Nuevo: reconocer y repetir el patrón de E1; no agrega
API. Hereda la solución aceptada de E1. Herramientas: las de Ma1. Solución mínima: dos pares
`const p = crearParrafo("…")` + `mostrar(p)`. El evaluador exige título preservado, dos párrafos
y texto no vacío. Casos ocultos: dos, tres y textos con espacios. Es resoluble; la descripción
es clara. Riesgo LOW: los nombres de variables pueden repetirse por accidente si el ejemplo no
se explica, pero es un error recuperable del sandbox.

#### E3 — Dale forma con secciones

Objetivo: introducir subtítulo antes de la bio. Nuevo: `crearSubtitulo`. Hereda E2 y el nuevo
bloque se agrega al final; por tanto, la solución que conserva literalmente el heredado siempre
produce el `h2` después de los `p`, mientras el caso local exige lo contrario. Una solución mínima
que pasa debe editar el bloque heredado y mover las líneas de párrafo debajo del nuevo `h2`; eso
contradice el patrón prometido “solución anterior + líneas nuevas”. Casos ocultos: orden de varios
subtítulos y preservación del contenido real. Severidad BLOCKER. Recomendación: decidir si el
objetivo es “añadir una sección después” (cambiar aserción) o enseñar explícitamente cómo
reordenar antes de pedirlo (cambiar andamiaje y copy).

#### E4 — Cómo encontrarte

Objetivo: una red visible por cada dirección cargada. Nuevo declarado: condición. Datos:
`datos.redes` es un objeto. Las herramientas mostradas incluyen `crearEnlace`, condición,
`crearSalto` y “por cada”, pero un `for...of` no puede iterar un objeto plano. La solución natural
`for (const [nombre, url] of Object.entries(datos.redes)) { if (url) mostrar(crearEnlace(nombre, url)) }`
requiere `Object.entries` y destructuring, ninguno desbloqueado, documentado ni ejemplificado.
Además, `perfilComoDatos` elimina claves vacías antes de la preview, de modo que la condición no
se puede experimentar con las muestras locales. La revisión cuenta claves y compara href, pero no
exige labels ni cubre valores vacíos/malformados. BLOCKER. Alternativas a decidir: representar
redes como array antes de E4, o incorporar `Object.entries` como herramienta/concepto explícito.

#### E5 — Tus hobbies

Objetivo: lista manual de al menos tres intereses. Nuevo: `crearLista`, `crearItem`, `agregarA`.
Solución mínima: crear y mostrar la lista, agregar tres items. Local valida lista, mínimo tres
items y ninguno vacío. Es resoluble con lo mostrado, pero no verifica que sobrevivan identidad,
bio, secciones y redes; tampoco hay datos vacíos porque aquí el requisito es manual. MEDIUM:
conviene verificar preservación acumulativa antes de llamar al portafolio “continuo”.

#### E6 — La lista que no se queda quieta

Objetivo: reemplazar items manuales por uno por hobby de `datos.hobbies`. Nuevo: `for...of`.
Solución mínima aislada: crear una lista y, por cada hobby, `agregarA(lista, crearItem(hobby))`.
Con la herencia real de E5 aparecen los tres `li` manuales y los tres dinámicos: el caso local
exige que el total de `li` sea exactamente `datos.hobbies.length`, por lo que el alumno debe borrar
o reescribir su solución aceptada. Para 0 hobbies el test local falla además porque exige
`hobbies.length > 0` en el tercer caso. BLOCKER: el paso rompe el contrato de herencia y no cubre
el caso vacío que el copy promete. El grader real debe usar 0, 1, 3, 14 y 40 hobbies, exigir una
lista vacía o mensaje definido y detectar hardcodeo.

#### E7 — En construcción

Objetivo: aviso solo si `datos.sobreMi === ""`. Nuevo: `if/else`. La muestra fuerza el dato vacío.
Una solución mínima muestra el aviso en `if` y, en el otro brazo, el texto normal. El test local
solo ejecuta el caso vacío: acepta una solución sin `else`, y no verifica que nunca coexistan aviso
y bio. HIGH. El grader real debe probar vacío, espacios (según contrato), texto normal y datos no
string; debe definir el resultado para cada uno.

#### E8 — Carrusel de proyectos destacados

Objetivo: filtrar proyectos destacados y rotar uno por segundo. Nuevo declarado: `cadaSegundo`.
La pista pide “filtrá primero”, pero no se ha presentado `Array.filter`, `push`, `let`, un índice,
módulo ni `.length`; tampoco la API ofrece `reemplazar`, `vaciar` o contenedor actualizable. Llamar
`mostrar(crearImagen(...))` dentro de `cadaSegundo` agrega imágenes sin quitar las anteriores,
no forma un carrusel. El snapshot local captura solo la primera llamada y acepta incluso mostrar
todas las destacadas de una vez; no observa el intervalo. BLOCKER. El diseño del grader debe
simular ticks, verificar 0 destacados (mensaje/estado definido), 1 (estable), varios (rotación
cíclica, una sola imagen visible) y URL/alt. Hace falta primero definir una API de actualización y
la rampa de JS requerida.

#### E9 — Solo los proyectos terminados

Objetivo: filtrar por `terminado`. Nuevo: combinar bucle y condición. Solución mínima: recorrer
`datos.proyectos`, mostrar el nombre si `proyecto.terminado === true`, y un mensaje si no hubo
ninguno. La evaluación local confirma nombres, exclusión y una aparición con un dataset 2/1; no
prueba 0, 1, muchos ni la exigencia documentada de mensaje vacío. Tampoco exige una tarjeta ni el
uso de bucle. `fallbackHeredado` es `BASE_CON_PARRAFOS`, por lo que abrir E9 directamente borra
conceptualmente E3–E8. HIGH.

#### E10 — Agrupar por categoría

Objetivo: categorías de `datos.skills` con items. Nuevo declarado: matrices y primera función.
La forma de datos en código es objeto (`{ Frontend: [...], Backend: [...] }`), no array de arrays;
la solución razonable necesita `Object.entries(datos.skills)`, destructuring, doble `for...of` y
probablemente `function`. Esas piezas no están disponibles en las fichas, y el evaluador no
compila. Aun corregido el tipo, el caso local cuenta *todos* los `li` del documento: los hobbies
heredados hacen que cinco skills esperadas sean ocho `li`. BLOCKER. El grader real debe aislar la
sección/contendor y probar objeto vacío, categoría vacía, 1/3/10 categorías e items variables.

#### E11 — Cada proyecto se ve distinto

Objetivo: render por `tipo`, con fallback seguro. Nuevo declarado: función que ramifica. Solución
mínima: recorrer, delegar a una función y usar `if/else` para demo/texto/desconocido. Los tests
locales comprueban href de demo, texto y que lo desconocido no rompa, pero no prueban lista vacía,
tipo imagen, estructura visual ni que se use función. `fallbackHeredado` vuelve a `BASE_CON_PARRAFOS`,
perdiendo todas las piezas E3–E10 al abrir directamente. HIGH.

## 4. Coherencia del portafolio y estado

La ruta normal conserva el texto aceptado anterior como prefijo; sin embargo, varios ejercicios
requieren borrar o reordenar dicho prefijo para cumplir su propia evaluación (E3, E6, E10). Esto
es contrario a la promesa de crecimiento acumulativo. Los fallbacks usados al entrar por URL no
reconstruyen el portafolio: E4/E5/E9/E10/E11 retroceden a `BASE_CON_PARRAFOS`; E7/E8 usan otras
aproximaciones. La propia documentación llama a estos fallbacks “aproximaciones”, por lo que no
pueden considerarse evidencia de herencia correcta.

Trayectoria esperada: E1 nombre → E2 bio → E3 estructura → E4 contacto → E5 lista manual → E6
lista dinámica → E7 aviso → E8 destacados → E9 proyectos terminados → E10 skills → E11 formatos.
Trayectoria actual: no es verificable end-to-end por build fallido y tiene rupturas demostrables en
E3/E6/E10, además de fallbacks regresivos. El producto final tampoco tiene ruta pública real ni
modelo de publicación implementado.

## 5. UX de principiante

| Severidad | Hallazgo |
|---|---|
| BLOCKER | E3 pide añadir, pero para aprobar hay que reordenar código antiguo sin enseñar edición estructural. |
| BLOCKER | E4 y E10 necesitan transformar/iterar objetos con APIs no disponibles; E8 necesita estado y reemplazo visual no expuestos. |
| HIGH | E6 y E10 castigan preservar contenido heredado; el alumno no entiende por qué una lista previa “rompe” un encargo nuevo. |
| HIGH | E7/E8/E9/E11 muestran una sola muestra y el feedback local afirma erróneamente “Cada revisión prueba con datos distintos”. |
| HIGH | Los encargos E4–E11 llevan la etiqueta visible “encargo de ejemplo”, lo que rebaja confianza y contradice un taller listo para aula. |
| MEDIUM | La pista tiene espera fija de 5 min, no detecta estancamiento ni ofrece escalones; durante V1 autónomo es insuficiente. |
| MEDIUM | La navegación permite abrir rutas de instructor, retos inexistentes y encargos futuros por URL, dando señales contradictorias. |
| LOW | Error del sandbox es razonablemente legible y ofrece línea; el warning de lint no llega al alumno. |

## 6. Propuesta: tutorial inicial tipo spotlight

Integrarlo en `VistaEstudianteInterna`, por encima de `ve-grid`, como feature aislada
`features/onboarding/TourPortafolio`. Usar atributos estables `data-tour="encargo"`, `editor`,
`ejecutar`, `preview`, `entregar`; no depender de clases de layout ni índices DOM.

| Paso | Destacado | Texto | Continuación | Evento completado |
|---|---|---|---|---|
| 1 | panel de encargo | “Este es tu encargo: el problema que vas a resolver.” | Siguiente | click/Enter en Siguiente |
| 2 | editor | “Aquí escribes el código que arma tu página.” | Siguiente | Siguiente |
| 3 | botón Ejecutar | “Pulsa Ejecutar para ver qué hace tu código.” | Ejecutar ahora / Siguiente | click de Ejecutar o Siguiente |
| 4 | preview | “Aquí aparece el resultado de tu página.” | Siguiente | preview ejecutado o Siguiente |
| 5 | Entregar a revisión | “Cuando funcione, entrégalo para revisar.” | Terminar | Siguiente/Terminar |

Guardar `tourPortafolioV1: completado|omitido` en el estado de progreso del servidor cuando exista;
mientras tanto, una clave local versionada. Debe tener foco atrapado, Escape/Omitir, diálogos con
nombre accesible, avance anunciable por `aria-live`, sin bloquear el botón de cerrar ni la
navegación por teclado. Una implementación propia pequeña cubre estos cinco pasos y evita una
dependencia; una librería solo conviene si aporta de forma comprobada foco, viewport responsive y
recalculo de posiciones. El recorrido debe poder reiniciarse desde Ayuda.

## 7. Participante vs. instructor/admin — mapa propuesto

Sin refactorizar ahora, separar bajo layouts y guards cuando exista la sesión de FastAPI:

```
/                         PublicLayout: inicio/recuperación
/app/*                    ParticipantLayout + RequireAuth(role=estudiante)
  /app/portafolio
  /app/mapa
  /app/perfil
  /app/ayuda
/instructor/*             InstructorLayout + RequireAuth + RequireRole(instructor|admin)
  /instructor/bitacora
  /instructor/cohortes
  /instructor/estudiantes/:id
  /instructor/checkpoints
/admin/*                  AdminLayout + RequireAuth + RequireRole(admin)
  /admin/cohortes
  /admin/administracion
```

`RequireAuth` debe depender de un contrato de sesión del backend, no de un import directo de
Supabase. `RequireRole` debe usar claims/perfil entregados por FastAPI y el servidor ha de repetir
la autorización por cohorte. `Nav` debe dividirse en navegación de participante e instructor;
Platino no debe ocupar una ruta hasta tener funcionalidad.

## 8. Supabase y Platino

### Supabase

**El commit de Supabase mencionado por el equipo todavía no está presente.** No hay
`@supabase/supabase-js`, `createClient`, `VITE_SUPABASE_*`, cliente, auth ni schema aplicado. Solo
existe una propuesta documental donde Supabase podría ser Postgres gestionado y/o proveedor de
Auth detrás de FastAPI. Persistencia actual:

| Datos | Mecanismo actual |
|---|---|
| Perfil, diagnóstico, último acceso, panel abierto, divisor, música | `localStorage` |
| Soluciones aceptadas y borradores | `sessionStorage` |
| Encargos, cohortes, revisión, autoguardado | mocks/en memoria |

Mezclar estas fuentes con una futura sesión real sin una migración explícita puede atribuir el
progreso de un navegador a otra persona. El backend debe ser autoridad antes de migrar o limpiar
las claves de prototipo.

### Platino

No están implementados: son tarjetas decorativas en `Mapa`, métricas ficticias en `cohorte.ts` y
un enlace `/retos` que no existe. La alternativa temporal más simple es feature flag
`VITE_PLATINO_ENABLED=false` (por defecto) que oculte la sección y el enlace de ambas navs; hasta
entonces, al menos retirar el enlace roto y no publicar estados “abierto”. No implementar retos
durante la corrección de niveles.

## 9. Inconsistencias documentales y código

| Documento | Dice | Código dice | Fuente que manda / acción |
|---|---|---|---|
| `brief.md` | desbloqueo por nivel, no fecha; 13 niveles núcleo + N10/N11 consola | 11 encargos, URL abre cualquier `e`; no hay consola, reviews, E12, Git/deploy | Brief producto. Definir alcance v1 y reconciliar catálogo/código. |
| `encargos.md` §3.2 y §5.3 | desbloqueo por día/calendario | `sesionesConEstado` deriva todo de soluciones, y URL lo elude | Brief tiene prioridad: establecer regla única en backend. |
| `niveles.md` | 16 niveles con eventos, formulario, responsive y deploy | explícitamente advierte que está desincronizado; código tiene 11 | Brief/código. Reescribir o archivar el catálogo obsoleto. |
| `design-handoff.md` | portada: 7 encargos; interacción: 4+ casos ocultos y selector 3/14/0 | portada dice 11; revisión local 3/4 casos fijos, sin selector | Brief y código actual. Actualizar handoff cuando haya autograder. |
| `arquitectura.md` | API previa `crearElemento/agregarA/obtenerDatos/repetir/si-sino`, SQLite | runtime usa API semántica y datos global; backend no existe; propuesta contempla Postgres/Supabase opcional | Brief para producto; arquitectura para técnica tras resolver propuesta. |
| `README.md` / `sesiones.ts` | sesiones martes/jueves duplicadas, contenido de 2h | `sesiones.ts` etiqueta Ma1/Ju1/Ma2/Ju2 como `4h` | Brief §3–4. Corregir la etiqueta para no comunicar carga falsa. |
| `docs/decisiones.md` | EN1 menciona progresión de 10 | README/código ya tienen 11 | Mantener decisiones como historial, actualizar estado para evitar búsqueda engañosa. |
| `Nav.tsx` | ofrece Retos platino | router no contiene `/retos` | Código es autoridad funcional: ocultar bajo flag. |

## 10. Backlog priorizado

1. **P0 / BLOCKER:** corregir el error TypeScript de `revisionLocal`, restaurar build y crear pruebas de navegador repetibles.
2. **P0 / BLOCKER:** rediseñar E3, E4, E6, E8 y E10 antes de exponerlos; cerrar el contrato de datos y API por encargo.
3. **P0 / BLOCKER:** sustituir la revisión local como autoridad por FastAPI + Deno + casos ocultos; conservarla solo como feedback de desarrollo si se desea.
4. **P1 / HIGH:** definir snapshots seccionales y reconstrucción/fallbacks que preserven el portafolio; probar recarga, borrador, salto y URL directa.
5. **P1 / HIGH:** decidir el alcance real contra el brief: E9-ext, E12, consola, reviews, Git/deploy; publicar un único catálogo vigente.
6. **P1 / HIGH:** separar navegación/rutas participante-instructor y bloquear `/bitacora` cuando exista auth.
7. **P2 / MEDIUM:** implementar tour inicial accesible y pista escalonada tras estabilizar E1–E3.
8. **P2 / MEDIUM:** conectar persistencia/autoguardado/checkpoints únicamente tras recibir el commit/decisión de backend y Supabase.
9. **P3 / LOW:** ocultar Platino, reponer o retirar `malibu.mp3`, resolver warning de lint y revisar dependencias auditadas.

## 11. Matriz de re-prueba obligatoria después de P0

Para cada encargo: solución mínima desde las instrucciones visibles, 0/1/muchos datos cuando
aplique, tipos inesperados, preservación del encargo anterior, recarga, salida/entrada de nivel,
borrador, aceptación y salto automático. Para E8, además ticks simulados; para E3/E6/E10, una
aserción de que no se tuvo que borrar ni reordenar contenido heredado salvo que el encargo lo
explique explícitamente. Ejecutar cada caso en preview y en grader real; no convertir estos casos
visibles en los tests de producción.

## Fase A — correcciones aplicadas

### Resultado

- **Build:** RESUELTO. `revisionLocal.ts` tipa explícitamente el acumulador numérico de E10 con
  `reduce<number>`, sin `any`, supresiones ni cambios de strictness. `npm run build` pasa.
- **Lint:** sin errores. Se conserva un warning preexistente en `sandbox.ts` por un escape de `/`
  innecesario; no se modificó porque no era parte de la estabilidad de encargos.
- **Regresión:** una ejecución temporal, desde E1 hasta E11 y sin abrir E11 por URL, verificó las
  soluciones mínimas acumuladas contra el contrato de la API. E1–E11 pasan; E8 se ejercitó además
  con 0, 1 y 3 destacados. La revisión visual en navegador sigue pendiente de una suite de navegador
  reproducible; no se añadió dependencia ni se hizo pasar esta simulación por grader de producción.

### Hallazgos de auditoría

| Hallazgo original | Estado | Corrección aplicada |
|---|---|---|
| BLOCKER: build de E10 | RESUELTO | `reduce<number>` conserva inferencia estricta y permite compilar. |
| BLOCKER: E3 obliga a reordenar E2 | RESUELTO | Copy y test dejaron de exigir la posición DOM; comprueban subtítulo no vacío y contenido previo. |
| BLOCKER: E4 requiere `Object.entries` | RESUELTO | `datos.redes` ahora es una lista `{ nombre, url }`; se recorre con `for...of` y una condición. |
| BLOCKER: E6 cuenta `li` heredidos | RESUELTO | La revisión identifica la lista por sus items directos. `vaciar(lista)` permite reutilizar la lista de E5 sin duplicarla. |
| BLOCKER: E8 acumula imágenes / no rota | RESUELTO LOCALMENTE | `crearCarrusel()`, `proyectosDestacados()` y el modo de carrusel de `cadaSegundo()` mantienen un único hijo. El test local declara explícitamente que solo observa un snapshot; el comportamiento temporal queda para el grader futuro. |
| BLOCKER: E10 requiere objeto/reflexión y cuenta todos los `li` | RESUELTO | `datos.skills` es una lista de grupos `{ categoria, items }`; las aserciones ubican las listas concretas de cada grupo. |
| HIGH: overrides posteriores pierden contexto E8/E9/E11 | RESUELTO | Los encargos E8–E11 comparten proyectos con campos de destacado, terminado y tipo, de modo que el código heredado no pierde datos que aún usa. |
| HIGH: E7 solo tiene snapshot vacío | PENDIENTE (grader) | Se mantiene como orientación local; el grader debe probar bio llena/vacía y exclusión mutua. |
| HIGH: E9/E11 no cubren vacíos ni generalización | PENDIENTE (grader) | No se convirtió la revisión local en anti-trampa; faltan casos ocultos de 0/1/muchos y estructuras inesperadas. |

### Clasificación de `revisionLocal`

| Encargo | Clasificación | Nota |
|---|---|---|
| E1–E3 | A válido localmente | Presencia, contenido y preservación visible. |
| E4 | A válido localmente | Número de enlaces cargados y sus URLs; variedad de datos queda para grader. |
| E5 | A válido localmente | Lista manual visible; no intenta inferir intención del alumno. |
| E6 | A válido localmente; D para 0/1/14/40 | Ya no cuenta `li` de otras secciones. |
| E7 | A para snapshot vacío; D para ramas y exclusión | No es una prueba completa del condicional. |
| E8 | A para snapshot; D para tiempo | Comprueba carrusel e imagen destacada, nunca simula segundos. |
| E9 | A para muestra; D para vacío/muchos/no hardcodeo | Sigue siendo una guía, no grader definitivo. |
| E10 | A válido localmente; D para grupos vacíos/muchos | Inspecciona listas de skills específicas, no todos los `li`. |
| E11 | A para tipos visibles; D para vacío/formato completo | El grader real debe probar todos los tipos y entradas. |

### Regresión acumulativa

La secuencia de prueba conserva el mismo archivo: E1 agrega título; E2 bio; E3 subtítulo; E4
contacto; E5 crea `listaHobbies`; E6 vacía y rellena esa misma lista; E7 agrega aviso condicionado;
E8 agrega carrusel; E9 proyectos terminados; E10 grupos de skills; E11 render por tipo. Los
overrides de datos posteriores conservan los campos previos, por lo que el código heredado no queda
apuntando a datos ausentes.

### Verificación en navegador durante la base de autenticación (20-sep-2026)

El smoke acumulativo con el runtime real del iframe detectó un caso que la validación
anterior no cubrió: E11 sustituía los datos de E10 sin conservar `skills`, aunque el
código acumulado todavía recorre esos grupos. Se añadieron los mismos grupos de E10
al override de E11; no se cambiaron instrucciones ni soluciones.

- Regresión reproducida antes del cambio y prueba `frontend/tests/curriculum.test.ts`
  aprobada después.
- E1–E11 acumulativos: 34/34 comprobaciones locales en navegador aprobadas.
- Carrusel con 0, 1 y 3 destacados: un único hijo en cuatro observaciones temporales;
  vacío muestra aviso, uno permanece estable y tres rotan 0→1→2→0.
- Es una verificación del comportamiento local. No sustituye casos ocultos ni grader
  de servidor; estos siguen pendientes.
