# Registro de decisiones

Estado: ✅ cerrada · 🟡 propuesta (a confirmar con el equipo del taller) · ⬜ pendiente

## Producto (del brief §6 — cerradas)

| # | Decisión | Estado |
|---|---|---|
| P1 | Lenguaje real: JavaScript. HTML como salida del DOM, nunca escrito a mano | ✅ |
| P2 | El sistema de niveles se traduce en "necesidad real" + desbloqueo por día, no en instrucciones tipo "usa un for" | ✅ |
| P3 | Nombres de funciones/métodos descriptivos en español, sin ofuscación (`crearElemento`, `agregarA`, `obtenerDatos`, `repetir`, `si`/`sino`) | ✅ |
| P4 | Defensa anti-IA vía evaluación (tests ocultos + checkpoints orales + depuración), no vía dificultar la lectura | ✅ |
| P5 | Portafolio incremental y acumulativo (currículo en espiral), no bloques separados por tema | ✅ |
| P6 | Diagnósticos inicial y final: los provee el equipo del taller; la plataforma solo los presenta y guarda | ✅ |
| P7 | Minijuegos ("platino"): opcionales, fuera del flujo obligatorio, con su propio desbloqueo | ✅ |
| P8 | Vocabulario: se llama **encargo** al nivel/ejercicio; el estudiante nunca lee "usa un for". Toda la UI en español | ✅ |

## Técnicas (de `arquitectura.md` — cerradas)

| # | Decisión | Estado |
|---|---|---|
| T1 | Backend: FastAPI + SQLite (SQLAlchemy) | ✅ |
| T2 | Frontend: React + Vite + TypeScript + React Router | ✅ |
| T3 | Editor: Monaco vía `@monaco-editor/react` | ✅ |
| T4 | Estado de servidor en el front: TanStack Query | ✅ |
| T5 | Autograder: subproceso Deno aislado (`--deny-all`) + timeout; DOM con linkedom | ✅ |
| T6 | Vista previa y portafolios publicados: `iframe` sandbox + `postMessage`, sin servidor | ✅ |
| T7 | Auth: correo + código de cohorte. Sin registro totalmente abierto | ✅ |
| T8 | Patrón: capas pragmáticas + puertos/adaptadores solo en ejecutor y dominio de revisión | ✅ |
| T9 | Deploy: backend en Fly.io/Railway (Docker Python+Deno); frontend estático | ✅ |

## Propuestas — a confirmar con el equipo del taller

| # | Tema | Propuesta | Por qué se propone |
|---|---|---|---|
| C1 | Cómo se enuncia el reto: variantes 1a (prosa) / 1b (síntoma puro) / 1c (contrato de aceptación) | Empezar con **1a (prosa)** la primera semana; **1c (contrato)** la segunda; **1b (síntoma puro)** solo en retos platino | 1b es lo más fiel al juego original pero lo más riesgoso con media cohorte sin base; 1c mapea 1:1 al autograder. Es combinable por semana (handoff §1a–1c) |
| C2 | Estado de visitantes en portafolios ajenos | **Solo navegador** (`localStorage`), sin persistencia en backend | Suficiente para el objetivo pedagógico; evita moderación y escalamiento de memoria (brief §2.6). Si se quiere feedback real entre estudiantes, función aparte y moderada |
| C3 | Entrada de estudiantes | **Correo + código de cohorte**, sin CSV | Baja fricción para el instructor, cohorte-acotada, reutilizable, sandbox de facto privado |

## Pendientes de definir (brief §7 + nuevos)

| # | Tema | Notas |
|---|---|---|
| D1 | ¿El progreso en retos platino suma a la nota final o es extra-crédito no determinante? | Recomendación del brief: extra-crédito visible pero no determinante |
| D2 | Detalle exacto del sistema de pistas progresivas: umbral de tiempo/repetición para activarlas | 3 niveles; disparadores: tiempo estancado sin cambios + patrones (líneas casi idénticas = copiar/pegar) |
| D3 | Formato de los checkpoints orales: ¿registrados en la plataforma o solo proceso manual del instructor? | El dashboard (1d) ya contempla registrarlos en la plataforma |
| D4 | Límite de memoria del subproceso Deno y manejo de OOM | Detalle de implementación del autograder |
| D5 | Subconjunto exacto de la API en español que expone el grader y shim de DOM (linkedom) | Debe coincidir con la API desbloqueada por día |
| D6 | Verificación del deploy final del estudiante (Git + Vercel/Netlify) — brief §5.9 | Mostrar la URL pública generada dentro de la plataforma |
| D7 | Persistencia: ¿SQLite basta para todas las cohortes previstas o se migra a Postgres desde el inicio? | SQLAlchemy hace la migración barata; decidir según nº de cohortes concurrentes esperadas |
