# Actual state — 2026-09-28

Primera entrega, escrita antes de modificar código de producto. El handoff completo se leyó como contexto, no como evidencia ni como autorización para publicar. La solicitud actual prevalece: cambios locales hasta QA integral; commits finales solamente al alcanzar READY FOR HUMAN REVIEW; ningún push, merge, deploy, migración/seed productivo o activación de public_portfolios.

## Git

`git fetch origin --prune` completado. Remoto: Alejandr05ang/yo-no-lo-programe-en-html. El checkout inicial estaba limpio en `fix/classroom-feedback-2026-09-23`, HEAD `8635bcab00cf4d1fbaab11d08ce6c3acfc6a4d7b`. La referencia remota local estaba desactualizada en `9c6dc2f`; después de fetch coincide con el handoff.

## Branches

Rama propia creada con `git switch --no-track -c codex/full-project-audit-2026-09-28 origin/master`. No se modificó la rama local master (está 20 commits detrás del remoto). No se eliminaron ramas ni se recuperó/mezcló trabajo ajeno.

| Rama remota | Detrás de origin/master | Exclusivos adelante |
|---|---:|---:|
| fix/classroom-feedback-2026-09-23 | 7 | 0 |
| agent/antigravity-workshop-experience | 29 | 0 |
| release/mvp-production | 42 | 0 |

La rama **local** release/mvp-production diverge de su homónima remota (16/16); no se interpreta como trabajo descartable y se conserva.

## HEAD

Base y HEAD al comenzar: `40018744eb258fbb467f37dbeb88d99ae8a7e335`.

## Uncommitted state

Working tree inicial limpio. `git diff --check` PASS. Sin commits nuevos. La instalación de dependencias y build no modificaron archivos versionados. Este informe es el primer archivo nuevo.

## Baseline

| Verificación | Resultado medido |
|---|---|
| backend/.venv/Scripts/python.exe -m pytest -q | **133 passed, 1 skipped**, 38.40 s |
| Python | **3.12.14**; `python` no está en PATH, se usa venv existente |
| python -m ruff check . | PASS, sin errores |
| npm ci | PASS; 280 paquetes instalados, audit informa 7 vulnerabilidades transitivas/directas |
| npm test | **257/257**: 203 unitarios, 17 UI, 37 VistaEstudiante; 0 fallos |
| npm run test:playthrough | PASS E1–E11 y E6 vacío, 12 escenarios |
| npm run build | PASS TypeScript + Vite; aviso de chunks >500 kB |
| npm run lint | PASS, **8 warnings / 0 errors** |
| git diff --check | PASS |

Node global: 22.14.0. Node 24.19.0 disponible en runtime de Codex y antepuesto a PATH para scripts. El launcher npm.ps1 usa su Node 22 durante instalación y produjo EBADENGINE; las siguientes verificaciones invocarán explícitamente Node 24 + npm-cli.js para eliminar ambigüedad. Advertencias de React act() y error de red simulado en pruebas de retry preexistentes. Los números del 23-sep (202 frontend /130 backend) no son el baseline actual.

`npm audit --json`: 7 avisos (5 high, 1 moderate, 1 low), cadena Mermaid/Chevrotain/lodash-es y DOMPurify/Monaco. No demuestra explotación en la app; requiere actualización compatible y revalidación, sin audit fix --force.

## Architecture confirmed

React/Vite/TypeScript/Monaco; Firebase identifica, FastAPI autoriza, modelos SQLAlchemy usan esquema app y persistencia de Progress/Submissions. `ApiClient` impide fuga de token entre usuarios y destinos. SQLite temporal en auth_harness, sin acceso a DB productiva. Preview ejecuta en iframe `sandbox="allow-scripts"` y valida ev.source. No se confirmó infraestructura remota ni branch protection mediante cambios/consultas productivas.

Contradicción importante: el autograder Deno de docs/arquitectura.md es diseño histórico. **La revisión actual corre en el navegador** (`revisionLocal.ts`); el backend guarda accepted tras validar la forma del resultado, no ejecuta casos ocultos. No debe describirse como evaluación resistente a fraude.

## Current sessions/challenges

| Día | Sesión | Encargos actuales |
|---|---|---|
| 1 | L1 Diagnóstico | Demo, sin encargo |
| 2 | Ma1 Variables y DOM | E1 E2 E3 |
| 3 | Mi1 Condicionales y bucles | E4 E5 E6 |
| 4 | Ju1 Personalización visual | E12 E13 |
| 5 | V1 Estado y movimiento | E7 E8 |
| 6 | L2 Filtrar con intención | E9 |
| 7 | Ma2 Matrices y funciones | E10 |
| 8 | Mi2 Funciones por tipo | E11 |
| 9 | Ju2 Git y publicación | Sin actividades propias implementadas |
| 10 | V2 Demo final | Sin actividades propias implementadas |

## Real curriculum order

Seed/backend: **1,2,3,4,5,6,12,13,7,8,9,10,11**. Defecto confirmado: encargos.ts ordena claves numéricamente y progreso.ts recorre MIN…MAX. Corregir también validaciones y fallback dependientes del valor numérico; conservar todas las claves existentes.

## Edwin bugs

Las seis familias pasan las pruebas existentes: hobbies multilínea/persistencia/foco, enlaces externos normalizados, redes Mi1, navegación, mezcla pseudo/JS y separación del flujo. Autosave/retry/F5/cambio de alumno y accepted sticky pasan también. Esto no sustituye los casos nuevos de datos vacíos ni una prueba productiva con alumnos.

## Post-Claude changes

Los siete commits del handoff existen exactamente; 33 archivos, +2922/-187 respecto de 8635bca. Incluyen E12/E13, estructura multipestaña, personalización, márgenes y autoavance intradía. No se presume equivalencia con la auditoría antigua.

## Personalization E12/E13 status

Tests actuales pasan para 1x1, agregar/eliminar filas/columnas, combinar/separar, nombres, serialización, ejecución multipestaña y margen/fondo de sección vs página. Hay prueba UI de sección/pestaña. Pendiente ampliar F5/herencia E12→E13, contenido largo/responsive y comprobación visual real; los tests actuales no certifican geometría de navegador.

## Documentation contradictions

- Navegación vigente: autoavance al aceptar **solo a una actividad disponible del mismo día**; fin de día es manual y backend/mapa gobiernan locked/paused. Documentos de «sin autoavance» son históricos.
- Brief agrupa E11 con Ma2; seed/encargos vigentes lo sitúan en Mi2.
- Brief incluye una extensión CSS en L2 no implementada como actividad independiente.
- Ju2/V2 tienen repartos históricos distintos. Se usará seed actual: Ju2 publicación/versiones, V2 demo/galería.
- docs/SECURITY.md afirma revisión local solo de desarrollo; contradice el flujo real de accepted.
- E12 seed habla de crearSeccion(), pero el editor vigente crea cuadrícula y secciones mediante herramienta visual.

## Google Sites comparison

La herramienta web no pudo abrir la URL, pero la lectura HTTP pública sí permitió recorrer diez subpáginas observadas de Programación. Es una referencia histórica, no descripción fiable del backend actual. Matriz detallada y URLs se incorporan a docs/CURRICULO-VIGENTE-2026-09-28.md.

| Tema referencia | Día/encargo vigente | Estado |
|---|---|---|
| Entrada, proceso, variables | L1/Ma1 E1–E3 | Cubierto |
| Condicionales | Mi1 E4, V1 E7 | Cubierto; referencia numera aviso como E5 antiguo |
| Bucles | Mi1 E5/E6, V1 E8 | Cubierto; numeración histórica diferente |
| Arrays | Mi1/V1/L2 | Cubierto |
| HTML/DOM | Ma1 y API curada | Cubierto mediante funciones educativas |
| CSS/diseño | Ju1 E12/E13 | Cubierto; falta QA ampliado |
| React/componentes | Arquitectura plataforma | Fuera de currículo obligatorio del alumno, confirmado por referencia |
| Interactividad/estado | V1 y arquitectura | Parcial; referencia aún describe localStorage/sin backend |
| Lógica combinada | L2 E9/Ma2 E10/Mi2 E11 | Cubierto conceptualmente, grader incompleto |
| Build/despliegue | Ju2/V2 | Faltante en flujo del alumno; referencia dice backend pendiente |

## Current security state

Dos problemas reproducidos con SQLite y solicitudes ASGI locales por revisión independiente:

1. Una membership removed bloquea mapa (403), pero conocer join code permite POST /cohorts/join (200), reactivándose sin intervención docente. Causa: cohorts/service.py reactiva removed.
2. Un instructor removido todavía ve la cohorte y join_code_hash en listado /instructor/cohorts. Detalle sí bloquea. Causa: listado sin filtrar status/is_active y serialización excesiva.

Snapshot/publicación/galería no existen aún. `perfilComoDatos` incluye automáticamente email: no reutilizar ciegamente para publicación. El wrapper de preview incluye script puente y fuentes remotas; publicación necesita wrapper estático y sanitización propia en servidor. El flag public_portfolios no se ha activado. Secretos no inspeccionados ni copiados.

## Current missing pieces

CI inexistente; orden local incoherente; revisión E7–E11 con supuestos de datos siempre no vacíos; playthrough usa HTML suministrado y no prueba ejecución dinámica/rotación; publicación y galería ausentes; datos proyectos/skills de encargos son ejemplos del frontend, no proyectos personales persistidos.

## Priority list

**P0:** cerrar bypass de remoción/listado, preparar CI aislada, corregir orden curricular y validar anti-regresiones, resolver dependencias vulnerables compatibles. Publicación solo con autorización por cohorte, sanitización HTML/CSS y aislamiento.

**P1:** ampliar días 5–8 y Ju1 (datos 0/1/muchos, timer/cleanup, F5, navegación, accepted), reconciliar documentación; implementar flujo Ju2/V2, Mi sitio, snapshot separada, enlace estable y galería privada. Migración preparada y probada localmente, nunca productiva.

**P2:** rendimiento de chunks, advertencias preexistentes, pruebas de infraestructura PostgreSQL/Firebase reales reservadas para ambiente autorizado futuro.

## Conservative implementation decisions

- Conservar Progress como fuente editable; Mi sitio elige una versión guardada de encargo (E13 por defecto cuando exista) y enlaza al editor existente.
- API devuelve fuente, datos seguros y fingerprint juntos. Preview→sanitización servidor→publicación exige la misma versión; cambios posteriores no alteran snapshot hasta actualizar explícitamente.
- Cohort-only, slug aleatorio estable, revisión incremental; publicar exige Ju2 accesible y fuente accesible. Ocultar sigue disponible al propietario aun con día pausado. Sin exposición pública global.
- Perfil para publicación usa display_name/descripcion/enlaces web/hobbies, excluye email y datos internos por defecto. No publicar fixtures de proyectos como si fueran del alumno.
- Lectura de galería/sitio valida membership activa tanto de lector como de autor; usuario/cohorte activos. Snapshot no carga scripts ni recursos de terceros.
- Ju2/V2 usan actividades de sesión y guía, sin inventar E14/E15 ni accepted ficticio.

Estado inicial: **NOT READY**. Baseline verde no cubre los defectos y funcionalidades faltantes enumerados.

Hallazgos adicionales de la revisión inicial entregados al cerrar este informe: E7 hereda E6 y omite E13, perdiendo continuidad del diseño; además el iframe temporal de ejecución se elimina tras el primer resultado, de modo que la preview HTML no conserva la rotación de E8. Ambos requieren pruebas funcionales y corrección, no solo documentación. Los casos con bio llena/listas vacías producen falsos negativos, y el E8 estático puede pasar; se reproducirán como pruebas rojas antes de cambiar el grader.
