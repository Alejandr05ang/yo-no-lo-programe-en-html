# Desarrollo local

## Requisitos

Node 22 o 24; Python 3.12–3.14; `uv`. Las dependencias quedan fijadas en `frontend/package-lock.json` y `backend/uv.lock`. No ejecutar `npm audit fix --force`.

La terminal de esta sesión no tenía Python ni uv en PATH. Se usó el Python incluido con Codex y se dejó una copia local de uv en `backend/.tools/bin/uv.exe` (ignorada por Git). En otra computadora puedes [instalar uv](https://docs.astral.sh/uv/getting-started/installation/) y utilizar los comandos estándar siguientes.

## Backend

Desde `backend/`:

```powershell
uv sync --locked
Copy-Item .env.example .env
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --no-access-log
```

Copia el ejemplo solo si no existe tu `.env`; no sobrescribas credenciales ya configuradas. En esta computadora, sustituye `uv` por `& ./.tools/bin/uv.exe` cuando no esté en PATH. El servicio registra rutas normalizadas y estado; `--no-access-log` evita que Uvicorn registre URLs crudas con datos sensibles.

Sin credenciales, `/health` permite comprobar que el servidor arrancó y comunica que la base no está configurada. Esto no significa que el backend esté conectado ni que Firebase funcione end-to-end.

Configura en `backend/.env`:

- `APP_ENV=development`.
- `APP_ORIGIN=http://localhost:5173` (debe coincidir exactamente con la URL del navegador).
- `FIREBASE_PROJECT_ID=tutorias-de-verano`.
- `DATABASE_URL`: cadena PostgreSQL de servidor del proyecto Supabase `ttgjesbqmewenryjrxsm`, con driver `postgresql+asyncpg`. Obtén los datos reales en **Connect** del dashboard. Usa conexión directa si dispones de IPv6 o **Session pooler** para un backend persistente en IPv4. No inventes el host pooler ni resetees la contraseña de la DB para continuar.
- `GOOGLE_APPLICATION_CREDENTIALS`: ruta absoluta al JSON Admin externo al repo, o ADC compatible ya configurado. Ver `FIREBASE-SETUP.md`.

La conexión usa validación TLS; si el certificado lo requiere, descarga el CA del proyecto y configura `DATABASE_SSL_CA_FILE`. No desactives la comprobación TLS para sortear errores.

El conector Supabase puede inspeccionar el schema, pero no entrega por ello una contraseña de Postgres al proceso FastAPI. Completa localmente la variable y comparte únicamente que está lista; no el secreto.

## Frontend

Desde `frontend/`:

```powershell
npm ci
npm run dev
```

`frontend/.env.local` ya contiene la configuración web real del Firebase dedicado y `VITE_API_URL=http://localhost:8000/api`. Reinicia Vite después de cambiar variables. En otra computadora utiliza `.env.example` y recupera la config web desde Firebase → Configuración → Tus apps.

El flujo productivo empieza en autenticación. La zona antigua de ejercicios y bitácora ficticia solo debe habilitarse explícitamente en desarrollo mediante `VITE_ENABLE_LOCAL_EXERCISES=true`; no equivale a una cuenta o cohorte real. Al construir para producción esa zona y las revisiones locales deben quedar fuera del bundle.

## Checks

```powershell
# backend/
uv run pytest
uv run ruff check .

# frontend/
npm test
npm run build
npm run lint
```

Los tests de DB usan SQLite únicamente como fixture aislado para comprobar comportamiento; la API normal acepta PostgreSQL. Los tests de Firebase inyectan un verificador mediante overrides de tests, no un bypass en producción. La validación de PostgreSQL real, providers y credenciales sigue siendo un checkpoint separado.

## Integración posterior

Para avatar se necesitará también el secreto de servidor Supabase, obtenido en **Project Settings → API Keys**, guardado exclusivamente en el backend. El cliente nunca recibe esa clave. No es necesario proporcionarlo hasta implementar Storage.

Todavía no ejecutar seeds, migraciones ni despliegues automáticamente: el schema `app` ya existe y la primera integración requiere comprobarlo con credenciales reales. No recrear tablas, abrir policies ni insertar alumnos/cohortes de ejemplo.
