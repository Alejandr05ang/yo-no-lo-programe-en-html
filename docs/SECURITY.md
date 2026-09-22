# Controles y alcance de seguridad

## Contexto de esta revisión

Se usó `codex-security:security-scan` (auditoría Standard) sobre la copia local. La revisión inicial examinó el frontend con fixtures; sin backend ejecutable no podía validar autenticación, SQL, uploads o grader. El resultado inicial sin vulnerabilidades confirmadas no es una certificación del MVP futuro.

Se revisaron adicionalmente los nuevos módulos de autenticación, cliente HTTP, guards, configuración, modelos y controles de la API, con revisión independiente y pruebas locales. El estado final se registra en `IMPLEMENTACION-MVP.md`. La integración con credenciales reales y las fases aún no implementadas se señalan explícitamente como pendientes.

## Invariantes

- Identidad Firebase Admin validada para el proyecto dedicado, tokens revocados/desactivados rechazados, sin modo de autenticación falsa accesible desde HTTP.
- Correo verificado y allowlist activa antes de promoción. Identidad ligada al UID, no fusionada automáticamente por email.
- Roles y membresías en Postgres; autorización server-side por recurso/cohorte.
- SQL parametrizado; errores y logs no incluyen credenciales, tokens, códigos de clase o código de alumnos.
- CORS de orígenes explícitos; el frontend no recibe credenciales de servidor.
- Supabase `app`: RLS activo, sin policies públicas, `anon`/`authenticated` sin USAGE ni privilegios. Mantenerlo así.
- `avatars` privado y sin upload anónimo. No introducir SVG ni URLs firmadas persistidas.
- Los fixtures pedagógicos y la revisión local son únicamente desarrollo explícito, sin autoridad productiva.

## Inspección real de Supabase

Proyecto único `ttgjesbqmewenryjrxsm`. El 20-sep-2026 se verificaron 15 tablas con RLS, privilegios revocados y ninguna policy. Bucket privado, máximo 5 242 880 bytes, MIME JPEG/PNG/WebP. Sin cambios DDL ni datos de alumnos.

Security Advisor devuelve solo [RLS enabled no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), esperado para este acceso exclusivo del backend. Performance Advisor devuelve [unused index](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) en base nueva; no se eliminan esos índices.

## Límites todavía abiertos

Las cabeceras preparadas en Netlify incluyen `nosniff`, Referrer-Policy y Permissions-Policy. No se aplicó una CSP no probada: la aplicación combina Firebase/popup/iframe, fuentes externas y, en modo local, Monaco y preview. Una política completa debe contrastarse con esos recursos y con los flujos reales antes de deploy. No hay deploy en esta entrega.

Los límites de solicitudes actuales son por IP y por proceso, con memoria acotada. Un despliegue con varias réplicas requerirá coordinación del limitador y configuración explícita de proxies. Las credenciales Admin, revocación real, permisos efectivos del usuario PostgreSQL, TLS y carreras concurrentes de PostgreSQL necesitan pruebas de integración; las pruebas SQLite no las sustituyen.

La temporización del iframe de preview no es un límite de CPU que detenga bucles síncronos; mantenerlo exclusivamente para el código propio del editor. No usarlo para ejecutar entregas de otros alumnos o reemplazar Deno. `sandbox="allow-scripts"` sin `allow-same-origin` protege el origen padre.

No hay todavía validación de flujo real Firebase→FastAPI→Postgres, uploads, mapa con 403, submissions, grader ni permisos de los endpoints futuros. Esas superficies no deben considerarse aprobadas por la auditoría de autenticación. Ningún resultado unitario autoriza un despliegue.


## Resultado y artefactos del scan

Scan Standard `1d2d4ffa-99e0-4c6d-a7bd-5dded4ea9413` completado. **0 vulnerabilidades confirmadas; cobertura parcial.** Se revisó el frontend inicial y se añadieron dos paquetes sobre backend foundation/auth y cliente/sesión React. La integración real y fases futuras no están aprobadas.

**Limitación de instantánea:** Codex Security devolvió: “Working-tree contents changed while the scan was running; results were saved for the original snapshot.” La auditoría se inició antes de implementar. La revisión independiente adicional y las pruebas locales examinaron los archivos finales, pero el sello de la herramienta conserva la instantánea inicial. Por ello el checkpoint global se informa **SECURITY AUDIT: ISSUES (cobertura/instantánea pendientes)**, no PASS del MVP completo. No se inició un segundo scan ni se ocultó la advertencia.

- [Informe generado](<C:/Users/josue/AppData/Local/Temp/codex-security-scans-Fx759p/yo-no-lo-programe-en-html/0632e6be33441463eb7ff505da59aebbbcb7be00_20260921T033502Z_8oq3k9a4/report.md>)
- [Manifest canónico](<C:/Users/josue/AppData/Local/Temp/codex-security-scans-Fx759p/yo-no-lo-programe-en-html/0632e6be33441463eb7ff505da59aebbbcb7be00_20260921T033502Z_8oq3k9a4/scan-manifest.json>)
- [Findings canónicos](<C:/Users/josue/AppData/Local/Temp/codex-security-scans-Fx759p/yo-no-lo-programe-en-html/0632e6be33441463eb7ff505da59aebbbcb7be00_20260921T033502Z_8oq3k9a4/findings.json>)
- [Cobertura canónica](<C:/Users/josue/AppData/Local/Temp/codex-security-scans-Fx759p/yo-no-lo-programe-en-html/0632e6be33441463eb7ff505da59aebbbcb7be00_20260921T033502Z_8oq3k9a4/coverage.json>)

Los artefactos residen en el directorio temporal del workbench; no son archivos de la aplicación ni se generó el reporte manualmente. Medición reportada por el plugin (`codex_rollout`, cobertura completa, 6 tareas): 32472558 tokens totales; 31309184 tokens de entrada en caché; 151148 tokens de salida.
