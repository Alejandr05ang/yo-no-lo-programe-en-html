# Implementación MVP — Tutorías de Verano

Fecha de inventario: 2026-09-20 (America/Guayaquil).

## Objetivo y autoridad

Implementar sobre el frontend existente la misión entregada por el usuario: Firebase Auth para identidad; FastAPI como única autoridad; Supabase PostgreSQL y Storage privados. La misión actual sustituye las propuestas antiguas de SQLite, Supabase Auth y desbloqueo por calendario/progreso local. No hay autorización para commit, push, merge o deploy.

## Inventario inicial

- Rama: `fix/fase-a-niveles`. Se conserva porque no es master.
- Modificaciones preexistentes: `docs/encargos.md`, `frontend/src/features/editor/EditorPanel.tsx`, `frontend/src/lib/apiDocs.ts`, `encargos.ts`, `perfil.ts`, `revisionLocal.ts`, `sandbox.ts`. 225 inserciones y 113 borrados.
- Archivo preexistente sin seguimiento: `docs/AUDITORIA-NIVELES.md`.
- Build inicial: PASS. Lint inicial: PASS con warning preexistente `sandbox.ts:142 no-useless-escape`.
- React 19, TypeScript, Vite, React Router, TanStack Query, Monaco; CSS Classical existente.
- Rutas iniciales: `/inicio`, `/entrar`, `/portafolio`, `/mapa`, `/bitacora`; sin autenticación ni roles reales.
- `api.ts` lee `encargos.ts` y `revisionLocal.ts`; perfil/acceso en localStorage y borradores/soluciones en sessionStorage. Bitácora/cohorte usan fixtures.
- Backend inicial: solamente `backend/README.md`.
- Documentación requerida leída completa; los hallazgos históricos de la auditoría no invalidan su sección final FASE A corregida.

## Infraestructura verificada

- Único Supabase autorizado: `Tutorias-de-Verano`, ref `ttgjesbqmewenryjrxsm`, `us-east-1`, PostgreSQL 17, ACTIVE_HEALTHY.
- Schema real registrado en `SUPABASE-SCHEMA.json`: 15 tablas `app`. Todas con RLS; sin policies públicas; `anon` y `authenticated` sin USAGE ni privilegios sobre tablas.
- `avatars` privado; 5 242 880 bytes; JPEG, PNG, WebP. Sin policies de Storage.
- Datos iniciales: dos admins en allowlist y tres flags; ninguna cohorte, usuario, sesión o reto.
- Flags: `platino=false` con `mode=teaser_only`, `tutorial_inicial=true`, `public_portfolios=false`.
- Overrides existentes son por cohorte/encargo; no hay columna de usuario. No se inventarán excepciones individuales.
- Advisors: 15 avisos informativos RLS sin policies (esperados), 20 índices sin uso en DB vacía (conservar).
- Firebase dedicado creado por autorización expresa posterior: `tutorias-de-verano`; app web `1:1093002100842:web:17c42f5f5ae9b62a8e0a13`. Solo Auth; no Firestore ni Firebase Storage.

## Diseño y plan de ejecución

Se usa `superpowers:writing-plans`; la misión ya autoriza ejecución autónoma y fija las decisiones de diseño. No se añade otra ronda de aprobación. Las nuevas dependencias sirven a la API, verificación oficial de identidad, persistencia y pruebas; no se añade framework visual.

- [x] Phase 0: inventario, documentación, build/lint inicial, schema y controles remotos.
- [x] Phase 1, código y pruebas locales: `backend/app/main.py`, settings, errores sanitizados, logs JSON, CORS exacto, límites de cuerpo/solicitudes, SQLAlchemy async/asyncpg y baseline Alembic sin recrear tablas. La conexión real sigue pendiente.
- [x] Phase 2, código y pruebas aisladas: Firebase Admin, bootstrap por UID y allowlist con email verificado; AuthProvider, login/registro/Google/verificación/recuperación/linking y cliente HTTP centralizado. Pendiente validación de proveedores y sesión real.
- [x] Phase 3: perfil/onboarding y avatar privado procesado con Pillow. Mass assignment, URLs inseguras, formato real, tamaño y límites de píxeles cubiertos; upload privado real y URL firmada validados.
- [x] Phase 4: join transaccional con código aleatorio hasheado y rate limit. Email verificado, perfil completo y duplicados idempotentes cubiertos; join real validado con cohorte temporal eliminada.
- [x] Phase 5: catálogo existente idempotente, mapa con teasers y detalle protegido por sesión. Catálogo real sembrado 10/11; 403 futuro y ausencia de instrucciones en mapa validados.
- [ ] Phase 6: roles y membresías; guards solo para navegación. Probar student no admin e instructor no cohorte ajena.
- [ ] Phase 7: administración de cohortes, sesión activa y agregar admins con auditoría. Probar operaciones atómicas, código una sola vez y no revocar admins.
- [ ] Validar DEMO MVP y ADMIN MVP con credenciales reales. Si faltan, detener integración y documentar valores exactos; no declarar PASS por mocks.
- [ ] Phase 8: progreso/autosave backend conserva borrador ante fallos y propiedad por usuario/cohorte.
- [ ] Phase 9: submissions append-only con numeración transaccional y revisión docente acotada a cohorte.
- [ ] Phase 10: Deno solo después de demo funcional; límites de tiempo/salida, permisos denegados y tests ocultos server-side.
- [ ] Phase 11: hardening y auditorías A auth/roles, B upload/DB, C submissions/grader y revisión final del diff.
- [ ] Phase 12: build/lint, pytest/ruff, advisors y smoke acumulativo E1/E3/E6/E8/E10/E11; estado real y archivos cambiados.

## Invariantes y verificaciones transversales

E1–E11 conservan portafolio acumulativo y FASE A. `vaciar(lista)`, redes `{nombre,url}`, skills `{categoria,items}` y carrusel con 0/1/3 destacados se preservan. Los fixtures locales no pueden habilitar rutas productivas ni actuar como autoridad. Los tests unitarios pueden inyectar identidades verificadas únicamente mediante overrides de dependencias; no habrá bypass activable por un cliente.

La primera conexión real necesita DATABASE_URL TLS y credencial de servidor Firebase (ADC o archivo externo). El secreto servidor de Storage se necesitará en la fase de avatar. Nunca se piden claves privadas en el chat. La configuración pública web obtenida se guarda en un archivo local ignorado; los ejemplos no llevan secretos.

## Seguridad y cobertura

Auditoría Standard Codex Security iniciada: `1d2d4ffa-99e0-4c6d-a7bd-5dded4ea9413`. Preflight ready con concurrencia reducida (3 workers). Daybreak `not_granted`; advisory no bloqueante. El análisis inicial distingue vulnerabilidades reales de funciones aún no implementadas. Los checkpoints posteriores deben describir exactamente el código probado y los límites de integración.

## Punto de detención y valores necesarios

Se detiene la integración al necesitar credenciales reales, según la sección 22 de la misión y la respuesta del usuario. Las fases 3–12 siguen pendientes; las pruebas de los módulos existentes no sustituyen el checkpoint de demo.

1. Habilitar Email/Password y Google en Firebase Authentication del proyecto `tutorias-de-verano`; seleccionar correo real de soporte y autorizar `localhost`.
2. Configurar localmente `GOOGLE_APPLICATION_CREDENTIALS` con la ruta a un JSON Admin externo al repo, o una identidad ADC compatible. Obtenerlo en Firebase → Configuración → Cuentas de servicio. Indicar únicamente la ruta/que está listo, nunca pegar la clave.
3. Configurar `DATABASE_URL` desde Supabase `ttgjesbqmewenryjrxsm` → Connect (directa o Session pooler), usando la contraseña existente. Añadir CA si lo requiere TLS; no resetear contraseña ni desactivar comprobaciones.

`FIREBASE_PROJECT_ID`, Auth Domain, App ID y API Key públicos ya se obtuvieron; no se necesitan nuevamente. Los pasos completos están en `FIREBASE-SETUP.md` y `LOCAL-DEVELOPMENT.md`.

## Base de datos al cierre

- Tablas inspeccionadas/modeladas: las 15 de `app` listadas en los snapshots. El código de auth utiliza `users`, `admin_allowlist`, `cohorts` y `cohort_memberships`; no ha realizado escrituras contra la DB real.
- Filas seed creadas: **0**. No se insertaron usuarios, cohortes ni contenido.
- Bucket inspeccionado: `avatars`, privado; **0** archivos subidos. Integración de carga pendiente.
- Migración creada: `backend/alembic/versions/0001_existing_schema.py`, marcador sin DDL de aplicación. **0** migraciones/stamps ejecutados en Supabase.
- No se tocó Senda. No se abrió RLS, no se concedieron privilegios ni se crearon policies públicas.
- Firebase: un proyecto dedicado y una app web, sin cuentas de alumnos creadas durante pruebas.

## Cambios locales preservados

Se mantiene `fix/fase-a-niveles`. No hubo commit, push, merge, reset, stash ni deploy. Se conservan los cambios FASE A iniciales. La única corrección pedagógica añadida por esta entrega es `datosOverride.skills` de E11, con regresión RED→GREEN y smoke de navegador; se amplió la auditoría existente de niveles.


## Verificación final local

| Comprobación | Resultado |
|---|---|
| Frontend build | PASS |
| Frontend lint | PASS; warning preexistente sandbox.ts:142 |
| Frontend tests | 14/14 PASS |
| Backend pytest | 63/63 PASS |
| Backend ruff | PASS |
| Uvicorn real sin credenciales | health 200/not_configured; me/bootstrap 401; errores y logs sanitizados |
| Navegador | acceso/registro/recuperación, 6 guards anónimos y móvil 390px PASS |
| Currículo acumulativo E1–E11 | 34/34 comprobaciones PASS |
| E8 temporal | 0/1/3 destacados PASS |
| Bundle productivo | Sin currículo, bitácora ficticia ni revisión local |
| Advisors Supabase al cierre | 15 INFO RLS sin policy y 20 INFO unused index; sin cambios recomendados aplicados |
| Git diff --check | PASS |

Estas pruebas de persistencia usan SQLite de test; no validan concurrencia PostgreSQL, RLS mediante la credencial del servidor ni proveedores Firebase reales. Revisión independiente corrigió logging, CA opcional vacía y nueve expresiones CHECK; metadata contrastada contra las 15 tablas/126 columnas/56 constraints y 23 índices explícitos.

| Checkpoint del producto | Estado |
|---|---|
| DEMO MVP | FAIL — flujo completo aún pendiente |
| ADMIN MVP | FAIL — funciones aún pendientes |
| BACKEND completo | FAIL — base/auth local probados; integración y negocio pendientes |
| FIREBASE | PENDING CONFIG — proyecto/app web creados, providers/Admin pendientes |
| SUPABASE | PASS — configuración inspeccionada; conexión FastAPI pendiente |
| STORAGE | FAIL — bucket seguro existente, integración de avatar pendiente |
| GRADER | FAIL — no implementado; requiere demo validada primero |
| SECURITY AUDIT | ISSUES — 0 vulnerabilidades confirmadas; cobertura parcial y sello ligado a instantánea inicial. Ver docs/SECURITY.md |

## Archivos creados

- `backend/.env.example` — dependencias, entorno y herramientas backend.
- `backend/.gitignore` — dependencias, entorno y herramientas backend.
- `backend/alembic.ini` — baseline sin DDL de aplicación.
- `backend/alembic/env.py` — baseline sin DDL de aplicación.
- `backend/alembic/script.py.mako` — baseline sin DDL de aplicación.
- `backend/alembic/versions/0001_existing_schema.py` — baseline sin DDL de aplicación.
- `backend/app/__init__.py` — API, identidad y persistencia de servidor.
- `backend/app/auth/__init__.py` — API, identidad y persistencia de servidor.
- `backend/app/auth/dependencies.py` — API, identidad y persistencia de servidor.
- `backend/app/auth/firebase.py` — API, identidad y persistencia de servidor.
- `backend/app/auth/routes.py` — API, identidad y persistencia de servidor.
- `backend/app/auth/schemas.py` — API, identidad y persistencia de servidor.
- `backend/app/auth/service.py` — API, identidad y persistencia de servidor.
- `backend/app/core/__init__.py` — API, identidad y persistencia de servidor.
- `backend/app/core/config.py` — API, identidad y persistencia de servidor.
- `backend/app/core/errors.py` — API, identidad y persistencia de servidor.
- `backend/app/core/logging.py` — API, identidad y persistencia de servidor.
- `backend/app/core/middleware.py` — API, identidad y persistencia de servidor.
- `backend/app/db/__init__.py` — API, identidad y persistencia de servidor.
- `backend/app/db/models.py` — API, identidad y persistencia de servidor.
- `backend/app/db/session.py` — API, identidad y persistencia de servidor.
- `backend/app/main.py` — API, identidad y persistencia de servidor.
- `backend/pyproject.toml` — dependencias, entorno y herramientas backend.
- `backend/tests/conftest.py` — pruebas de seguridad, configuración y contratos.
- `backend/tests/test_auth.py` — pruebas de seguridad, configuración y contratos.
- `backend/tests/test_authorization.py` — pruebas de seguridad, configuración y contratos.
- `backend/tests/test_firebase.py` — pruebas de seguridad, configuración y contratos.
- `backend/tests/test_foundation.py` — pruebas de seguridad, configuración y contratos.
- `backend/tests/test_schema.py` — pruebas de seguridad, configuración y contratos.
- `backend/uv.lock` — dependencias, entorno y herramientas backend.
- `docs/ARQUITECTURA-BACKEND.md` — documentación de implementación y configuración.
- `docs/FIREBASE-SETUP.md` — documentación de implementación y configuración.
- `docs/IMPLEMENTACION-MVP.md` — documentación de implementación y configuración.
- `docs/LOCAL-DEVELOPMENT.md` — documentación de implementación y configuración.
- `docs/SECURITY.md` — documentación de implementación y configuración.
- `docs/SUPABASE-CONSTRAINTS.json` — snapshot de esquema real, sin secretos.
- `docs/SUPABASE-INDEXES.json` — snapshot de esquema real, sin secretos.
- `docs/SUPABASE-SCHEMA.json` — snapshot de esquema real, sin secretos.
- `frontend/src/features/auth/AuthPages.tsx` — autenticación y comunicación con FastAPI.
- `frontend/src/features/auth/AuthProvider.tsx` — autenticación y comunicación con FastAPI.
- `frontend/src/features/auth/FixtureLayout.tsx` — autenticación y comunicación con FastAPI.
- `frontend/src/features/auth/auth.css` — autenticación y comunicación con FastAPI.
- `frontend/src/features/auth/authContext.ts` — autenticación y comunicación con FastAPI.
- `frontend/src/features/auth/guards.tsx` — autenticación y comunicación con FastAPI.
- `frontend/src/features/auth/session.ts` — autenticación y comunicación con FastAPI.
- `frontend/src/lib/backendTypes.ts` — autenticación y comunicación con FastAPI.
- `frontend/src/lib/firebase.ts` — autenticación y comunicación con FastAPI.
- `frontend/src/lib/http.ts` — autenticación y comunicación con FastAPI.
- `frontend/tests/curriculum.test.ts` — regresión de currículo o contrato de sesión/HTTP.
- `frontend/tests/http.test.ts` — regresión de currículo o contrato de sesión/HTTP.
- `frontend/tests/session.test.ts` — regresión de currículo o contrato de sesión/HTTP.

También se creó `frontend/.env.local`, ignorado por Git, con configuración pública real. `.venv/`, `.tools/`, caches y `dist/` son artefactos locales ignorados, no código para versionar.

## Checkpoint real — 2026-09-21

- Session Pooler 5432, CA oficial, verificación TLS y hostname: PASS.
- `SELECT 1` y `/health` con PostgreSQL real: PASS.
- Firebase Admin y Firebase ID Token → FastAPI → PostgreSQL: PASS.
- Dos entradas activas de `admin_allowlist` promovidas a `admin`; identidad normal conservada como `student`: PASS. Identidades efímeras eliminadas.
- Perfil real → avatar WebP reencodificado en bucket privado → URL firmada: PASS. Objeto efímero eliminado.
- Join real idempotente y onboarding `READY`: PASS con cohorte temporal eliminada.
- Mapa real: 10 sesiones, teasers sin instrucciones y sesión futura 403: PASS.
- Seed de catálogo: primera ejecución creó 10 sesiones/11 encargos; segunda ejecución creó 0/0.
- Backend: 67 pruebas PASS y Ruff PASS. Frontend: 14 pruebas PASS, build PASS y lint PASS con el warning preexistente de `sandbox.ts`.

## Archivos modificados

- `.gitignore` — ignorar credenciales de servidor.
- `README.md` — setup y estado actual.
- `backend/README.md` — setup y estado actual.
- `docs/encargos.md` — cambio FASE A preexistente conservado; no editado en esta entrega.
- `frontend/.env.example` — variables públicas Firebase/API y modo local explícito.
- `frontend/README.md` — setup y estado actual.
- `frontend/package-lock.json` — dependencia Firebase fijada y comando de tests.
- `frontend/package.json` — dependencia Firebase fijada y comando de tests.
- `frontend/src/features/editor/EditorPanel.tsx` — cambio FASE A preexistente conservado; no editado en esta entrega.
- `frontend/src/lib/apiDocs.ts` — cambio FASE A preexistente conservado; no editado en esta entrega.
- `frontend/src/lib/encargos.ts` — FASE A conservada y corrección puntual de skills en E11.
- `frontend/src/lib/perfil.ts` — cambio FASE A preexistente conservado; no editado en esta entrega.
- `frontend/src/lib/revisionLocal.ts` — cambio FASE A preexistente conservado; no editado en esta entrega.
- `frontend/src/lib/sandbox.ts` — cambio FASE A preexistente conservado; no editado en esta entrega.
- `frontend/src/main.tsx` — integración de AuthProvider y rutas protegidas.
- `frontend/src/router.tsx` — integración de AuthProvider y rutas protegidas.
- `netlify.toml` — cabeceras HTTP compatibles.
- `docs/AUDITORIA-NIVELES.md` — archivo preexistente sin seguimiento; se añadió la nueva evidencia de navegador y corrección E11.
