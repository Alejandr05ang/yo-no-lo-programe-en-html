# Claude Opus final audit

Auditoría final, continuación y cierre de las correcciones de clase de Tutorías de Verano
(rama `fix/classroom-feedback-2026-09-23`). Todo se hizo en local: sin merge a `master`, sin
despliegues (Netlify / Cloud Run) y sin tocar producción ni su base de datos.

---

## Starting state

| Punto | Valor |
|---|---|
| Branch | `fix/classroom-feedback-2026-09-23` |
| HEAD | `9c6dc2f0cd7cc0eee08cce4c63191aade69e7294` (igual que `master` local) |
| origin/master | `9c6dc2f0cd7cc0eee08cce4c63191aade69e7294` (sin cambios tras `git fetch --prune`) |
| Cambios sin commit | 17 archivos versionados modificados (+1117 / −302): `VistaEstudiante.tsx`, `MisDatos.tsx`, `EditorPanel.tsx`, `PanelPreview.tsx`, `VistaConsultaMovil.tsx`, `vista-estudiante.css`, `AuthProvider.tsx`, `authContext.ts`, `andamiajeEstilos.ts`, `encargos.ts`, `flujo.ts`, `navegacionActividades.ts`, `perfil.ts`, `pseudocodigoAJS.ts`, `revisionLocal.ts`, `sandbox.ts`, `package.json` |
| Archivos sin seguimiento | `backend/tests/test_profile_links.py`, `frontend/src/features/preview/useAbrirEnlaces.ts`, `frontend/src/lib/colaGuardado.ts`, `frontend/src/lib/enlaces.ts`, `frontend/tests/{colaGuardado,enlaces,flujoEspaciado,navegacionDias,perfilYRedes,pseudocodigoMezcla}.test.ts`, `frontend/tests/helpers/runtimeReal.ts`, `frontend/tests/ui/{enlacesPreview,misDatos}.test.tsx`, más `.claude/launch.json` (configuración local) y `frontend/repro-baseline.mts` (scratch) |
| Checkpoint | `62142e5 checkpoint: preserve inherited classroom fixes before opus final audit` (todo el trabajo heredado, excepto `.claude/` y el scratch; antes se guardó un respaldo `git diff` + `tar` fuera del repo) |
| Ramas de respaldo existentes | `backup/claude-wip-2026-09-22` (59c6393), `backup/master-pre-rewrite-213bae3`, `backup/pre-completion-run`: no se tocaron |

`frontend/tests/vista/` (el harness del workbench que el agente anterior estaba promoviendo) **no
existía**: se construyó en esta auditoría (ver *New tests*).

Entorno: Node `v22.14.0` / npm `10.7.0` en local; Netlify compila con Node 24
(`netlify.toml`), no se cambió. Python 3.13 con el `.venv` del backend. `npm ci` requirió detener
dos servidores Vite huérfanos de la sesión anterior (puertos 5173/5174) que bloqueaban el binario
de rolldown. `npm audit`: 7 vulnerabilidades (1 low, 1 moderate, 5 high; mermaid → chevrotain →
lodash-es), preexistentes: el lockfile es idéntico al de `master`.

## Baseline inherited

Medido sobre el checkpoint `62142e5`, antes de cualquier cambio:

| Suite | Resultado |
|---|---|
| backend `pytest -q` | **129 passed, 1 skipped** |
| ruff | **All checks passed** |
| frontend `npm test` | **143/143** (unit) + **8/8** (UI) |
| `npm run test:playthrough` | **PASS e1-e11** |
| `npm run build` | **PASS** (aviso de chunk > 500 kB, preexistente) |
| `npm run lint` | **0 errores, 14 warnings** |
| `git diff --check` | **PASS** |

---

## Bug 1 — hobbies

- **Reproduction**: en `master`, el `<textarea>` usaba `value={p.hobbies.join('\n')}` y en cada tecla
  `split/trim/filter(Boolean)`: el Enter recién escrito (línea vacía) desaparecía en el re-render,
  así que nunca se llegaba al segundo hobby (reproducido tecla a tecla en jsdom: con el `onChange`
  de `master` restaurado como mutante, el test falla en el primer Enter).
- **Root cause**: el estado del formulario era la lista ya filtrada, no el texto que se escribe.
- **Final implementation** (heredada y verificada): `MisDatos` guarda `hobbiesTexto` libre y
  `prepararPerfil`/`textoComoHobbies` lo convierte a `string[]` solo al guardar; límites idénticos
  al backend (20 hobbies, 80 puntos de código, recorte compatible con pydantic), errores por campo
  con `aria-invalid`/`aria-describedby` y foco en el primer error; el foco inicial entra una vez y
  no salta a "Nombre" con re-renders del padre. Esta auditoría añadió: los refs de `MisDatos` se
  actualizan en un efecto (lint), el diálogo sobrevive a que el día pase a "pausado", y la
  migración del perfil viejo de `localStorage` ya no pisa el nombre real ni sube datos de ejemplo.
- **Regression test**: `tests/ui/misDatos.test.tsx` (tecla a tecla, foco, error de campo),
  `tests/vista/perfil.test.ts` (Mis datos → `PUT /profile` → sesión → `datos.js` con los 3 →
  reabrir muestra los 3 → E4/E6), `tests/perfilYRedes.test.ts` (0 hobbies, 20, 80 caracteres,
  emoji), `backend/tests/test_profile_links.py`. Verificado también con teclado real en Chromium
  (`Ajedrez⏎` se conserva; resultado `Ajedrez\nFútbol\nMúsica`, foco en el campo) y contra el
  backend real (QA local).
- **PASS**

## Bug 2 — links

- **Reproduction**: `crearEnlace("Wikipedia", "wikipedia.com")` → `href="wikipedia.com"` →
  se resolvía como `https://tutoriasdeverano.netlify.app/wikipedia.com`.
- **Root cause**: un dominio sin esquema es una ruta relativa en HTML.
- **Final implementation**: `lib/enlaces.ts` (`normalizarEnlace`) es la única definición y la
  usan la vista previa (`resultadoDelMensaje` normaliza cada `<a href>` del HTML que devuelve el
  sandbox), la revisión (E4 y E11 normalizan los dos lados) y el puente de clic
  (`useAbrirEnlaces`). `wikipedia.com`/`www.x` → `https://…`; `https://` se conserva;
  correo → `mailto:`; `javascript:`/`data:`/`vbscript:`/`file:` y cualquier otro esquema → sin
  `href` (con aviso en consola); `%` mal formado no lanza. El iframe sigue con
  `sandbox="allow-scripts"` exacto: un clic en la vista previa se avisa por `postMessage`, la
  ventana principal valida `ev.source` y la dirección y abre en otra pestaña con
  `noopener,noreferrer`. Esta auditoría añadió: `https:/x`, `https:x`, `https:\x` se devuelven en
  forma completa (el navegador los resolvía otra vez contra la plataforma), y un correo con `%`
  genera un `mailto:` idempotente (`%25`).
- **Regression test**: `tests/enlaces.test.ts` (tabla de casos, idempotencia, runtime real:
  "ningún enlace se resuelve contra la plataforma"), `tests/ui/enlacesPreview.test.tsx` (puente
  y validación de origen). En Chromium real: hrefs normalizados en la vista previa, el puente
  publica `abrir-enlace`, un ancla `#x` no, el iframe no navega, y un mensaje de otro iframe se
  ignora.
- **PASS**

## Bug 3 — networks

- **Reproduction**: con el código de `master`, E4 en arranque en frío fallaba el caso
  "Lo anterior sigue ahí (… subtítulo)" con una solución correcta, porque el andamiaje heredado
  de ejemplo no traía `crearSubtitulo`; y un GitHub escrito `github.com/ana` hacía fallar el
  `PUT /profile` entero (el backend exige https), así que las redes nunca llegaban a `datos.js`.
- **Root cause**: fallback de E4 incompleto + perfil sin normalizar + grader que, al empezar a
  normalizar la vista previa, comparaba contra el valor bruto.
- **Final implementation**: `BASE_CON_SECCION` para E4 (con comentario honesto "código de
  ejemplo"); `normalizarUrlDePerfil` (acepta sin esquema, guarda https; ahora también quita un
  `#fragmento` en vez de rechazarlo); grader con la misma normalización en ambos lados y sin
  coincidencias `null`. El grader no se hizo más permisivo: mostrar también las redes vacías o
  una URL incorrecta sigue fallando.
- **Regression test**: `tests/perfilYRedes.test.ts` (perfil → datos → runtime real → grader;
  GitHub/LinkedIn sin esquema, correo, campo vacío, arranque en frío, HTML crudo, correo con `%`,
  E11 con URL inválida), `tests/vista/perfil.test.ts` y `tests/vista/aceptado.test.ts` (pantalla
  real hasta `accepted`), `backend/tests/test_profile_links.py`. QA local con backend real:
  aceptado en el servidor.
- **PASS**

## Bug 4 — navigation

- **Reproduction**: en `master`, `diaDeEncargo()` devuelve la etiqueta `"Día 3 — Mi1"` y la
  vista la usaba como código (`navigate(rutaDia(diaDeEncargo(numero)))` y
  `/map/sessions/${encodeURIComponent(diaDeEncargo(numero))}`): "Ver actividades del día" iba a
  una página inexistente, la lista del día no cargaba y la última actividad del día era un
  callejón sin salida aunque el docente abriera el día siguiente.
- **Root cause**: etiqueta usada como código; navegación limitada al mismo día.
- **Final implementation**: `navegacionActividades.ts` decide con el mapa del backend
  (`/api/map`, campo `access`): dentro del día Anterior/Siguiente manuales (saltando actividades
  cerradas o sin número, también "Anterior" desde esta auditoría); al terminar el día: siguiente
  bloqueado → explicación + enlace al mapa; abierto → CTA manual "Continuar con el Día N" o
  "Ir al Día N" (0 actividades → `/sesiones/<código>`); pausado → explicación. Sin
  auto-avance entre días. Toda navegación hace flush del autoguardado. Esta auditoría añadió:
  el mapa se vuelve a pedir al montar y un "bloqueado" en caché se confirma antes de mostrarse
  (antes, un día recién abierto podía verse bloqueado hasta 45 s); el encargo no se queda en
  "cargando" sin red; los enlaces al mapa y el botón Atrás también guardan; la vista de teléfono
  pasa por la misma puerta de acceso; la vista previa de docentes navega por el orden del curso.
- **Regression test**: `tests/navegacionDias.test.ts` (lógica pura con el reparto del seed),
  `tests/vista/navegacion.test.ts` (pantalla real: mismo día, siguiente bloqueado / abierto /
  pausado / sin actividades, código del día, flush antes de navegar, sin auto-avance, reto
  cerrado por el docente, URL directa a día bloqueado/pausado, mapa en caché, sin conexión).
  QA local con backend real: Ju1 bloqueado → abierto → pausado → reabierto, `/sesiones/Ju1`.
- **PASS**

## Bug 5 — pseudocode/JS

- **Reproduction**: mezclas como `SI … ENTONCES` cerrado con `}` o `for (…) {` cerrado con
  `FIN PARA` daban errores del motor en inglés o en la línea equivocada.
- **Root cause**: el traductor línea a línea no seguía la estructura de ambas sintaxis.
- **Final implementation** (`pseudocodigoAJS.ts`): una sola pila sigue bloques de pseudocódigo y
  llaves reales (tokenizador de acorn, que ignora textos, comentarios, plantillas y regex);
  mensajes como *Abriste este bloque con "SI … ENTONCES" en la línea 1; ciérralo con "FIN SI",
  no con "}".* Traducción 1 a 1 (las líneas de error coinciden con el editor). Esta auditoría
  corrigió: (a) JS **válido** rechazado cuando una línea de pseudocódigo completa estaba dentro
  de un comentario `/* */` o de una plantilla multilínea (preexistente); (b) regresión del WIP:
  con un error de sintaxis en otra línea, una clave o variable `si:`/`sino =`/`mientras.x` se
  acusaba de "mezcla" y el mensaje mandaba a la línea equivocada; (c) nombres con tilde/ñ en
  `PARA CADA año EN años` y `FUNCIÓN mostrarCanción(…)`; (d) `\r\n` con comentario final;
  (e) `SI [..] ENTONCES {` / `SI ++x … ENTONCES {` vuelven a explicarse como mezcla.
- **Regression test**: `tests/pseudocodigoMezcla.test.ts` (pseudo puro, JS puro, variable `si`,
  comentario con `FIN SI`, string `"SI … ENTONCES"`, plantilla, regex, `else if`, comentarios
  finales, U+2028/U+2029, anidación, pseudo abre/JS cierra y viceversa, CRLF, tildes),
  `tests/pseudocodigoFuzz.test.ts` (ver *Fuzzing*), `tests/pseudocodigoAJS.test.ts`. En Chromium
  real: el error aparece en consola con su línea y como marca de Monaco en la línea 4.
- **PASS**

## Bug 6 — flow spacing

- **Reproduction**: la pestaña "Pseudocódigo" del diagrama reconstruía desde el AST y
  aplastaba todo en un bloque continuo.
- **Root cause**: `flujo.ts` no miraba las líneas en blanco entre sentencias.
- **Final implementation**: se conservan las líneas en blanco que separan partes (una sola aunque
  haya varias), también dentro de bloques, con sangría lógica normalizada (4 espacios por
  nivel), en un `<pre>` con `white-space: pre-wrap`. Esta auditoría añadió: una sentencia partida
  en varias líneas se lee en una (no rompe la sangría ni duplica blancos), el pseudocódigo no se
  recorta, todas las variables de `let x = 0, y = 10`, `crearEnlace` sin comillas dobles,
  "guardarla" en femenino, el error del diálogo con su línea, programas enormes sin excepción, y
  en el diagrama Mermaid las condiciones con `<`, `>`, `&` o `#` ya no se cortan (`#lt;` …).
- **Regression test**: `tests/flujoEspaciado.test.ts` (separación exacta por blancos, dentro de
  bloques, sin inventar separaciones), `tests/flujo.test.ts`. En Chromium real con Mermaid 12:
  `¿contador<limite?` y `Canal #1; y a & b` se ven literales; el pseudocódigo muestra los blancos.
- **PASS**

---

## Additional fixes

- **autosave**: `lib/colaGuardado.ts` (cola serializada). Cambio de reto espera al guardado;
  respuestas viejas se ignoran; lo escrito durante un envío no se marca "guardado"; los
  guardados fallidos **se reintentan solos** con espera creciente (3 s → 30 s); salir por
  cualquier camino (enlace, menú, Atrás) o cerrar/recargar la pestaña deja copia local marcada y
  sube; la marca guarda la huella del último borrador confirmado en el servidor, así una copia
  vieja de un equipo **no pisa** trabajo más nuevo hecho en otro equipo (hallazgo de la 2.ª
  ronda, introducido por el propio arreglo de `pagehide` y corregido).
- **accepted**: el `PUT accepted` va por la **misma cola** y **sin `draft_code`** (antes podía
  pisar un borrador más nuevo escrito mientras se revisaba); si falla sin red se reintenta y se
  avisa "Pendiente de sincronizar"; un rechazo del servidor se muestra. El backend lo mantiene
  sticky (nuevo test backend).
- **stale loading**: ver arriba; además un borrador de `datos.js` guardado por el viejo bug de
  Monaco nunca se carga ni se guarda como `portafolio.js` (test de regresión nuevo).
- **focus**: `MisDatos` no devuelve el foco a "Nombre" en re-renders (test UI + mutante).
- **`</script>`**: `comoLiteralSeguro` escribe `<` como `\u003c` en datos y código del srcdoc
  (test con el runtime real + mutante).
- **null href**: un `href` vacío/ inválido nunca coincide (tests E4 y E11 + mutante).
- **other**:
  - Fuga entre cuentas en equipos compartidos: `ve:borradores`/`ve:soluciones` (sessionStorage)
    no llevaban uid; ahora se acotan por cuenta y la pantalla se monta por uid (preexistente).
  - Migración del perfil viejo (`ve:perfil`): ya no sube "Ana Rivas"/datos de ejemplo, normaliza
    enlaces, recorta lo que pasa de límites, un intento por visita, refresco silencioso
    (preexistente).
  - E6 sin hobbies (lo normal si no se abrió "Mis datos") aceptaba una lista vacía sin bucle;
    ahora también se prueba con tres hobbies de ejemplo, y la nota lo dice (con el error y su
    línea si falla).
  - CSS de navegación: solo clases del design system (`btn btn-primary`/`btn-secondary`); no
    queda `btn-outline` (comprobado en el DOM real).
  - `tests/autosave.test.ts` (preexistente) reimplementaba el algoritmo sin importar código de
    producción: eliminado; sus tres escenarios los cubren tests reales de `tests/vista`.
  - Lint: de 14 a 8 warnings (los 8 restantes están en archivos que esta rama no toca o son
    preexistentes; ninguno es error).

## New tests

| Archivo | Qué protege |
|---|---|
| `frontend/tests/vista/*` (harness: `entorno.ts`, `montar.ts`, `servidorFalso.ts`, `ganchos.mjs`, `monacoFalso.mjs`, `registrar.mjs`) | Monta la **pantalla real** `VistaEstudiante` en jsdom con el cliente HTTP real (`createApiClient`), un backend en memoria con las reglas de FastAPI (accepted sticky, acceso por día) y el **runtime real del sandbox** ejecutando el srcdoc. Solo Monaco se sustituye por un `<textarea>`. |
| `tests/vista/guardado.test.ts` (15) | autoguardado en su reto, solo lectura mientras carga, flush antes de navegar, respuesta vieja ignorada, Atrás con cambios, edición durante guardado, reintento automático, F5 tras fallo, F5 con todo guardado, salir por enlace, `pagehide`, cierre con guardado en camino + otro equipo, dos alumnos en la misma pestaña, guard de `datos.js` |
| `tests/vista/aceptado.test.ts` (4) | aceptado real y sticky, reintento del aceptado, escritura durante la revisión, solución incorrecta no aceptada |
| `tests/vista/navegacion.test.ts` (9) | todos los casos de fin de día, código del día, flush, reto cerrado, URL a día bloqueado/pausado, mapa en caché, sin conexión |
| `tests/vista/perfil.test.ts` (6) | Mis datos → E4 aceptado, E6 con 3 y 0 hobbies, E6 sin bucle, nota E6, migración legada, diálogo con día pausado |
| `tests/pseudocodigoFuzz.test.ts` | fuzzing con oráculo exacto (ver *Fuzzing*) |
| `tests/pseudocodigoMezcla.test.ts` (ampliado) | comentarios/plantillas con pseudocódigo completo, nombres si/sino con error ajeno, tildes, CRLF, `SI [..] ENTONCES {` |
| `tests/enlaces.test.ts`, `tests/perfilYRedes.test.ts` (ampliados) | una barra, `%` en correo, fragmento, HTML crudo en el grader, E11 URL inválida, recorte de la migración |
| `tests/flujo.test.ts` (ampliado) | `<`/`#` en Mermaid, `crearEnlace`, error con línea, multilínea, sin recorte, sin excepción |
| `tests/colaGuardado.test.ts`, `tests/navegacionDias.test.ts` (ampliados) | elección del borrador con huella; "Anterior" salta cerradas |
| `backend/tests/test_progress.py::test_accepted_is_sticky_and_can_be_saved_without_draft_code` | accepted exige todos los casos, se guarda sin `draft_code` y un autoguardado posterior no lo degrada |

## Mutation testing

Script local (no se commitea): cada mutante reintroduce el bug en el código de producción,
ejecuta el test indicado (debe fallar) y restaura el archivo; al final `git status` limpio.
Primera pasada: **28/32** detectados. Los 4 supervivientes mostraron huecos reales en los tests
(grader con HTML ya hecho, `null` en E11, Atrás con borrador lento, `pagehide` sin desmontaje);
se añadieron tests y la segunda pasada detectó **4/4**. Resultado final: **32/32 detectados**.

| Bug | Mutación | Falla el test |
|---|---|---|
| 1 hobbies | volver a `split/trim/filter(Boolean)` en `onChange` | ✅ ui/misDatos + vista/perfil |
| 2 links | preview sin normalizar / normalizador identidad / sin canonicalizar una barra | ✅ ✅ ✅ enlaces |
| 3 redes | grader sin normalizar / `null` coincide / E4 sin subtítulo / mailto sin `%25` / perfil rechaza fragmento | ✅ ✅ ✅ ✅ ✅ |
| 4 navegación | etiqueta como código / "Anterior" inmediata / mapa en caché / encargo pausado sin red | ✅ ✅ ✅ ✅ |
| 5 pseudo+JS | detección ingenua de palabras / traducir dentro de comentarios y textos | ✅ ✅ |
| C `</script>` | sin escapar `<` en el srcdoc | ✅ |
| 6 flujo | sin líneas en blanco / sin escapar `<` en Mermaid | ✅ ✅ |
| A autosave | guard de la cola / guard del efecto / respuesta vieja / aceptado fuera de cola con código / sin reintento / sin guardar al salir / sin `pagehide` / sessionStorage compartido | ✅ ×8 |
| B / D / P / E6 / S | `datos.js` como borrador / diálogo perdido al pausar / foco vuelve a Nombre / migración con nombre de ejemplo / E6 sin datos de prueba / backend accepted no sticky | ✅ ×6 |

No cubiertos por mutante: la puerta de acceso de la vista de teléfono y la navegación de
docentes (dependen de `matchMedia`/rol; revisados a mano).

## Fuzzing

`tests/pseudocodigoFuzz.test.ts`, semilla fija; cada programa se genera **junto con la
traducción exacta esperada** línea por línea (el oráculo no es "no falla", es "sale justo este
JS"). Incluye comentarios de bloque y plantillas con pseudocódigo completo, regex con llaves,
objetos con claves `si`/`sino`, U+2028, tabs, variantes de mayúsculas y tildes, comentarios
finales, SINO SI, anidación de hasta 4 niveles de ambas sintaxis.

| Corpus | Cantidad | Resultado |
|---|---|---|
| Currículo (andamiajes, arranques en frío y andamiajes compuestos de E1–E11) | 32 programas | 32/32 traducen, 1 a 1, JS válido |
| Programas válidos generados | 20.000 | 20.000 traducción exacta, JS válido; lo que ya era JS sale idéntico |
| Programas mutados (otra sintaxis, otro bloque, cierre de más, cierre de menos, error JS ajeno) | 30.000 | nunca lanza; siempre error cuando debe, con línea en rango y mensaje en español; en choques de sintaxis/bloque la línea es la mutada; un error JS ajeno no se toma por mezcla |
| **Regresiones** | | **0** |

Por defecto `npm test` corre 1.500 + 1.500; la cifra completa: `FUZZ_VALIDOS=20000 FUZZ_MUTADOS=30000`.

## Manual local QA

Todo en local; nada contra producción.

| Escenario | Cómo | Resultado |
|---|---|---|
| Perfil: 3 hobbies tecla a tecla, GitHub/LinkedIn sin https, error de campo | Pantalla real + **backend FastAPI real sobre SQLite local** (verificador de token falso, catálogo sembrado con `seed_catalog`) + teclado real en Chromium | PASS |
| E4: arranque en frío, solución correcta, href normalizados, aceptado, no se degrada al seguir editando | Backend real | PASS |
| E6: 3 hobbies con PARA CADA aceptado; sin bucle no | Backend real | PASS |
| Navegación: Ju1 bloqueado → abierto (sin actividades) → pausado → reabierto; E7 por URL bloqueado; sin salto automático | Backend real (días abiertos/pausados con la misma tabla que usa el docente, en la SQLite local) | PASS |
| Editor: pseudo, JS, mezcla válida, mezcla inválida con mensaje y línea | Backend real + Chromium con Monaco real (marca en la línea) | PASS |
| Autosave: cambiar rápido, volver, F5 antes de la pausa | Backend real | PASS |
| Flujo: blancos y Mermaid | Chromium, Mermaid real | PASS |
| Enlaces de la vista previa | Chromium: iframe `sandbox="allow-scripts"` real, puente y validación de `source` | PASS (el clic por coordenadas del panel no llega a iframes fuera de proceso: se verificó con un clic dentro del iframe) |

Los scripts de QA (`qa_servidor.py`, `qa_e2e.test.mts`) quedaron fuera del repositorio.

## Final QA

Sobre el último commit de código (`3d8bcab`), Node v22.14.0:

```text
backend:  .venv/Scripts/python.exe -m pytest -q      → 130 passed, 1 skipped
          .venv/Scripts/python.exe -m ruff check .    → All checks passed!
frontend: npm test                                    → unit 161/161, UI 8/8, vista 33/33 (202 en total)
          npm run test:playthrough                    → PASS e1-e11
          npm run build                               → ✓ built (aviso de chunk > 500 kB, preexistente)
          npm run lint                                → 0 errores, 8 warnings
          FUZZ_VALIDOS=20000 FUZZ_MUTADOS=30000 …     → 3/3 (0 regresiones)
root:     git diff --check                            → PASS (worktree y 9c6dc2f..HEAD)
          git status --short                          → limpio
          git diff origin/master...HEAD --stat        → 46 archivos, +4462 / −466
```

## Security

- **Sandbox exacto**: los 4 iframes (`sandbox.ts` ejecución, `PanelPreview`,
  `VistaConsultaMovil`, `DemoNivel`) tienen `sandbox="allow-scripts"`; `allow-same-origin` solo
  aparece en un comentario. Todos los `message` listeners validan `ev.source`.
- **Secrets scan**: `git grep -E "DATABASE_URL|BEGIN PRIVATE KEY|service_account|password|secret|token|AIza|nvapi-"`
  sobre los archivos del diff: solo nombres de variables, tipos de token del tokenizador y textos
  de prueba. Ningún `.env`, clave, dump ni credencial en el diff. (La API key web de Firebase de
  `netlify.toml` es pública por diseño y preexistente; no está en el diff.)
- **Producción tocada**: **NO**. Sin despliegues, sin migraciones, sin `active_session` ni
  códigos reales. Las pruebas de backend usan SQLite temporal (`_env_file=None`, `DATABASE_URL`
  vacío); la QA local usó una SQLite en una carpeta temporal.

## Git

- **Branch**: `fix/classroom-feedback-2026-09-23`
- **Commits** (sobre `9c6dc2f`):
  1. `62142e5` checkpoint: preserve inherited classroom fixes before opus final audit
  2. `3b986f5` fix(pseudocode): never treat comment/string text or JS names as pseudocode
  3. `99307e4` style(pseudocode): drop useless escapes flagged by oxlint
  4. `cb758d0` fix(workbench): harden autosave, accepted state, exits and day access
  5. `c9fe190` fix(links): canonicalize one-slash URLs, keep email mailto idempotent, drop profile fragments
  6. `c224d3d` fix(flow): readable diagram conditions, honest pseudocode view, never crash
  7. `aef4acb` fix(review): E6 with no saved hobbies also checks sample hobbies
  8. `c1d418a` test: day button uses the session code; accepted stays accepted on the backend
  9. `ebe0570` test(vista): always unmount screens after each test
  10. `80e9b0c` test: close the gaps found by mutation testing
  11. `f3d842b` fix: address the second adversarial review round
  12. `3d8bcab` docs(workbench): keep the save comment next to guardarEnServidor
  13. (este informe) docs: final audit report
- **Final SHA**: el commit que añade este documento (ver `git log -1`); último commit de código `3d8bcab`.
- **Pushed?** sí, `git push -u origin fix/classroom-feedback-2026-09-23` (sin force).
- **Merged?** **NO**
- **Deployed?** **NO**

## Remaining risks

- **Revisión independiente incompleta en dos dimensiones**: la 2.ª ronda de revisores
  independientes para "workbench" y "pseudocódigo" no pudo terminar (límite de sesión, dos
  veces). Esas áreas quedaron cubiertas por los 33 escenarios de pantalla real, la QA con backend
  real, 32 mutantes y el fuzzing, pero sin esa segunda mirada externa.
- **Conflicto real entre equipos**: si un estudiante tiene cambios sin subir en un equipo (sin
  red) y además sigue en otro equipo, al volver al primero **manda el servidor** y se pierden los
  últimos cambios no subidos del primero. Es una elección conservadora (preservar el trabajo más
  grande y reciente); no hay fusión.
- **Cierre de pestaña**: el guardado de `pagehide` no usa `keepalive`; si la red no alcanza a
  enviarlo, queda la copia local marcada y se sube en la próxima visita desde ese equipo.
- **Guardados rechazados por el servidor** (p. ej. día pausado) se reintentan cada 30 s mientras
  la pantalla siga abierta; se guardan cuando el día se reabre. Inofensivo, pero es tráfico.
- **Revisión local**: sigue siendo el navegador quien acepta los encargos; el backend solo exige
  `cases_passed == cases_total`. Arquitectura preexistente, no se cambió.
- **E6 con 0 hobbies** ahora también se revisa con hobbies de ejemplo: cambio pedagógico que el
  docente debe conocer (la nota de la revisión lo explica al estudiante).
- **Ambigüedad aceptada**: una línea que sea solo `sino` se lee siempre como `SINO`, aunque
  exista una variable con ese nombre.
- **Sin prueba automática**: la puerta de acceso de la vista de teléfono y la navegación en vista
  previa de docentes (revisadas a mano).
- **Entorno**: build y tests verificados con Node 22 en local; Netlify usa Node 24.
  `npm audit` mantiene 7 avisos preexistentes en dependencias de Mermaid.

## Final verdict

**READY FOR HUMAN REVIEW**
