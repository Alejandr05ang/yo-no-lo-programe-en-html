# Arquitectura vigente del backend

La misión actual tiene prioridad sobre las propuestas anteriores de SQLite y login propio.

```text
React → Firebase Auth (identidad)
React → Bearer Firebase ID token → FastAPI → Supabase PostgreSQL, schema app
                                     └──→ Supabase Storage privado (fase posterior)
                                     └──→ Deno aislado (después de demo validada)
```

Firebase no almacena perfiles ni progreso. FastAPI verifica tokens para el proyecto dedicado `tutorias-de-verano`; Postgres decide roles. La aplicación nunca utiliza Supabase Auth ni consulta tablas desde React. RLS y privilegios revocados protegen el Data API; no sustituyen la autorización de FastAPI, cuyo usuario de DB necesita acceso de servidor al schema `app`.

## Primera entrega de integración

API FastAPI, configuración por entorno, health, transacciones SQLAlchemy async, verificación Firebase Admin inyectable en tests y bootstrap por UID. Los modelos se contrastan con `SUPABASE-SCHEMA.json` y `SUPABASE-INDEXES.json`, obtenidos del proyecto real antes de implementar. No se recrean tablas al arrancar.

Las credenciales de DB y Firebase Admin deben configurarse antes de validar una sesión end-to-end. El código y tests de armazón no son una demo terminada. El plan completo y sus fases pendientes están en `IMPLEMENTACION-MVP.md`.

## Fronteras de autorización

- El token es la única fuente de UID/email/verificación/proveedor. Un payload de React no puede asignar identidad o rol.
- `admin_allowlist.active` y email verificado habilitan promoción admin. El rol de Postgres se consulta en el servidor, sin autoridad de custom claims.
- Un instructor necesita membresía activa de instructor para la cohorte concreta. El rol global por sí solo no concede acceso a otras cohortes.
- Un alumno accede a su propio perfil/progreso/entregas. Las próximas rutas deben reutilizar estas dependencias.
- Los guards React organizan navegación; no conceden permiso para datos.

## Persistencia y operaciones posteriores

El schema remoto tiene 15 tablas con RLS y sin policies públicas. `challenge_overrides` es actualmente por cohorte/reto, no por estudiante; una futura necesidad individual requiere migración explícita. El seed deberá salir de FASE A local y ser idempotente. No hay seed de cohortes ni alumnos ficticios.

Storage `avatars` permanece privado (5 MB JPEG/PNG/WebP). Su integración futura valida tamaño, decodifica, limita píxeles, reencodifica y guarda únicamente ruta interna; devuelve URL firmada temporal. Ninguna policy pública se necesita.

El autograder sigue pendiente. El preview local de FASE A no se considera evaluación confiable: la entrega real debe usar proceso Deno con permisos denegados y límites de CPU/tiempo/salida, después de validar la demo.
