# Currículo y referencias vigentes — 2026-09-28

Esta matriz resuelve las diferencias entre el código actual, los documentos de diseño y el material de consulta. El catálogo de `backend/app/catalog/seed.py`, su `sort_order` y los permisos del mapa gobiernan el flujo. No se renumeran claves que ya tienen progreso real.

## Secuencia del taller

| Día | Sesión | Encargos / actividad | Resultado |
|---|---|---|---|
| 1 | L1 | Diagnóstico y demo | Familiarizarse con algoritmos y el entorno |
| 2 | Ma1 | E1, E2, E3 | Nombre, párrafos y subtítulos |
| 3 | Mi1 | E4, E5, E6 | Redes condicionales y hobbies de longitud variable |
| 4 | Ju1 | E12, E13 | Cuadrícula, secciones, colores y tipografía propias |
| 5 | V1 | E7, E8 | Biografía vacía/llena y carrusel de destacados |
| 6 | L2 | E9 | Proyectos terminados, sin cantidades fijas |
| 7 | Ma2 | E10 | Categorías con listas anidadas |
| 8 | Mi2 | E11 | Presentación según el tipo de proyecto y fallback seguro |
| 9 | Ju2 | Git y publicación, módulo guiado | Guardar una versión, publicar y actualizar una URL de cohorte |
| 10 | V2 | Demo final, módulo guiado | Galería, revisión final y presentación |

Orden de claves: **E1, E2, E3, E4, E5, E6, E12, E13, E7, E8, E9, E10, E11**. Las etiquetas numéricas son identidades estables, no posiciones. E7 hereda E13; E7–E11 conservan el documento de cuadrícula y las secciones de Ju1. E12/E13 son trabajos visuales sin autograder automático; no deben aceptarse por comparar cero casos con cero casos.

El docente abre o pausa días. `active_session_id = NULL` permite solo demo. El backend decide el acceso acumulativo y las pausas; la fecha del ordenador y aprobar el reto anterior no sustituyen esa autorización. Dentro del mismo día puede haber salto automático a la siguiente actividad disponible después de una entrega aceptada; cruzar de día requiere una acción explícita y un destino abierto en el mapa. Toda salida debe guardar el borrador. `accepted` es persistente y no se degrada por autosave.

## Revisión de los días 5–8

`revisionLocal.ts` ejecuta el runtime con los datos del estudiante y variantes públicas. Es evaluación formativa del cliente; **no es un autograder oculto ni una garantía contra manipulación del cliente**. No inspecciona palabras como `for` para adivinar comprensión.

| Encargo | Casos ejercitados | Criterio |
|---|---|---|
| E7 | Bio vacía, espacios, texto completo, texto distinto | Aviso solo en vacío; texto cuando existe |
| E8 | Cero, uno, varios; mezcla de destacados | Una imagen por instante, sin no destacados; movimiento y vuelta al inicio |
| E9 | Cero, ninguno terminado, uno, varios; nombres que se contienen | Filtrar, mantener orden y no duplicar nombres |
| E10 | Cero categorías, categoría vacía, una y varias listas | Cada encabezado conserva sus propios items en orden |
| E11 | Cero proyectos, un solo tipo, demo, texto, desconocido, campos opcionales, URL ausente o insegura | Enlace seguro o texto legible sin romper la ejecución |

La suite incluye soluciones que solo coinciden con la muestra visible: deben fallar con las variantes. El playthrough ejecuta los **13 encargos en orden real**, mantiene el mismo portafolio y usa el runtime del sandbox; no fabrica HTML con una API alternativa. Las pruebas específicas de preview cubren el avance temporal y la limpieza al cambiar de encargo.

## Comparación con Google Sites

Consulta pública realizada el 28-sep-2026. El conector web devolvió inaccesible; las solicitudes HTTP de lectura devolvieron 200 y se recorrieron los diez enlaces de Programación. Solo se consultó el material educativo, sin autenticación ni cambios. La referencia mezcla teoría y descripción de una versión anterior del producto.

| Tema y fuente | Subtema | Día / encargo | Cobertura y diferencia |
|---|---|---|---|
| [Entrada, proceso y variables](https://sites.google.com/view/tutorasdeveranop69/programaci%C3%B3n/entrada-proceso-y-variables) | Entrada/salida, variables, Number/String/Boolean | L1, Ma1 / E1–E3 | Cubierto por demo y generación de contenido; operaciones de ingeniería son ejemplos teóricos |
| [Condicionales](https://sites.google.com/view/tutorasdeveranop69/programaci%C3%B3n/condicionales) | if/else, comparación, redes y bio vacía | Mi1 / E4; V1 / E7 | Cubierto; Sites todavía llama E5 al aviso que ahora es E7 |
| [Bucles](https://sites.google.com/view/tutorasdeveranop69/programaci%C3%B3n/bucles) | while, for y reemplazar repetición manual | Mi1 / E5–E6; V1 / E8 | Cubierto mediante recorrido y temporizador; Sites usa E6/E7 para los actuales E5/E6. while disponible, sin reto obligatorio específico |
| [Arrays](https://sites.google.com/view/tutorasdeveranop69/programaci%C3%B3n/arrays) | Índices, colecciones, objetos y grupos anidados | Mi1, L2, Ma2 / E6, E9, E10 | Cubierto; la revisión ahora sí cambia tamaños, incluida lista vacía |
| [HTML / DOM](https://sites.google.com/view/tutorasdeveranop69/programaci%C3%B3n/html-dom) | Funciones semánticas y salida DOM aislada | Ma1 en adelante / E1–E13 | Cubierto sin obligar a escribir HTML; API española y JS/pseudocódigo |
| [CSS y diseño](https://sites.google.com/view/tutorasdeveranop69/programaci%C3%B3n/css-y-dise%C3%B1o) | Tipografía, espacio, color y responsive | Ju1 / E12–E13 | Cubierto con herramientas visuales; Sites describe principalmente los paneles de la plataforma y no la cuadrícula reciente |
| [React y componentes](https://sites.google.com/view/tutorasdeveranop69/programaci%C3%B3n/react-y-componentes) | Arquitectura interna del frontend | Plataforma | Fuera del trabajo obligatorio del alumno, como dice expresamente la referencia. Su nota de roles/backend pendientes está obsoleta |
| [Interactividad y estado](https://sites.google.com/view/tutorasdeveranop69/programaci%C3%B3n/interactividad-y-estado) | Perfil, preview, datos dinámicos y controles | Plataforma; V1 / E7–E8 | Cubierto. localStorage como progreso principal y ausencia de backend describen el prototipo, no el sistema actual |
| [Lógica combinada](https://sites.google.com/view/tutorasdeveranop69/programaci%C3%B3n/l%C3%B3gica-combinada) | Filtro, categorías y tipos; uso de funciones | L2, Ma2, Mi2 / E9–E11 | Cubierto en comportamiento. No se exige una sintaxis concreta de función: se acepta JS o pseudocódigo válido |
| [Build y despliegue](https://sites.google.com/view/tutorasdeveranop69/programaci%C3%B3n/build-y-despliegue) | Vite, Netlify, SPA y demo | Ju2 / V2 | Plataforma desplegada y build cubiertos; la publicación de alumnos es un flujo separado. La referencia dice erróneamente que backend está pendiente |

## Contradicciones resueltas

| Documento / fuente | Diferencia histórica | Regla vigente |
|---|---|---|
| `brief.md` | Ju2 para vestir la web; Git/deploy solo en V2 y una única publicación | Seed/admin: Ju2 Git y publicación, V2 demo; borrador y publicación separados, actualizables |
| `brief.md`, `decisiones.md` | Desbloqueo por aprobación individual | Días abiertos/pausados por el docente y autorización del backend |
| `decisiones.md` | SQLite de producción, Deno activo, Fly.io/Railway y auth por correo/código | PostgreSQL/Supabase; Firebase identidad; FastAPI autoriza; Netlify + Cloud Run. SQLite solo tests; grader local |
| `encargos.md` anterior | N+1 numérico, fecha automática, backend pendiente y caché efímera como progreso | Orden curricular explícito, mapa de servidor y persistencia autenticada con recuperación local |
| Auditorías de 20/23-sep | Sin autoavance o Ju1 vacío | Son informes de su fecha. Desde ae1172e hay autoavance dentro del mismo día; E12/E13 ya existen |
| Google Sites | Numeración E5–E7 anterior y producto sin backend | Referencia conceptual; no sustituye catálogo, permisos ni persistencia actuales |

Las publicaciones son snapshots separados del borrador. Compartir con la cohorte no requiere cuenta externa de GitHub ni desplegar cada alumno en Netlify. Git se presenta como concepto de versión y una práctica opcional. La publicación pública global y cambios de infraestructura productiva requieren una decisión aparte; esta auditoría no los activa.
