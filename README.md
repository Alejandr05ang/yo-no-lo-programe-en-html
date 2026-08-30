# Plataforma — Taller de Desarrollo Web para Principiantes

Plataforma web para un taller presencial de programación para principiantes (10 sesiones / 2 semanas,
~24 estudiantes por cohorte). Inspirada en *The Farmer Was Replaced*: el estudiante nunca escribe HTML
a mano; escribe **JavaScript** contra una API acotada en español que construye el DOM, y cada sesión
suma una pieza a un portafolio personal que al final se publica en una URL real. El aprendizaje se
descubre por **necesidad real** dentro del proyecto, no por instrucción directa.

## Estado del proyecto

**Fase: frontend arrancado, backend pendiente.**

- ✅ Brief de producto y diseño de alta fidelidad (7 pantallas) — en `docs/` y `design/`.
- ✅ Stack y arquitectura decididos — ver `docs/arquitectura.md`.
- ✅ `frontend/` scaffold + **pantalla 1a** funcionando con datos de ejemplo (`cd frontend && npm i && npm run dev`).
- ⬜ Pantallas 1b–1g.
- ⬜ Andamiaje de `backend/` (FastAPI) y el autograder (Deno).
- ⬜ Cablear frontend ↔ backend.

## Por dónde empezar

| Si quieres… | Abre |
|---|---|
| Entender el **producto** (fuente de verdad) | `docs/brief.md` |
| Entender el **diseño visual** y las 7 pantallas | `docs/design-handoff.md`, luego abre `design/Plataforma Taller.dc.html` en un navegador |
| Entender **cómo se va a construir** | `docs/arquitectura.md` |
| Ver la **progresión de encargos** y el API del estudiante | `docs/encargos.md` |
| Ver **qué está decidido y qué no** | `docs/decisiones.md` |
| Los **tokens del design system** (reutilizables tal cual) | `design/styles.css` + `design/design-system/readme.md` |

## Estructura del repo

```
docs/
  brief.md            Brief de producto — manda ante cualquier duda de producto
  design-handoff.md   Guía visual: las 7 pantallas, el design system, comportamiento
  arquitectura.md     Stack, patrón de arquitectura, estructura de carpetas, deploy
  decisiones.md       Registro de decisiones (cerradas y pendientes)
design/
  Plataforma Taller.dc.html   Los 7 mockups (1a–1g) en un lienzo con zoom/pan
  styles.css                  Design system Classical — tokens y clases, reutilizable
  support.js                  Runtime de la herramienta de diseño — NO llevar al proyecto
  design-system/              Guía del sistema Classical
  canvas-preview.webp         Miniatura del lienzo
backend/            FastAPI + SQLite (esqueleto)
frontend/           React + Vite + TS (esqueleto)
```

## Stack (resumen — detalle en `docs/arquitectura.md`)

- **Backend:** FastAPI + SQLite (SQLAlchemy), Python.
- **Frontend:** React + Vite + TypeScript, editor Monaco, TanStack Query.
- **Autograder:** endpoint FastAPI que ejecuta el código del estudiante en un subproceso **Deno** aislado.
- **Vista previa y portafolios publicados:** `iframe` con `sandbox` + `postMessage`, sin servidor.
- **Auth:** correo + código de cohorte.
- **Deploy:** backend en Fly.io/Railway (Docker con Python + Deno), frontend estático.
