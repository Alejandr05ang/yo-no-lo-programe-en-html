# Backend de Tutorías de Verano

FastAPI es la autoridad; Firebase Admin verifica identidad y PostgreSQL conserva
usuarios y permisos. El navegador no consulta tablas de Supabase.

## Estado implementado

Fases 1–2: `GET /health`, `POST /api/auth/bootstrap`, `GET /api/me` y
`GET /api/me/onboarding`. Ya existen rutas de perfil, avatar privado, join y mapa; admin, progreso,
submissions ni grader todavía. Las 15 tablas existentes están modeladas para continuar.
Sin `DATABASE_URL` y credenciales Admin reales no se afirma integración end-to-end.

## Desarrollo

Python 3.12 o posterior y uv. Desde `backend/`:

```powershell
uv sync --locked
Copy-Item .env.example .env
uv run uvicorn app.main:app --reload --no-access-log
uv run pytest
uv run ruff check .
```

Usar `--no-access-log`: el access log del servidor incluye la URL cruda. El middleware
registra JSON con ruta parametrizada, status, actor UUID y duración, sin query string,
tokens, cuerpos ni mensajes de excepciones.

Esta sesión tiene uv aislado en `.tools/bin/uv.exe` y Python en `.venv/Scripts/python.exe`.
Son herramientas ignoradas por Git. Los paquetes transitivos Firestore/Storage son
del SDK oficial Firebase Admin; esta aplicación no inicializa ni utiliza esos servicios.

Pasos y valores pendientes: [LOCAL-DEVELOPMENT](../docs/LOCAL-DEVELOPMENT.md) y
[FIREBASE-SETUP](../docs/FIREBASE-SETUP.md). Nunca pegar una clave privada en el chat.

## Configuración y límites

- `.env` es exclusivamente del servidor y queda ignorado por Git.
- Arranca sin secretos. `/health` indica `database: not_configured`; es liveness,
  no una afirmación de que autenticación o DB estén operativas.
- DB configurada e inaccesible devuelve health 503 sin URL ni error del driver.
- Sólo PostgreSQL/asyncpg en runtime. TLS verifica certificado y hostname siempre.
  Usar conexión directa o pooler **session** de Supabase. No está validado el modo
  transaction. Quitar parámetros de URL; usar `DATABASE_SSL_CA_FILE` para una CA.
- CORS acepta únicamente `APP_ORIGIN`, sin wildcard ni cookies de autenticación.
- Cuerpo máximo 6 MiB, incluso streaming sin Content-Length.
- Límites por IP: 20 solicitudes/minuto en `/api/auth/*`, 120/minuto en el resto de
  `/api/*`. Memoria limitada a 10 000 claves; saturación cierra acceso temporalmente.
  Son límites de un worker. Para varios workers/replicas añadir limitador compartido.
  No confiar en `X-Forwarded-For` arbitrario; configurar proxy/servidor explícitamente.

## Identidad y permisos

Firebase ID token Bearer, proyecto explícito y `check_revoked=True`; trabajo bloqueante
fuera del event loop. Emulador rechazado en cualquier entorno de runtime. Las pruebas
inyectan únicamente la dependencia `get_token_verifier`.

UID único identifica al usuario; email normalizado no reasigna identidades. Bootstrap
usa transacción, savepoint y constraints existentes para resolver duplicados.
`role`, `email_verified`, UID, email e `is_active` nunca proceden del body.

El correo verificado actual se consulta contra la allowlist activa en cada petición.
Un admin con correo cambiado, sin verificar o sin entrada activa recibe
`ADMIN_IDENTITY_REVALIDATION_REQUIRED`; el rol guardado no se elimina. No existe
endpoint para revocar admins. Así un token nuevo no hereda privilegios asociados
al correo anterior sin revalidarlos.

`get_current_user`, `require_role` y `require_cohort_access` centralizan los controles.
Un instructor necesita membresía activa de instructor en su cohorte; admin tiene
acceso global. Futuras rutas deben usar estas dependencias. Staff verificado con
perfil completo no necesita unirse como alumno para estado READY.

## Baseline de Alembic

Supabase `ttgjesbqmewenryjrxsm` ya tiene schema `app`, enums, RLS e índices. Referencias
leídas: `docs/SUPABASE-{SCHEMA,INDEXES,CONSTRAINTS}.json`. `0001_existing_schema` es
**sólo un marcador** sin DDL de aplicación; no provisiona una base vacía. No se ejecutó
migration ni stamp contra Supabase durante esta fase.

Cuando exista conexión autorizada, comparar catálogo vivo, snapshots y modelos antes
de registrar baseline:

```powershell
uv run alembic stamp 0001_existing_schema
```

Ese comando escribe `app.alembic_version`; no sirve para crear tablas. Cambios nuevos
requieren una revisión Alembic inspeccionada. Autogenerate no modela RLS, policies,
funciones o triggers; revisarlas manualmente. No añadir policies públicas, desactivar
RLS ni otorgar acceso a anon/authenticated.

## Alcance de las pruebas

Persistencia usa SQLite **sólo en tests**, cuatro tablas de auth y schema_translate_map.
Valida servicios, constraints de identidad y contratos HTTP; no equivale a validar
TLS, roles, RLS o concurrencia real PostgreSQL. Firebase sustituye únicamente la
frontera externa de red. La integración real está pendiente de credenciales.
