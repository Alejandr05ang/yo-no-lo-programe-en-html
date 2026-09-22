# Plataforma — Taller de Desarrollo Web para Principiantes

Plataforma web para un taller presencial de programación para principiantes (10 sesiones / 2 semanas,
~24 estudiantes por cohorte). Inspirada en *The Farmer Was Replaced*: el estudiante nunca escribe HTML
a mano; escribe **JavaScript** contra una API acotada en español que construye el DOM, y cada sesión
suma una pieza a un portafolio personal que al final se publica en una URL real. El aprendizaje se
descubre por **necesidad real** dentro del proyecto, no por instrucción directa.

## Estado del proyecto

**STATUS: READY FOR CLASSROOM USE.**

> **Para retomar el desarrollo, lee primero [AI_HANDOFF.md](AI_HANDOFF.md).** Contiene el detalle
> operativo: arquitectura que no debe romperse, flujos de alumno y administrador, orden de
> despliegue, QA y decisiones pendientes. Este README solo da la vista general.

Arquitectura vigente: **Firebase Auth → FastAPI → Supabase PostgreSQL**, con acceso a datos
exclusivamente desde el backend. Firebase solo maneja identidad.

En producción: <https://tutorias-de-verano.web.app>

| Área | Estado |
|---|---|
| Autenticación y sesión persistente | PASS |
| Panel de administración | PASS |
| Unión a clase por código | PASS |
| Gating de sesiones (servidor) | PASS |
| Persistencia de perfil | PASS |
| Persistencia de la demo | PASS |
| E2E en producción con alumno real | PASS |

Verificado contra producción: un administrador abre un día, el alumno lo ve y entra, los días
posteriores siguen bloqueados también en el backend, y el progreso y el perfil quedan en
PostgreSQL. El plan y los límites de la entrega original están en
[docs/IMPLEMENTACION-MVP.md](docs/IMPLEMENTACION-MVP.md).

- Firebase dedicado: `tutorias-de-verano` (creado para este proyecto).
- Supabase existente: `Tutorias-de-Verano`, ref `ttgjesbqmewenryjrxsm`, schema `app`, bucket `avatars` privado.
- Configuración y credenciales pendientes: [Firebase](docs/FIREBASE-SETUP.md) y
  [desarrollo local](docs/LOCAL-DEVELOPMENT.md). Nunca colocar secretos servidor en `VITE_*`.
- El frontend anterior y FASE A se conservan como ejercicios locales de desarrollo explícito.
  Sus fixtures no sirven como autenticación, progreso ni evaluación de producción.

### Historial

Los puntos siguientes describen el trabajo previo y se conservan como registro. Las propuestas
antiguas de SQLite y login propio quedan sustituidas por [la arquitectura vigente](docs/ARQUITECTURA-BACKEND.md).

- ✅ Brief de producto y diseño de alta fidelidad (7 pantallas) — en `docs/` y `design/`.
- ✅ Stack y arquitectura decididos — ver `docs/arquitectura.md`.
- ✅ `frontend/` scaffold + pantallas **1a** (estudiante), **1e** (mapa `/mapa`), **1d**
  (instructor `/bitacora`, sin rol todavía), **1f** (`/entrar`, diagnóstico), **1g** (vista de
  consulta para equipos sin teclado/mouse real — no por ancho de ventana, ver
  `docs/design-handoff.md` §1g) y **bienvenida diaria** (`/bienvenida`), con datos de ejemplo
  (solo desarrollo con `VITE_ENABLE_LOCAL_EXERCISES=true`).
- ✅ Progresión de 11 encargos, herencia de código entre encargos, andamiaje narrativo real para
  los 11 (antes placeholder genérico en 4-11), "Mis datos", fichas de ayuda, avance automático
  al aceptar. Flujo de entrada: `/inicio` (primera vez de todas) → `/entrar` (diagnóstico) →
  portafolio; `/bienvenida` la primera vez de cada día; recargar no interrumpe.
- ⬜ Pantallas 1b/1c (variantes del reto).
- 🟡 Bugs menores conocidos (solo dev / no bloquean) — ver `docs/decisiones.md` §"Bugs conocidos".
- ✅ Base FastAPI y cliente de autenticación; pruebas aisladas. Falta validación con credenciales reales.
- ⬜ Perfil, avatar, cohortes, mapa, administración, progreso, entregas y autograder Deno.

## Desarrollo local actual

Configura `backend/.env` a partir de su ejemplo sin sobrescribir archivos existentes. Necesita
`DATABASE_URL` del Supabase autorizado, `FIREBASE_PROJECT_ID=tutorias-de-verano` y una credencial
Admin/ADC externa al repositorio. `frontend/.env.local` contiene únicamente configuración pública
Firebase y `VITE_API_URL`; en otra computadora usa `frontend/.env.example`.

```powershell
# Terminal 1, desde backend/
uv sync --locked
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --no-access-log

# Terminal 2, desde frontend/
npm ci
npm run dev
```

Proveedores Firebase y pasos exactos: [FIREBASE-SETUP](docs/FIREBASE-SETUP.md).
Alternativa local de uv, TLS y pruebas: [LOCAL-DEVELOPMENT](docs/LOCAL-DEVELOPMENT.md).
Sin credenciales, `/health` informa `database: not_configured`; no implica conexión real.

## Por dónde empezar

| Si quieres… | Abre |
|---|---|
| Entender el **producto** (fuente de verdad) | `docs/brief.md` |
| Entender el **diseño visual** y las 7 pantallas | `docs/design-handoff.md`, luego abre `design/Plataforma Taller.dc.html` en un navegador |
| Entender **cómo se va a construir** | `docs/arquitectura.md` |
| Ver la **progresión de encargos** y el API del estudiante | `docs/encargos.md` |
| Ver **qué está decidido y qué no** | `docs/decisiones.md` |
| Implementar el **backend** (propuesta de arquitectura) | `docs/backend-propuesta.md` |
| Los **tokens del design system** (reutilizables tal cual) | `design/styles.css` + `design/design-system/readme.md` |

## Estructura del repo

```
docs/
  brief.md            Brief de producto — manda ante cualquier duda de producto
  design-handoff.md   Guía visual: las 7 pantallas, el design system, comportamiento
  arquitectura.md     Stack, patrón de arquitectura, estructura de carpetas, deploy
  decisiones.md       Registro de decisiones (cerradas y pendientes)
  backend-propuesta.md Propuesta de arquitectura de backend (BaaS + servicio de autograder) — a confirmar
design/
  Plataforma Taller.dc.html   Los 7 mockups (1a–1g) en un lienzo con zoom/pan
  styles.css                  Design system Classical — tokens y clases, reutilizable
  support.js                  Runtime de la herramienta de diseño — NO llevar al proyecto
  design-system/              Guía del sistema Classical
  canvas-preview.webp         Miniatura del lienzo
backend/            FastAPI + SQLAlchemy async + PostgreSQL; Firebase Admin
frontend/           React + Vite + TS (esqueleto)
```

## Stack (resumen — detalle en `docs/arquitectura.md`)

- **Backend:** FastAPI + PostgreSQL gestionado por Supabase, SQLAlchemy async/asyncpg, Python.
- **Frontend:** React + Vite + TypeScript, editor Monaco, TanStack Query.
- **Autograder:** endpoint FastAPI que ejecuta el código del estudiante en un subproceso **Deno** aislado.
- **Vista previa y portafolios publicados:** `iframe` con `sandbox` + `postMessage`, sin servidor.
- **Auth:** Firebase Email/Password y Google; código de cohorte como paso posterior de autorización.
- **Deploy:** backend en Fly.io/Railway (Docker con Python + Deno), frontend estático.
