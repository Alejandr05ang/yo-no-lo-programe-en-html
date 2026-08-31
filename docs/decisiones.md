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
| C4 | Layout de la pantalla 1a | Se desvía del mockup (`340px 1fr 404px`): **encargo, editor y preview son paneles plegables**; editor y preview parten 50/50 con **divisor arrastrable**; el preview tiene **selector de ancho** (móvil/tablet/escritorio/completo) y **modo pantalla completa** | El portafolio es la pieza protagonista y se exporta como sitio responsive real (brief §5.2, §5.9); el estudiante arma su espacio de trabajo. Se descartaron ventanas flotantes libres (trampa de usabilidad para principiantes, choca con el diseño "editorial y quieto", mata el responsive) |

## Progresión de encargos y API del estudiante

Ver `encargos.md` para el diseño completo. Decisiones que necesitan confirmación del equipo:

| # | Tema | Propuesta en `encargos.md` |
|---|---|---|
| EN1 | Nº de encargos: 1f dice "7", la progresión tiene 10 | Actualizar el copy de 1f a "10 encargos" |
| EN2 | API: `crearElemento("h1")` expone HTML | Funciones semánticas: `crearTitulo`, `crearParrafo`, `crearLista`, `crearItem`, `crearEnlace`… |
| EN3 | API: `si`/`repetir` helpers vs JS real | `if`/`else` y `for…of` reales, rotulados en español en el panel de herramientas |
| EN4 | `obtenerDatos()` vs `datos` global | `datos` global ya listo (quita carga del encargo 1) |
| EN5 | Texto estándar del "caso vacío" por sección | Pendiente |
| EN6 | El grader debe poder simular el paso del tiempo (`cadaSegundo`) | Detalle de implementación del autograder |

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
| D8 | ¿Self-hostear Monaco o dejarlo cargar desde CDN? | `@monaco-editor/react` carga Monaco desde jsdelivr por defecto. Un taller presencial con wifi flojo probablemente quiere Monaco servido desde `public/` |

## Bugs conocidos (menores)

| # | Síntoma | Causa | Alcance / mitigación | Estado |
|---|---|---|---|---|
| B1 | Al editar `frontend/src/lib/musica.ts` con `npm run dev` activo y música sonando, se escuchan **dos pistas a la vez** con desfase; el botón de pausa solo detiene una | Vite recarga el módulo en caliente (HMR) pero el `<audio>` de la instancia anterior sigue vivo en su clausura; el módulo nuevo crea otro y sus controles solo gobiernan el suyo | **Solo desarrollo**, y solo al tocar ese archivo en vivo — nunca en el build de producción (Netlify). Mitigado: `crearAudio()` llama a `destruirAudio()` antes de instanciar, y `import.meta.hot.dispose()` frena el audio viejo al recargar el módulo. Si ya quedó un audio huérfano, un hard-refresh (Ctrl+Shift+R) lo silencia | 🟡 mitigado, no bloqueante |
| B2 | Falta la pista `malibu.mp3` en `frontend/public/music/` | El FS de Windows es case-insensitive: al renombrar `Malibu.mp3` → `malibu.mp3` en el reencodeo, el `rm` del original borró el archivo recién creado (mismo nombre para el FS) | El resto de pistas está intacto (sus nombres difieren en más que mayúsculas). Hay que volver a añadir ese archivo, reencodearlo a 128 kbps y sumar `{ archivo: 'malibu.mp3', titulo: 'Malibu' }` a `PISTAS` | ⬜ pendiente de resupply |
