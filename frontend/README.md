# frontend — React + Vite + TypeScript

## Correr

```bash
npm ci
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm test
npm run lint
```

## Qué hay implementado

- React 19, TypeScript, React Router y TanStack Query; conserva el sistema visual Classical.
- `features/auth/`: acceso por correo/Google, registro, verificación, recuperación, linking y
  guards que consumen el estado del backend. El servidor decide roles y onboarding.
- `lib/http.ts`: cliente único para FastAPI; Bearer token, renovación una vez ante 401,
  cancelación y aislamiento de respuestas entre cuentas. `lib/firebase.ts` usa solo Auth.
- Las pantallas del portafolio, mapa local y bitácora ficticia se conservan detrás de
  `VITE_ENABLE_LOCAL_EXERCISES=true`, únicamente durante desarrollo. Los imports de esa rama
  quedan fuera del build productivo. `lib/api.ts` y `revisionLocal.ts` pertenecen a ese modo.
- El editor conserva FASE A, JavaScript acumulativo E1–E11 y la API pedagógica en español.
  Su `iframe` tiene `sandbox="allow-scripts"` sin acceso al origen padre.

Configura las variables públicas de `.env.example` en `.env.local` (ignorado por Git).
La configuración real del proyecto dedicado ya existe en esta computadora. No colocar
secretos de DB, Supabase ni Firebase Admin en variables `VITE_*`.
Consulta [configuración Firebase](../docs/FIREBASE-SETUP.md) y
[desarrollo local](../docs/LOCAL-DEVELOPMENT.md) para iniciar FastAPI.

## Pendiente

- Validar Firebase → FastAPI → Postgres con credenciales reales. Las pruebas unitarias
  y el build no demuestran ese flujo.
- Administración, progreso, entregas y backend educativo. Perfil/avatar, unión a clase y mapa con teasers ya están integrados con FastAPI.
  Las rutas reservadas muestran su estado pendiente; no representan funciones completas.
- **Monaco se carga desde CDN (jsdelivr)** por defecto vía el loader de `@monaco-editor/react`.
  Para un taller sin internet fiable, self-hostear Monaco (`loader.config({ paths: { vs: '/vs' } })`
  + copiar `monaco-editor/min/vs` a `public/`).

## Reglas de diseño (de `../docs/design-handoff.md`)

- Todo sale de `src/styles/design-system.css` (copia de `design/styles.css`). Nunca hard-codear un
  hex, una fuente o un px que ya esté en las variables.
- No re-estilizar estados (hover, foco, disabled): ya vienen en el sistema.
- Organización por **feature**, no por tipo de archivo.
- Cuerpo de lectura a 15px (subido desde los 13px del mockup — única desviación esperada).
- La vista de consulta del editor sigue la capacidad de teclado/mouse definida en el handoff.
