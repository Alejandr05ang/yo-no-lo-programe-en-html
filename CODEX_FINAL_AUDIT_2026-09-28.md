# Codex final audit

Auditoría iniciada el 28-sep-2026 y finalizada el 29-sep-2026, America/Guayaquil. Se conserva la fecha del nombre solicitada por Josué. Resultado: **READY FOR HUMAN REVIEW**, limitado a revisión de esta rama local; no autoriza despliegue. La prohibición explícita actual de push prevalece sobre el criterio histórico «branch pusheada» del handoff.

## Starting state

Se leyó completo `CODEX_MASTER_HANDOFF_TUTORIAS_P69_2026-09-28.md` antes de tocar código. Sus afirmaciones se trataron como hipótesis. Checkout inicial limpio en `fix/classroom-feedback-2026-09-23`, HEAD `8635bcab00cf4d1fbaab11d08ce6c3acfc6a4d7b`. `git fetch origin --prune` actualizó la referencia local de master y confirmó `40018744eb258fbb467f37dbeb88d99ae8a7e335`.

Se creó `codex/full-project-audit-2026-09-28` con `--no-track` desde ese origin/master. Se conservaron master local y todas las ramas anteriores, incluida release local divergente. La primera entrega fue [CODEX_PROJECT_STATE_2026-09-28.md](CODEX_PROJECT_STATE_2026-09-28.md), antes de implementar.

## Changes found before coding

Los siete commits posteriores a la auditoría de Claude existen. Ju1 E12/E13, cuadrícula multipestaña, personalización y autoavance intradía ya estaban implementados. El backend actual es FastAPI/Firebase/PostgreSQL, con SQLite para tests. La revisión de soluciones corre en el navegador, no en Deno. Google Sites y varios documentos seguían describiendo prototipos anteriores.

Defectos confirmados: orden numérico distinto del curricular; E7 heredaba E6 y omitía el diseño de E13; E8 visible quedaba estático; revisión avanzada con falsos negativos ante datos vacíos y falsos positivos con soluciones estáticas; dos fallos de revocación de membresías. CI, publicación y galería no existían.

## Baseline

| Comando / entorno | Antes de cambios |
|---|---|
| Python 3.12.14, `python -m pytest -q` | 133 passed, 1 skipped; 38.40 s |
| `python -m ruff check .` | PASS |
| `npm ci` | PASS; 7 vulnerabilidades conocidas |
| `npm test` | 257/257: 203 unit, 17 UI, 37 Vista |
| `npm run test:playthrough` | 12 escenarios, E1–E11 y E6 vacío |
| `npm run build` | PASS, warning de chunks |
| `npm run lint` | 0 errores, 8 warnings |
| `git diff --check` | PASS |

Node global era 22.14.0. Las validaciones definitivas usaron Node **24.19.0** y npm-cli invocado con ese ejecutable. `package.json` exige Node 24.15+ menor que 25. No se confundió una advertencia de engine del launcher inicial con un fallo de producto.

## Edwin feedback regression status

| Familia | Estado y evidencia |
|---|---|
| 1. Hobbies | PASS: edición multilineal, foco, espacios, persistencia y recarga; datos 0/1/muchos |
| 2. Links | PASS: dominios sin esquema, http(s), mailto, inválidos; apertura externa segura; ev.source |
| 3. Mi1 redes | PASS: redes vacías, completas y malformadas; sin cantidades fijas |
| 4. Navegación | PASS: guardar antes de salir, siguiente/anterior, mapa, locked/paused, no salto automático entre días |
| 5. Pseudocódigo/JS | PASS: mezcla válida, traducción de scaffolds, sintaxis y errores con archivo/línea |
| 6. Flow spacing | PASS: pruebas de flujo y separación, sin alterar el código del alumno |

La suite completa conserva autosave, retry, F5, cambio de alumno y accepted sticky. Las mutaciones de cola serial, URL, ev.source y accepted fueron detectadas. No se relajaron validaciones para ocultar fallos.

## Curriculum matrix

| Día | Sesión | Actividad vigente |
|---|---|---|
| 1 | L1 | Diagnóstico y demo |
| 2 | Ma1 | E1–E3 variables y DOM |
| 3 | Mi1 | E4–E6 redes, hobbies y listas |
| 4 | Ju1 | E12/E13 cuadrícula, secciones y diseño |
| 5 | V1 | E7 aviso condicional y E8 rotación |
| 6 | L2 | E9 proyectos terminados |
| 7 | Ma2 | E10 categorías y listas anidadas |
| 8 | Mi2 | E11 presentación por tipo |
| 9 | Ju2 | Guía de versiones, publicación y actualización |
| 10 | V2 | Diagnóstico final, galería y demo |

## Google Sites comparison

Se recorrieron por HTTP de solo lectura las diez subpáginas públicas observadas. La herramienta web no pudo abrirlas; la lectura HTTP devolvió 200. La [matriz curricular](docs/CURRICULO-VIGENTE-2026-09-28.md) conserva enlaces, tema, día, cobertura y contradicciones. React es arquitectura de la plataforma, no requisito del estudiante. Numeración E5–E7, progreso localStorage, roles/backend pendientes y despliegue de Sites son referencias históricas. No se cambió Google Sites.

## Existing days

### V1

E7 funciona con biografía vacía, espacios y texto completo. E8 se verifica con cero, uno y varios destacados, excluye no destacados y exige rotación/reemplazo real. Un reloj controlado ejecuta los callbacks del runtime y examina varios fotogramas. El editor conserva un iframe vivo del código propio; cambiar de actividad desmonta el anterior. Dos carreras adicionales reproducidas y corregidas impiden que una preview inicial tardía reemplace una ejecución nueva o deje el botón Ejecutar bloqueado en otra actividad.

### L2

E9 filtra terminados, mantiene orden y no duplica. Los casos incluyen nombres contenidos unos en otros, listas vacías y soluciones que solo aciertan la muestra visible.

### Ma2

E10 vincula cada encabezado con su lista. Cero categorías, categoría vacía, una y varias; intercambiar listas entre categorías falla. Las skills permanecen disponibles en el portafolio acumulado de E11.

### Mi2

E11 soporta demo, texto, tipo desconocido y campos ausentes. Una URL insegura o vacía conserva texto legible y no rompe el runtime. Variantes y soluciones adversariales evitan aceptar una cantidad fija de proyectos.

### Ju1 E12/E13

Conserva filas/columnas, combinar/separar, pestañas, nombres, estilos, margen/fondo de sección y página. Herencia E12→E13→E7, guardado y F5 tienen pruebas montando la pantalla real. E7–E11 mantienen el documento completo. E12/E13 siguen siendo revisión visual manual: no se inventa accepted por comparar 0/0. El QA en navegador comprobó texto largo y responsive y corrigió la pérdida de grid-area en publicación.

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) configura PR/push/workflow_dispatch, permisos de lectura y cancelación por concurrencia. Backend Python 3.12, uv frozen, pytest y Ruff sin secretos; frontend Node24, npm ci, tests, playthrough, build, lint y diff-check. Los comandos se validaron localmente. **No se disparó GitHub Actions remoto**, porque no hubo push.

## Curriculum order

Orden explícito **1,2,3,4,5,6,12,13,7,8,9,10,11** en catálogo, progreso y navegación. Ya no se usa MAX numérico para validar ni para identificar el último encargo. Se conservan las claves productivas. El backend mantiene la autoridad sobre días abiertos/pausados. Dentro del día continúa el autoavance existente; cruzar días requiere acción explícita.

## Documentation fixes

Se reconciliaron `encargos.md`, `brief.md`, `decisiones.md`, `AUDITORIA-NIVELES.md`, `arquitectura.md` y `SECURITY.md`, diferenciando diseño histórico y realidad. El seed ahora describe E12 con herramienta visual y Ju2 como versión para la cohorte; **no se ejecutó seed productivo**. Mapa y sesión muestran Ju2/V2 como actividades guiadas. Contrato y límites en [PUBLICATION_2026-09-28.md](docs/PUBLICATION_2026-09-28.md).

## Ju2

Guía de fuente editable, versión compartida, revisión, publicación, enlace y actualización explícita. Distingue conceptualmente commit/repositorio/publicación sin obligar a cada estudiante a abrir GitHub o desplegar Netlify. Enlaces funcionales a Mi sitio y galería. No agrega E14 ni una aprobación ficticia.

## V2

Guía de diagnóstico final, revisión móvil/escritorio, actualización, galería y presentación de decisiones/aprendizajes. Se puede abrir desde el mapa y respeta la autorización del servidor; vista docente muestra la guía sin simular una publicación del alumno. No agrega E15.

## Publication

Fuente en Progress; snapshot separada en `app.portfolio_publications`. Mi sitio selecciona una fuente guardada accesible, e13 preferida cuando existe; prepara HTML con datos seguros y pide sanitización al backend. El alumno ve la versión saneada y confirma revisión antes de publicar. Publicar exige Ju2 abierto y fuente accesible. SHA-256 detecta cambios del código completo, perfil, cohorte y encargo: una versión obsoleta devuelve 409.

Slug aleatorio estable, revisión incremental, título, fechas, actualizar y retirar. El editor espera el guardado, incluye fuente heredada aún no persistida y conserva la copia local ante fallos. Editar no modifica la snapshot. Tras login se recupera únicamente un destino local validado `/p/slug` o `/mi-sitio`, sin redirecciones arbitrarias. El propietario retirado puede seguir ocultando su publicación.

## Gallery

Galería por cohorte autenticada con nombre visible, título, avatar opcional y enlace. Lectura del sitio y avatar vuelve a comprobar las membresías de autor y lector, usuario activo y cohorte activa. Los slugs ajenos o retirados devuelven 404. El sitio es de solo lectura, sin controles de edición ni ejecución del código de otro alumno.

## Privacy

Sin endpoint público ni activación de `public_portfolios`. Las respuestas al visitante omiten correo, UID, IDs internos, fuente y rutas de Storage. Se usa display_name, no full_name. El correo de acceso no entra automáticamente en los datos del snapshot; los enlaces/textos que el alumno escriba deliberadamente siguen siendo responsabilidad de su revisión. Proyectos y skills de ejemplo no se publican como si fueran personales. El avatar se sirve como bytes mediante proxy autorizado, sin entregar URL firmada reutilizable.

## Security

Revisión manual guiada por security-best-practices, revisión cruzada de agentes, pruebas locales y análisis de dependencias; **no es un nuevo scan nativo de Codex Security ni una auditoría de infraestructura productiva**.

| ID / gravedad | Hallazgo y evidencia | Resultado |
|---|---|---|
| SEC-01 / alta | Un miembro removed podía recuperar acceso usando join code; `backend/app/cohorts/service.py:55` ahora deniega status distinto de active | Corregido, pruebas y mutación |
| SEC-02 / media | Instructor retirado conservaba listado y hash del código; `backend/app/instructor/routes.py:36` filtra membresía/cohorte y schemas omiten hash | Corregido, pruebas y mutación |
| SEC-03 / dependencias | Baseline npm audit: 7 avisos; actualizaciones compatibles de lodash-es y DOMPurify, nh3 fijado | npm audit 0; pip-audit del backend sin vulnerabilidades conocidas al verificar dependencias |
| SEC-04 / defensa de DB | Tabla nueva debía conservar aislamiento aunque existan default grants distintos | RLS y REVOKE a PUBLIC/anon/authenticated preparados; prueba SQL sin conexión |

Controles revisados: tokens Firebase con revocación y proyecto, roles/membresías por recurso, ORM parametrizado, CORS explícito sin cookies, límites de solicitud, uploads raster re-encodeados, errores/logs sin tokens, cliente HTTP con destino fijo y bloqueo de respuestas de sesiones previas. Búsqueda de patrones de claves privadas/tokens/secretos en 308 archivos versionados o entregables: sin coincidencias sospechosas; configuración Firebase web pública no es una credencial Admin. No se leyeron secretos para este control.

`backend/app/portfolio/sanitize.py:123` usa parser HTML5 nh3 y allowlists. Elimina scripts, eventos, SVG/MathML, formularios, marcos, src/srcset y CSS que carga recursos. `frontend/src/lib/publicacion.ts:59` aplica CSP sin scripts/red y `SnapshotFrame.tsx:8` mantiene sandbox exacto sin same-origin. Solo el código propio del editor puede ejecutarse en el iframe vivo; ev.source permanece validado. Los dos usos de dangerouslySetInnerHTML existentes son catálogo local de herramientas y SVG generado por Mermaid desde AST, con dependencia de sanitización actualizada; no se agregó un sink HTML en la página principal.

La huella no demuestra que un cliente haya calculado honestamente HTML a partir de la fuente: por eso siempre se sanea. No se convierte la evaluación local en una garantía antifraude.

## Database changes

- Preparada: migración aditiva `e6f7a8b9c0d1`, hija de `d4e8a1c3b5f7`.
- Una tabla con propietario único, slug único, FK a usuario/cohorte, revisión positiva, visibilidad solo cohort e índice de galería.
- RLS activada, sin policies de navegador, privilegios de PUBLIC y roles Supabase revocados cuando existen.
- SQL PostgreSQL compilado y asertado localmente; modelos ejercitados con SQLite temporal.
- Applied to production: **NO**. Sin actualización de filas, flags, progreso ni seed productivo.

## Tests added

**117 pruebas adicionales netas** respecto del baseline: backend +64; frontend +53 (unit +34, UI +10, Vista +9). Incluyen datos 0/1/muchos, anti-hardcode, orden/agrupación, timer, herencia, F5, carreras, guardado al compartir, fuente obsoleta, retirada, permisos cruzados, avatar, redirects, sanitización, geometría y migración.

Diagnóstico de fallos durante implementación:

- Código: orden/clamp numérico, herencia perdida, preview estática, datos vacíos, aceptación E8 estática, cola de salida con fuente heredada, respuestas tardías y botón ocupado, revocación, Unicode inválido y geometría CSS. Se añadieron reproducciones y se corrigió la causa.
- Test: la navegación de E11 seguía esperando JS crudo después de migrar a documento multipestaña. Ahora exige el mismo contenido en `parsearDocumentoJu1(...).main` y mantiene la comprobación de guardado antes de salir.
- Runtime de prueba: normalización de arrays entre realms; no se omitieron casos. Una aserción de mutación UI imprimía un árbol jsdom completo; se cambió a la misma condición booleana para evitar OOM de diagnóstico.
- Documentación/requisito: Deno oculto, orden N+1, Ju2 público y E12 crearSeccion no describían el flujo actual; se reconciliaron sin renumerar ni cambiar permisos.

Después de fallos reales se repitieron las suites mínimas afectadas y finalmente las suites globales limpias. Los fallos deliberados de mutación no cuentan como fallos del producto final.

## Mutation testing

**21/21 mutaciones detectadas; todas restauradas.**

| Grupo | Mutaciones |
|---|---|
| Currículo (6) | Orden numérico; bio incondicional; sin variantes; E8 sin comprobar tiempo; ignorar orden E9; ignorar asociación E10 |
| Backend (7) | Sin fingerprint; sin membresía del autor; sin cohorte; sin sanitizador; sin Ju2 abierto; reactivar retirados; instructor sin filtro |
| Publicación UI (2) | Dos variantes del flujo de preview/publicación, incluida la protección de respuestas obsoletas |
| Invariantes y carreras (6) | Cola paralela; esquemas URL peligrosos; mensajes ajenos al iframe; preview inicial tardía; busy heredado; accepted degradado |

Las mutaciones finales de invariantes se ejecutaron en copias temporales, con control verde, fallo de aserción al quitar la protección y restauración en finally. Evidencia: [critical-mutations.json](docs/qa-2026-09-28/critical-mutations.json). El corpus de sanitización tiene 36 pruebas, incluidos HTML/CSS malformado y activo. Permisos se verificaron mediante solicitudes ASGI autenticadas de usuarios ficticios.

## Final QA

| Verificación final | Resultado |
|---|---|
| Backend completo | **197 passed, 1 skipped**, 42.55 s |
| Ruff | **All checks passed** |
| Instalación limpia frontend | npm ci PASS; 279 paquetes instalados, 280 auditados; **0 vulnerabilidades** |
| Frontend completo | **310/310**: 237 unit, 27 UI, 46 Vista; 0 fallos/omitidas |
| Playthrough | **13/13 encargos**, runtime real y documento acumulado E1→E11 en orden curricular |
| Build | TypeScript + Vite PASS; conserva aviso de chunks grandes |
| Lint | **0 errores / 6 warnings preexistentes** |
| Diff | `git diff --check` PASS |
| Navegador | Publicar→galería→leer→actualizar→F5→retirar→404, Ju2/V2, 1280×900 y 390×844 PASS |
| Harness en dist | Ausente; build no incluye entrada ni identidad ficticia de QA |

La omisión backend es preexistente: concurrencia de progreso no comprobable con la fixture AsyncSession compartida. No se añadió ningún skip. Los seis warnings de lint son efectos/hooks existentes en flujo, onboarding, Vista, instructor y admin; se redujeron respecto de ocho del baseline sin desactivar reglas globales.

Capturas y reproducción: [QA local](docs/qa-2026-09-28/README.md). Todos los servicios de QA y el navegador temporal se cerraron; no queda un servidor falso escuchando.

## Git

- Branch: `codex/full-project-audit-2026-09-28`, local sin upstream.
- Starting master: `40018744eb258fbb467f37dbeb88d99ae8a7e335`.
- Implementación y verificaciones realizadas íntegramente en working tree, sin commits intermedios.
- Commit final local autorizado únicamente después de este QA y veredicto; su SHA se entrega en CODEX FINAL STATUS. Este archivo queda dentro de ese commit, por lo que no contiene una referencia circular a su propio hash.
- Push: **NO**. Sin PR, merge, eliminación de ramas ni publicación remota. master local intacto.

## Production

- Touched: **NO**.
- Merged: **NO**.
- Deployed: **NO**.
- Migration / seed: **NO**.
- public_portfolios activated: **NO**.

## Remaining risks

1. Antes de producción se requiere un entorno de integración autorizado para migración PostgreSQL, locks/concurrencia, permisos efectivos de DB/Storage y Firebase real. CI remota y branch protection no se han ejecutado/validado mediante push.
2. El editor ejecuta solo código propio; el timeout del iframe no detiene un bucle síncrono que bloquee el renderer. Publicación no ejecuta ese código. La evaluación local puede ser manipulada por el propio alumno y no equivale a certificación.
3. Snapshot estática: no conserva temporizadores ni recursos externos. Las fuentes usan fallback local. Proyectos/skills personales no tienen todavía un modelo persistido y los fixtures se excluyen deliberadamente.
4. Persisten avisos de chunks y seis warnings de lint. El shell de la aplicación no añade una CSP global nueva sin validar Firebase/Monaco; la snapshot sí tiene política restrictiva. Rate limiting es por proceso y necesita revisión al escalar réplicas.
5. Revocar acceso impide nuevas lecturas; no puede borrar contenido que un miembro ya haya visto/copiado legítimamente. El QA cubre Chromium local y pruebas DOM, no todos los navegadores/dispositivos ni accesibilidad exhaustiva.

Estos límites están explícitos y no se presentan como pruebas realizadas. No quedan fallos confirmados pendientes dentro del alcance local implementado.

## Verdict

**READY FOR HUMAN REVIEW**. Rama únicamente local, sin push, merge ni deploy. Detener después del commit final local y esperar revisión humana.
