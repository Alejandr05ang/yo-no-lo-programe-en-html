# frontend — React + Vite + TypeScript

## Correr

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
```

## Qué hay implementado

- Scaffold Vite (React 19 + TS) con React Router, TanStack Query y `@monaco-editor/react`.
- **Pantalla 1a del handoff** (`features/estudiante/VistaEstudiante.tsx`): vista principal del
  estudiante — encargo en prosa, editor Monaco con `datos.js` de solo lectura, consola, vista previa
  en `iframe` sandbox y panel de revisión automática. Con datos de ejemplo (`lib/mockEncargo.ts`),
  sin backend todavía.
- `lib/sandbox.ts`: ejecuta el código del estudiante en un `iframe` con `sandbox="allow-scripts"` y
  devuelve el HTML por `postMessage`. La implementación de la API en español
  (`crearElemento`, `agregarA`, `repetir`, `si`/`sino`, `obtenerDatos`) es **provisional** —
  pendiente D5 en `../docs/decisiones.md`.
- `lib/api.ts`: cliente HTTP tipado; hoy devuelve los mocks. Las firmas ya son las definitivas.

## Pendiente

- Variantes 1b / 1c del enunciado del reto (decisión C1 en `../docs/decisiones.md`).
- Pantallas 1d (instructor), 1e (mapa), 1f (onboarding), 1g (móvil / portafolio público).
- Cablear `lib/api.ts` al backend real.
- **Monaco se carga desde CDN (jsdelivr)** por defecto vía el loader de `@monaco-editor/react`.
  Para un taller sin internet fiable, self-hostear Monaco (`loader.config({ paths: { vs: '/vs' } })`
  + copiar `monaco-editor/min/vs` a `public/`).

## Reglas de diseño (de `../docs/design-handoff.md`)

- Todo sale de `src/styles/design-system.css` (copia de `design/styles.css`). Nunca hard-codear un
  hex, una fuente o un px que ya esté en las variables.
- No re-estilizar estados (hover, foco, disabled): ya vienen en el sistema.
- Organización por **feature**, no por tipo de archivo.
- Cuerpo de lectura a 15px (subido desde los 13px del mockup — única desviación esperada).
- Editar código es solo escritorio; <1024px se muestra el aviso "Editar código requiere computador".
