# frontend — React + Vite + TypeScript

Aún sin inicializar. La estructura de carpetas objetivo está en
[`../docs/arquitectura.md`](../docs/arquitectura.md) §4.

## Arranque previsto

```bash
# desde la raíz del repo
npm create vite@latest frontend -- --template react-ts
cd frontend
npm i @monaco-editor/react @tanstack/react-query react-router-dom
```

Puntos clave (ver `arquitectura.md` y `../docs/design-handoff.md`):

- Copiar `design/styles.css` a `src/styles/` y **tomar todo** de sus variables CSS
  (`var(--color-*)`, `var(--font-*)`, `var(--space-*)`…). Nunca hard-codear un hex, una fuente o un px.
- No re-estilizar estados (hover, foco, disabled): ya vienen en el design system.
- Organización por **feature**, no por tipo de archivo.
- `lib/sandbox.ts` centraliza el `iframe` con `sandbox` + `postMessage`; nunca `eval` en la ventana principal.
- Subir el cuerpo de lectura a 15–16px en la vista real del estudiante (única desviación esperada del mockup).
- Editar código es solo escritorio; <1024px se sirve la vista de consulta móvil (1g).
