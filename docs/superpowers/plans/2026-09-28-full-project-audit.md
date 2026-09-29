# Full project audit implementation plan

**Goal:** dejar una rama local revisable con currículo continuo, cierre del taller y publicación privada segura.
**Architecture:** mantener Firebase/FastAPI/Postgres y Progress como fuente. Snapshot HTML sanitizada separada, permisos actuales por cohorte, publicación global ausente.
**Tech Stack:** React/TypeScript/Vite, FastAPI/SQLAlchemy/Alembic, SQLite de pruebas, Node 24, Python 3.12.
**Spec:** CODEX_PROJECT_STATE_2026-09-28.md y solicitud actual del usuario (prevalece sobre handoffs).

## Global constraints

- Sin commits hasta QA final READY; nunca push/merge/deploy ni datos productivos.
- No activar public_portfolios; conservar claves e1..e13 y sandbox allow-scripts exacto.
- Baseline medido antes de cambios. Pruebas de causa antes de arreglar, suite mínima y global después.
- Ejecución autónoma autorizada: no se requieren aprobaciones intermedias de diseño/plan.

## Review focus

- Remoción/reingreso y lectura de cohortes: denegar permisos retirados, incluso con URL/código conocido.
- Fuente cambia durante preview/guardado: fingerprint y espera al guardar; nunca publicar copia vieja silenciosamente.
- HTML/CSS adversarial: parser HTML5, allowlist, CSP y ausencia de recursos externos.
- Currículo no numérico y grid heredado: E6→E12→E13→E7; conservar pestañas y borradores existentes.
- Runtime temporal: carrusel vivo solamente en editor propio; publicación es estática, cleanup al salir.

## Tasks and ownership

- [x] Estado inicial y baseline: informe raíz, revisión Git y ramas sin destruir trabajo.
- [x] CI (root): .github/workflows/ci.yml, Node24/Python3.12, npm ci/test/playthrough/build/lint + pytest/ruff con SQLite, sin secretos.
- [x] Currículo (curriculum_audit): encargos.ts/progreso.ts/revisionLocal.ts, casos 0/1/muchos/hardcode, playthrough ejecutando runtime real; docs/CURRICULO-VIGENTE-2026-09-28.md con Google Sites y divergencias.
- [x] Continuidad/runtime (root): VistaEstudiante/PanelPreview/VistaConsultaMovil/sandbox, tests de herencia+F5/timers/guardado al abrir Mi sitio. Recibir r.srcdoc de ejecución para preview vivo aislado.
- [x] Backend (backend_audit): permisos existentes, modelo Publication, migración preparada, sanitización, /portfolio/publication[/preview|/publish|/unpublish], /cohort/gallery, /cohort/portfolios/:slug y avatar autenticado. Fuente+datos seguros+fingerprint desde Progress.
- [x] UI (publication_ui): /mi-sitio, /galeria, /p/:slug, sesiones Ju2/V2, contrato backend, preview sanitizada y confirmación explícita mediante botón de publicación, estados offline/versionado, rutas privadas.
- [x] Dependencias (root): revisar advisories y actualizar solo compatibles con lockfile, sin --force.
- [x] Revisión independiente/adversarial y mutaciones restauradas sobre autosave/accepted/URL/sandbox/orden/permisos/sanitización/cohortes.
- [x] QA final: suites globales frescas, lint/build, comprobaciones de navegador local, informe CODEX_FINAL_AUDIT_2026-09-28.md.
- [x] Únicamente tras READY: commits finales locales, registrar SHA final, STOP sin push.

Cada implementador registra reproducción inicial, pruebas mínimas y globales, archivos propios y limitaciones reales. Root verifica integración; ningún agente puede crear commits.
