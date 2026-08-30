# Arquitectura

> Fecha: 2026-08-30. Este documento fija el stack y el patrón de arquitectura.
> Si algo aquí contradice `brief.md`, manda el brief en lo de producto; este documento manda en lo técnico.
> Las alternativas descartadas se registran para no volver a discutirlas sin motivo nuevo.

## 1. Contexto que condiciona las decisiones

- Equipo con experiencia en **FastAPI** (lo más fuerte), React, Angular, Spring Boot, JS/HTML/CSS a mano.
- **Poco tiempo** antes de que arranque el taller.
- Se quiere **reutilizar** en cohortes futuras.
- Escala real: decenas de usuarios concurrentes por cohorte (taller presencial → todos entran a la vez).
- Restricción de producto (brief §2.3, §2.5): **los casos de prueba y la evaluación viven en el servidor.**
  El cliente nunca debe poder leer los casos ocultos, sus tamaños ni la solución.

## 2. Stack

| Capa | Elección | Motivo | Alternativas descartadas |
|---|---|---|---|
| Backend | **FastAPI + SQLite** (SQLAlchemy / SQLModel) | Es lo que mejor maneja el equipo. SQLite basta para decenas de usuarios por cohorte; migrar a Postgres luego es cambio menor con SQLAlchemy | SvelteKit+SQLite y Node(Fastify/Hono)+SPA: nadie en el equipo los conoce y hay prisa |
| Frontend | **React + Vite + TypeScript** + React Router | Ya lo conocen; más liviano de montar que Angular bajo presión; más material y ejemplos | Angular: más ceremonia para arrancar. Svelte: nuevo para el equipo |
| Editor de código | **Monaco** vía `@monaco-editor/react` | Componente drop-in, carga por loader sin pelear con la config de Vite. El handoff aprueba Monaco o CodeMirror 6 | CodeMirror 6: más liviano pero hay que ensamblarlo pieza por pieza; sin tiempo para eso |
| Estado de servidor en el front | **TanStack Query** | Autoguardado, polling del dashboard, resultado del autograder — patrones que Query resuelve con poco código | Redux/estado a mano: más boilerplate |
| Autograder (ejecución) | Subproceso **Deno** (`deno run --deny-all`) con timeout | Aísla a nivel de SO sin config; cubre disco/red/proceso y bucles infinitos. FastAPI le pasa `{código, datos, casos}` por stdin y parsea JSON de vuelta | `isolated-vm` en Node: requeriría meter Node al backend Python. `eval`/`exec`: prohibido |
| DOM del autograder | **linkedom** dentro del script de Deno | Implementación de DOM en JS puro, rápida, corre dentro del subproceso aislado | jsdom: más pesado |
| Vista previa (editor) | `iframe` con `sandbox` + `postMessage` | Cero servidor. El código del estudiante corre en el navegador del propio estudiante | Ejecutar en la ventana principal: prohibido |
| Portafolios publicados | Ruta que sirve el código guardado; render **en el navegador del visitante** en `iframe` sandbox | Una versión canónica por estudiante; el visitante solo lee | — |
| Deploy | Backend en **Fly.io o Railway** (imagen Docker con Python **+ Deno**); frontend estático (mismo host o Netlify) | Un solo contenedor para backend+grader; frontend estático se despliega en cualquier lado | Vercel para el backend: sus funciones serverless no sirven para lanzar el subproceso del grader |

**Lo único genuinamente nuevo para el equipo es Deno**, y su rol es minúsculo: recibe código por stdin, corre, imprime resultado JSON.

## 3. Patrón de arquitectura

**Capas pragmáticas, con puertos/adaptadores solo en las costuras que van a cambiar.**
Hexagonal completo (un puerto por dependencia, DTOs en cada capa) frena bajo presión de tiempo y no
compra nada en una app de este tamaño.

### 3.1 Qué SÍ se aísla

1. **El ejecutor del autograder.** Hoy es un subproceso Deno; mañana podría ser un contenedor por
   corrida, `isolated-vm` o una cola. Va detrás de un puerto (`Protocol` de Python):
   `ejecutar(codigo, datos, casos) -> Resultado`. El resto del sistema no sabe qué hay debajo.
2. **La lógica de dominio de revisión y desbloqueo:** reglas de desbloqueo por día, generación de
   casos ocultos (tamaños variables: 3 / 14 / 40 / 0), y aserciones sobre el DOM resultante.
   Código **puro**, sin `import fastapi` ni SQLAlchemy. Es el corazón de la defensa anti-IA del brief
   y necesita batería de tests unitarios; que sea puro es lo que lo hace testeable.

### 3.2 Qué NO lleva ceremonia

Auth, guardar código, intentos, checkpoints, parejas, diagnóstico: CRUD. `router → service →
repository` y listo. Sin mapear entidades ORM ↔ dominio ↔ DTOs en los caminos triviales.

### 3.3 Qué NO se hace

- Nada de DDD con agregados, CQRS ni event sourcing.
- No un puerto por cada dependencia — solo ejecutor y (quizá) envío de correo.
- No re-estilizar componentes por pantalla: los estados (hover, foco, disabled) ya vienen en el
  design system (`design/styles.css`).

## 4. Estructura de carpetas

### Backend (`backend/`)

```
app/
  main.py
  config.py
  api/
    deps.py               dependencias FastAPI (sesión DB, usuario actual, rol)
    routes/
      auth.py             registro (correo + código de cohorte), login, activación
      encargos.py         encargo del día, API desbloqueada, condiciones de aceptación
      entregas.py         autoguardado + "entregar a revisión" (dispara autograder)
      portafolios.py      servir portafolio publicado (solo lectura)
      instructor.py       dashboard, checkpoints, parejas, cohortes
  services/               casos de uso — orquestan dominio + repos + adapters
    revision.py           recibe una entrega, llama al ejecutor, guarda resultado
    autoguardado.py
    desbloqueo.py
    checkpoints.py
  domain/                 PURO — sin imports de framework, con tests
    calendario.py         las 10 sesiones, qué API/encargo desbloquea cada día
    encargo.py            modelo de encargo y sus condiciones de aceptación
    revision/
      casos.py            generación de casos ocultos de tamaño variable
      aserciones.py       verificación del DOM (conteo, caso vacío, no-hardcode)
    parejas.py            formación de parejas/tríos desde el diagnóstico
  adapters/               ← la costura que importa
    ejecutor/
      base.py             Protocol Ejecutor (puerto)
      deno.py             implementación con subproceso Deno
    correo.py
  repositories/           acceso a datos con SQLAlchemy, un módulo por entidad
  db/
    models.py
    session.py
    migrations/           alembic
grader/                   lo que corre DENTRO de Deno (JS/TS, no Python)
  grader.js               entrypoint: lee stdin, monta linkedom + la API en español, ejecuta, asevera
  api_estudiante.js       implementación de crearElemento/agregarA/obtenerDatos/repetir/si-sino
tests/
  domain/                 el grueso de los tests
  api/                    smoke tests de los endpoints
pyproject.toml
Dockerfile                base Python + instala Deno
```

### Frontend (`frontend/`)

```
src/
  main.tsx
  router.tsx
  lib/
    api.ts               cliente fetch tipado
    sandbox.ts           helpers de iframe sandbox + postMessage (preview y portafolios)
  features/
    encargo/             columna izquierda de la vista del estudiante (variantes 1a/1b/1c)
    editor/              Monaco + tira de pestañas + consola + barra de acciones
    preview/             iframe sandbox con la vista previa en vivo
    revision/            panel de revisión automática (N/4 casos, tags pasa/falla)
    mapa/                mapa de progreso de 2 semanas (1e)
    instructor/          dashboard del instructor (1d)
    onboarding/          entrada + diagnóstico inicial (1f)
    portafolio-publico/  lo que ve un visitante (1g vista B) + "visitar vecinos"
  components/             primitivos compartidos mapeados a .btn / .tag / .card / .nav / .table
  styles/                el design system del handoff, intacto
index.html
vite.config.ts
```

## 5. Autenticación — correo + código de cohorte

- El estudiante se registra con su **correo** (identidad recuperable) pero necesita un **código de
  cohorte** para entrar. Sin código no hay acceso.
- El instructor solo reparte un código en clase — cero CSV, cero infra de correo obligatoria.
- Sigue siendo cohorte-acotada: el desbloqueo por día, las parejas y el dashboard funcionan sobre
  una cohorte conocida.
- El sandbox de ejecución sigue siendo *de facto* privado: solo entra quien recibió el código.
- Reutilizable sin esfuerzo: taller nuevo = código nuevo.
- Roles: `estudiante` / `instructor`.
- **Descartado:** registro totalmente abierto (solo correo, sin código). Solo tendría sentido como
  plataforma pública, y entonces habría que presupuestar rate-limiting, cuotas de recursos, captcha y
  moderación por la superficie de ejecución de código arbitrario expuesta a internet.

## 6. Estado del portafolio para visitantes ("visitar portafolios de vecinos")

- Las ediciones de un visitante (agregar hobby, comentario) viven **solo en el navegador del
  visitante** (`localStorage` con clave = slug del portafolio). Al recargar en otro navegador, no
  están. **Sin persistencia en el backend** (brief §2.2, §2.6).
- Esto es suficiente para el objetivo pedagógico: el "+ Agregar hobby" existe para forzar que el
  código de render del estudiante **generalice** a contenido que no existía cuando se escribió el
  código. Que se guarde o no es irrelevante para ese objetivo.
- "Visitar vecinos" = galería de solo lectura; cada portafolio corre en su `iframe` sandbox.
- **Si más adelante se quiere interacción social real** (feedback entre estudiantes), que sea una
  función **aparte y explícita** — "dejar un comentario" moderado por el dueño del portafolio — no
  mezclada con el ejercicio de agregar hobby.
- **Pendiente de confirmar con el equipo del taller:** ver `decisiones.md`.

## 7. Cabos sueltos técnicos (detalle de implementación, no de arquitectura)

- **Límite de memoria del subproceso Deno** y comportamiento ante OOM.
- **Shim de DOM** exacto (`linkedom`) y qué subconjunto de la API en español expone el grader.
- **SQLite en hosts con disco efímero** (Railway/Fly por defecto) necesita un volumen persistente.
- **Monaco pesa ~2 MB** — irrelevante: editar es solo en escritorio (el móvil es de consulta, brief §1g).
- Verificación del deploy final del estudiante (Git/Vercel) — módulo de cierre, brief §5.9.
