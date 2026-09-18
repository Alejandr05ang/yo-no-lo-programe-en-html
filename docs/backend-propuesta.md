# Propuesta de arquitectura de backend

> Fecha: 2026-09-18 (revisado el mismo día). Este documento es una **propuesta**, no una decisión
> cerrada — a diferencia de `arquitectura.md`, cuyas secciones con ✅ ya están fijadas. Aquí se marca
> explícitamente qué de `arquitectura.md` queda vigente y qué se revisa.
>
> Está escrito para quien vaya a implementar el backend, con o sin el resto de esta conversación
> como contexto: cada decisión trae su motivo, no solo la conclusión.
>
> **Principio que ordena todo el documento: FastAPI es el único servidor.** El cliente (frontend)
> nunca le habla a Supabase/Firebase directamente. Lo que sea que se use de un BaaS es
> infraestructura gestionada *detrás* de FastAPI — base de datos y, si se quiere, emisión de
> identidad — nunca un segundo backend con su propia lógica ni su propio punto de entrada. La
> autorización (quién puede ver o escribir qué) la decide el código de FastAPI, en capas, no una
> política externa.

## 0. Qué problema resuelve esto

Hoy el frontend (`frontend/`) es 100% cliente: perfil, progreso, soluciones, diagnóstico y acceso
viven en `localStorage`/`sessionStorage` del navegador (`lib/perfil.ts`, `lib/progreso.ts`,
`lib/acceso.ts`). No hay cuentas reales, cualquiera puede editar su propio progreso desde la consola
del navegador, el "desbloqueo por día" es un cálculo local que el propio estudiante controla, y la
revisión automática (`lib/revisionLocal.ts`) es un mock que corre en el mismo navegador del
estudiante — exactamente lo que el brief prohíbe (§2.3, §5.4): *"los casos de prueba y la evaluación
viven en el servidor; el cliente nunca debe poder leer los casos ocultos ni la solución"*.

Este documento propone reemplazar esa capa por un backend real, con tres piezas:

1. **Un servidor propio (FastAPI)**, único punto de entrada para el cliente, organizado en capas
   (API → servicio → dominio → repositorio) — la misma forma que ya proponía `arquitectura.md` §4.
2. **Infraestructura gestionada detrás de ese servidor**: una base de datos (Postgres, si se usa
   Supabase) y, opcionalmente, un proveedor de identidad — elegidos por conveniencia operativa
   (no hay que administrar el motor de base de datos ni el envío de correos de login a mano), no
   porque el cliente vaya a hablarles directo.
3. **Un motor de evaluación real**, que corre **dentro** del propio FastAPI (mismo proceso/imagen
   que ya describía T9: Python + Deno en un solo contenedor) — no un tercer servicio.

## 1. Forma general del sistema

```
┌──────────────────────────┐
│  Frontend (React/Vite)    │
│  ya existe                │
└────────────┬───────────────┘
             │  único punto de entrada — todo pasa por acá
             ▼
┌──────────────────────────────────────────────────────────┐
│                        FastAPI                             │
│  api/       → rutas (auth, encargos, entregas, instructor)  │
│  services/  → casos de uso, AQUÍ vive la autorización        │
│  domain/    → reglas puras (desbloqueo, generación de casos) │
│  repositories/ → acceso a datos, un módulo por entidad        │
│  adapters/ejecutor/deno.py → sandbox del autograder (T5)      │
└───────┬───────────────────────────────────┬─────────────────┘
        │ conexión de servicio (SQLAlchemy)   │ solo para emitir/validar
        │ — un único rol, sin RLS por request  │ tokens (opcional)
        ▼                                     ▼
┌────────────────────┐              ┌──────────────────────┐
│ Postgres gestionado  │              │ Proveedor de identidad │
│ (p. ej. Supabase)     │              │ (p. ej. Supabase Auth  │
│ — SOLO base de datos, │              │  o Firebase Auth)      │
│ FastAPI es el único    │              │ — SOLO emite/valida    │
│ cliente que la toca    │              │  tokens; no decide      │
└────────────────────┘              │  quién ve qué           │
                                      └──────────────────────┘
```

El cliente jamás recibe una clave de Supabase/Firebase ni llama a su API directamente. Todo lo que
el frontend sabe es la URL de **su propio backend**.

## 2. Comparación: Supabase vs Firebase (como infraestructura, no como backend)

Con FastAPI como único servidor, la pregunta cambia: ya no es "¿cuál API de cliente es más cómoda?"
(el cliente del BaaS ni se usa desde el navegador), es **"¿cuál le da menos fricción a FastAPI para
hacer su trabajo?"**

| Criterio | Supabase | Firebase |
|---|---|---|
| Acceso a datos desde FastAPI | **Connection string de Postgres normal.** SQLAlchemy/asyncpg se conectan igual que a cualquier Postgres — el mismo patrón `repositories/` que ya planeaba `arquitectura.md` para SQLite, sin reescribir nada de forma | Firestore **no da un connection string SQL**: se accede vía el Admin SDK (llamadas a documentos/colecciones, no consultas SQL). FastAPI tendría que hablar ese lenguaje en toda la capa de repositorios — más fricción para un dominio tan relacional (cohortes × sesiones × checkpoints × señales) |
| Joins/agregados para el dashboard del instructor (1d) | Un `SELECT ... JOIN ... GROUP BY` normal | Sin joins nativos: agregar "11/24 aceptados, 4 estancados" cruzando checkpoints y señales exige traer documentos y sumar en código, o mantener documentos-resumen aparte |
| Proveedor de identidad (opcional) | Supabase Auth: emite JWT, FastAPI los valida contra su JWKS público. Plan gratis sin tarjeta: 50k usuarios activos/mes | Firebase Auth: mismo rol (emitir/validar tokens), igual de sólido. También sin tarjeta para Auth en sí (la tarjeta solo la exige Cloud Functions, que aquí ni se usa) |
| ¿Hace falta usar el mismo proveedor para datos e identidad? | **No.** Como FastAPI es dueño de toda la lógica, se puede usar Postgres de Supabase con Auth de Firebase, o con login propio (T7 original) — son piezas desacopladas ahora | Igual de cierto en cualquier combinación |
| Curva de aprendizaje del equipo | Postgres + SQL es lo que el equipo ya sabe planear con SQLAlchemy/FastAPI (`arquitectura.md` §1) | Modelo de documentos, distinto de lo que el equipo maneja |
| Plan gratuito verificado (2026-09) | 500 MB de base de datos, proyecto se **pausa tras 1 semana de inactividad** | Firestore: 50k lecturas/día, 20k escrituras/20k borrados por día, 1 GiB — cuotas que aquí ya no le pegan directo a FastAPI (FastAPI hace pocas conexiones persistentes, no una operación por lectura de usuario final como en el modelo "cliente habla directo") |

**Con este planteamiento, Supabase pesa más todavía que antes**: no es solo "mejor encaje de datos",
es que Firestore obliga a toda la capa `repositories/` a hablar un lenguaje no-relacional para un
dominio que es fuertemente relacional. Si el equipo quiere Postgres gestionado sin más compromiso,
también valen alternativas fuera de Supabase (Neon, Railway Postgres, RDS) — Supabase simplemente
suma Auth gratis al mismo paquete. Queda como decisión abierta en §11 (BA1), pero con este argumento
adicional a favor.

## 3. Por qué el autograder vive dentro de FastAPI, no aparte

El brief (§2.3, §5.4) exige: casos ocultos de tamaño variable generados en cada corrida, que el
estudiante nunca ve; ejecución aislada del código que el estudiante escribió (puede tener bucles
infinitos, intentar red/disco); el cliente no debe poder leer ni los casos ni la solución.

Eso es cómputo aislado bajo demanda, y **ni Supabase ni Firebase pueden dárselo desde sus funciones
serverless con garantías** (Edge Functions y Cloud Functions corren en entornos ya restringidos; no
está documentado que soporten spawnear un subproceso anidado con `--deny-all`). Pero eso ya no es un
problema de diseño aquí: como FastAPI es el único servidor y ya corre en su propio contenedor Docker
con control total (Fly.io/Railway, T9), el sandbox Deno es simplemente **otro módulo dentro del mismo
backend** (`adapters/ejecutor/deno.py`, como ya estaba en la estructura de carpetas de
`arquitectura.md` §4) — no hay que inventar un segundo servicio ni resolver cómo dos backends
comparten autorización.

### Flujo de una entrega

1. Frontend hace `POST /encargos/{numero}/revision` a FastAPI con el código, y su token de sesión en
   el header `Authorization`.
2. FastAPI valida el token contra el proveedor de identidad (o, si se decide no usar uno externo,
   contra su propia tabla de sesiones) → obtiene `estudianteId`.
3. La capa de servicio consulta (con su propia conexión, sin pedirle permiso a nadie más) la cohorte
   del estudiante y su calendario de desbloqueo — **la autoridad de qué encargo está permitido hoy es
   FastAPI, no el `?e=N` de la URL** (hoy eso es puramente decorativo en el cliente, ver §9).
4. Si el encargo no está desbloqueado: 403, sin ejecutar nada.
5. El dominio puro genera los casos ocultos (`domain/revision/casos.py`, ya descrito en
   `arquitectura.md` §3.1) — **no se guardan en ninguna tabla**, se generan en cada corrida.
6. `adapters/ejecutor/deno.py` corre el subproceso con timeout, recoge el resultado.
7. La capa de repositorio escribe en `progreso` e `intentos`.
8. Responde al cliente solo el resultado agregado — nunca el tamaño real de los casos ni el código
   esperado.

Ni un solo paso de este flujo sale de FastAPI hacia otro servidor con lógica propia.

## 4. Roles y separación instructor / estudiante / equipo del taller

Tres roles, no dos:

| Rol | Quién | Qué ve |
|---|---|---|
| `estudiante` | cada estudiante del taller | su propio progreso, su propio portafolio, el calendario público de sesiones |
| `instructor` | quien da la clase | el dashboard agregado (1d) de **su(s) cohorte(s)**, checkpoints, parejas — nunca el código en crudo de un estudiante de otra cohorte |
| `admin` | el equipo que opera la plataforma (ustedes) | crear cohortes, generar el código de acceso, sembrar el catálogo de encargos/sesiones, y las utilidades de desarrollo que hoy son el botón "reiniciar todo (dev)" de `Mapa.tsx` |

**La separación se decide en dos capas, y las dos viven en el repo que ustedes controlan:**

1. **Frontend:** un guard en el router (ya usa React Router) que redirige si el rol resuelto no
   alcanza — es experiencia de usuario, no seguridad real.
2. **FastAPI, en la capa de servicio, en cada endpoint:** una dependencia (`api/deps.py`, ya prevista
   en la estructura de `arquitectura.md`) que resuelve `usuario_actual` a partir del token, y cada
   servicio decide con código Python normal si ese usuario puede tocar el recurso pedido
   (`if usuario.rol != "instructor" or usuario.cohorte_id != recurso.cohorte_id: raise 403`). Esta es
   la capa que hoy no existe en absoluto — `Bitacora.tsx` dice en un comentario *"sin control de rol
   todavía... habilitada para dev"*, y cualquiera que escriba `/bitacora` en la URL entra.

No hay una tercera capa de autorización en la base de datos (RLS): como el único cliente que se
conecta a Postgres es FastAPI con su propio rol de servicio, una política `auth.uid() = ...` no tiene
de dónde sacar el "usuario actual" — ese contexto solo existe cuando el cliente se conecta
directo con su propio JWT, que es exactamente lo que este diseño evita. La autorización vive en
Python, en un solo lugar, donde es legible y testeable — no repartida entre código y SQL.

## 5. Modelo de datos

Escrito en DDL de Postgres — lo que FastAPI crea y administra con sus propias migraciones (Alembic,
como ya preveía `arquitectura.md` §4). Cubre **todo** lo que se repasó — incluidas las funciones que
en el frontend hoy son decorativas (pistas, checkpoints reales, señales, parejas, platino,
diagnóstico final) — para que el esquema no haya que rehacerlo cuando esas pantallas se conecten. No
todo se implementa en la primera entrega (ver fases, §10).

```sql
-- ========================================================================
-- IDENTIDAD Y COHORTES
-- ========================================================================

create type rol as enum ('estudiante', 'instructor', 'admin');

create table cohortes (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,              -- "Cohorte 2026-B"
  codigo_acceso  text not null unique,        -- lo reparte el instructor en clase
  fecha_inicio   date not null,
  activa         boolean not null default true
);

-- La tabla de identidad es propia de FastAPI, no una vista sobre la tabla
-- interna del proveedor de Auth. Si se usa un proveedor externo (Supabase
-- Auth / Firebase Auth) solo para emitir tokens, "id" aquí es el mismo id
-- que ese proveedor pone en el token (su "sub") — FastAPI lo copia a esta
-- tabla la primera vez que ve a ese usuario. Si NO se usa proveedor externo
-- (login propio, T7 original), FastAPI genera este id él mismo.
create table usuarios (
  id               uuid primary key,
  rol              rol not null default 'estudiante',
  cohorte_id       uuid references cohortes(id),   -- null para instructor multi-cohorte / admin
  nombre           text not null default '',
  sobre_mi         text not null default '',
  github           text not null default '',
  linkedin         text not null default '',
  correo_contacto  text not null default '',
  hobbies          text[] not null default '{}',
  creado_en        timestamptz not null default now()
);

-- Puente entre "correo + código de cohorte" (antes de que exista la cuenta)
-- y la creación real de la cuenta al hacer clic en el enlace de acceso.
-- Lo maneja FastAPI en código, no un trigger de base de datos. Ver §7.
create table pre_registros (
  correo      text primary key,
  cohorte_id  uuid not null references cohortes(id),
  creado_en   timestamptz not null default now()
);

-- ========================================================================
-- CALENDARIO (brief §4, sesiones.ts hoy)
-- ========================================================================

create table sesiones_catalogo (
  codigo     text primary key,     -- 'L1', 'Ma1', 'Mi1', ...
  orden      int not null,
  duracion   text not null,        -- '2h' | '4h'
  tema       text not null,
  pieza      text not null,
  capa       int                   -- 1-5, null si esa sesión no tiene capa (L1, Ju2, V2)
);

-- El mismo catálogo, con fecha real por cohorte: esto es lo que hace el
-- desbloqueo por día una regla de SERVIDOR (código de FastAPI en §3, paso 3)
-- y no un cálculo del cliente.
create table cohorte_calendario (
  cohorte_id      uuid references cohortes(id),
  sesion_codigo   text references sesiones_catalogo(codigo),
  fecha           date not null,
  hora_desbloqueo time not null default '00:00',
  primary key (cohorte_id, sesion_codigo)
);

-- ========================================================================
-- ENCARGOS (encargos.ts hoy)
-- ========================================================================

create table encargos_catalogo (
  numero              int primary key,
  sesion_codigo       text references sesiones_catalogo(codigo),
  titulo              text not null,
  parrafos            text[] not null,
  herramientas        jsonb not null,   -- [{ "nombre": "crearTitulo()", "nuevaHoy": true }]
  hereda_de           int references encargos_catalogo(numero),
  es_borrador         boolean not null default false,
  pista_base_segundos int               -- umbral para la primera pista; ver senales_edicion
);
-- Deliberadamente NO hay una tabla de "casos ocultos": se generan en código
-- (dominio puro, arquitectura.md §3.1) en cada corrida del autograder.
-- Guardarlos en una tabla sería crear la fuga de datos que el brief prohíbe.

-- ========================================================================
-- PROGRESO (progreso.ts hoy — hoy vive en sessionStorage)
-- ========================================================================

create type estado_progreso as enum ('borrador', 'en_progreso', 'aceptado');

create table progreso (
  estudiante_id      uuid references usuarios(id),
  encargo_numero     int references encargos_catalogo(numero),
  estado             estado_progreso not null default 'borrador',
  codigo             text not null default '',
  intentos           int not null default 0,
  casos_pasados      int not null default 0,
  casos_totales      int not null default 0,
  ultimo_cambio_en   timestamptz not null default now(),  -- para "estancado N min"
  aceptado_en        timestamptz,
  primary key (estudiante_id, encargo_numero)
);

-- Historial append-only de cada "Entregar a revisión" (intentos, resultado)
create table intentos (
  id               uuid primary key default gen_random_uuid(),
  estudiante_id    uuid references usuarios(id),
  encargo_numero   int references encargos_catalogo(numero),
  codigo_enviado   text not null,
  resultado        jsonb not null,    -- [{ "descripcion": "...", "estado": "pasa"|"falla" }]
  creado_en        timestamptz not null default now()
);

-- ========================================================================
-- SEÑALES Y PISTAS (decorativo hoy en PanelEncargo.tsx / cohorte.ts)
-- ========================================================================

-- Contadores agregados, NO un log de cada tecla (evita que esta tabla
-- explote de tamaño con 24 estudiantes tecleando durante 2 semanas).
create table senales_edicion (
  estudiante_id           uuid references usuarios(id),
  encargo_numero          int references encargos_catalogo(numero),
  pegados_grandes         int not null default 0,   -- pegar >N caracteres de una vez
  lineas_casi_identicas   boolean not null default false,
  primary key (estudiante_id, encargo_numero)
);

create table pistas_mostradas (
  id              uuid primary key default gen_random_uuid(),
  estudiante_id   uuid references usuarios(id),
  encargo_numero  int references encargos_catalogo(numero),
  nivel           int not null check (nivel between 1 and 3),
  mostrada_en     timestamptz not null default now()
);

-- ========================================================================
-- CHECKPOINTS ORALES (1d — hoy es un formulario que no escribe a ningún lado)
-- ========================================================================

create type nivel_comprension as enum ('generaliza', 'con_ayuda', 'no_explica');

create table checkpoints (
  id               uuid primary key default gen_random_uuid(),
  estudiante_id    uuid references usuarios(id),
  sesion_codigo    text references sesiones_catalogo(codigo),
  nota             text not null,
  nivel            nivel_comprension not null,
  registrado_por   uuid references usuarios(id),  -- instructor que lo registró
  creado_en        timestamptz not null default now()
);

-- ========================================================================
-- PAREJAS (brief §3 — hoy el link "Parejas" en Bitácora no lleva a nada)
-- ========================================================================

create table parejas (
  id           uuid primary key default gen_random_uuid(),
  cohorte_id   uuid references cohortes(id),
  codigo       text not null,     -- "P-01"
  criterio     text               -- de qué señal del diagnóstico salió el cruce
);

create table pareja_miembros (
  pareja_id       uuid references parejas(id),
  estudiante_id   uuid references usuarios(id),
  primary key (pareja_id, estudiante_id)
);

-- ========================================================================
-- DIAGNÓSTICO INICIAL Y FINAL (brief §6/§3, provisto por el equipo del taller)
-- ========================================================================

create table diagnostico_preguntas (
  id              serial primary key,
  tipo            text not null check (tipo in ('inicial', 'final')),
  orden           int not null,
  pregunta        text not null,
  tipo_respuesta  text not null    -- 'texto' | 'radio' | 'codigo'
);

create table diagnostico_respuestas (
  estudiante_id  uuid references usuarios(id),
  pregunta_id    int references diagnostico_preguntas(id),
  respuesta      text,
  creado_en      timestamptz not null default now(),
  primary key (estudiante_id, pregunta_id)
);

-- ========================================================================
-- RETOS PLATINO (brief §2.8/§5.8 — hoy son tarjetas fijas en Mapa.tsx)
-- ========================================================================

create table platino_catalogo (
  slug            text primary key,   -- 'memoria' | 'ahorcado' | 'buscaminas'
  nombre          text not null,
  requiere_capa   int not null
);

create table platino_progreso (
  estudiante_id    uuid references usuarios(id),
  reto_slug        text references platino_catalogo(slug),
  estado           text not null default 'bloqueado',  -- 'bloqueado'|'abierto'|'hecho'
  puntaje          jsonb,
  actualizado_en   timestamptz not null default now(),
  primary key (estudiante_id, reto_slug)
);

-- ========================================================================
-- PORTAFOLIO PUBLICADO (módulo de cierre, brief §5.9)
-- ========================================================================

create table portafolios (
  estudiante_id    uuid primary key references usuarios(id),
  slug             text not null unique,   -- "ana-rivas" → ana-rivas.taller.dev
  publicado        boolean not null default false,
  url_deploy       text,                   -- verificación del deploy real del estudiante
  actualizado_en   timestamptz not null default now()
);
```

### Lo que deliberadamente NO es una tabla

El contenido que un **visitante** agrega en vivo al portafolio publicado (botón "+ Agregar hobby",
brief §2.6, §5.6) **nunca se persiste en el backend**. Vive solo en el `localStorage` del navegador
de ese visitante. Esto ya estaba decidido en `arquitectura.md` §6 y se repite aquí porque es fácil de
romper por accidente: si alguien agrega una tabla `comentarios_visitante` o similar durante la
implementación, está reintroduciendo el problema de escalamiento de memoria que el brief pide evitar
explícitamente. Si más adelante se quiere interacción social real entre estudiantes, es una función
aparte y moderada — no esto.

## 6. Autorización — dónde vive realmente

No hay políticas de base de datos (RLS) en este diseño: no aplican, porque el único cliente de
Postgres es FastAPI (§4). Toda la autorización es código Python normal, en la capa de servicio, con
la forma de siempre:

```python
# services/progreso.py
def obtener_progreso(usuario_actual: Usuario, estudiante_id: UUID) -> Progreso:
    if usuario_actual.id != estudiante_id and usuario_actual.rol not in ("instructor", "admin"):
        raise HTTPException(403)
    if usuario_actual.rol == "instructor":
        estudiante = repo_usuarios.obtener(estudiante_id)
        if estudiante.cohorte_id != usuario_actual.cohorte_id:
            raise HTTPException(403)  # instructor de OTRA cohorte
    return repo_progreso.obtener(estudiante_id)
```

Esto es exactamente lo que `arquitectura.md` §3.2 ya anticipaba ("Auth, guardar código, intentos...:
CRUD. `router → service → repository` y listo") — no es una pieza nueva, es la confirmación de que
esa capa ya prevista es también la única frontera de seguridad, y por eso conviene que tenga su
propia batería de tests (quién puede pedir el progreso de quién, quién puede registrar un checkpoint,
etc.), igual que ya se exigía para el dominio de revisión.

## 7. Autenticación de punta a punta

Dos caminos posibles, ambos compatibles con "FastAPI es el único servidor" — la diferencia es solo
si FastAPI delega la parte de "mandar el correo con el enlace de acceso" a un proveedor externo o la
hace él mismo:

**Camino A — con proveedor externo (Supabase Auth / Firebase Auth) solo para el correo/token:**

1. `/entrar`: el estudiante escribe correo + código de cohorte, lo manda a FastAPI.
2. FastAPI valida el código contra su propia tabla `cohortes` (consulta normal, no una función
   pública expuesta al cliente — el cliente nunca toca la base de datos).
3. FastAPI guarda `(correo, cohorte_id)` en `pre_registros` y le pide al proveedor de Auth que envíe
   el enlace de acceso a ese correo (una llamada de servidor a servidor, con la clave admin del
   proveedor — esa clave vive solo en el backend).
4. El estudiante hace clic, el proveedor redirige con un token.
5. El frontend manda ese token a FastAPI (`POST /auth/confirmar`); FastAPI lo valida contra el JWKS
   del proveedor, saca el correo, lo busca en `pre_registros`, crea la fila en `usuarios` con
   `rol='estudiante'` y el `cohorte_id` correspondiente, y le devuelve **su propia** sesión
   (su propio JWT o cookie, emitido por FastAPI) — de acá en adelante el frontend solo conoce el
   token de FastAPI, no vuelve a hablar con el proveedor externo.

**Camino B — login propio, sin proveedor externo (T7 original, sin cambios):**

Mismo flujo, pero en el paso 3 FastAPI genera y manda el enlace él mismo (con cualquier servicio de
correo transaccional) y en el paso 5 valida su propio token firmado. Cero dependencias externas, a
cambio de un poco más de código propio (generar/enviar el enlace, expirarlo). Con el equipo ya
manejando FastAPI, no es mucho trabajo extra — vale la pena considerarlo si se prefiere no tener
ninguna pieza de identidad fuera del propio backend.

El instructor y el admin no pasan por este flujo — su cuenta y rol se crean a mano (un script de
seed o un endpoint de administración) al iniciar cada cohorte.

## 8. Qué reemplaza esto en el frontend actual

Con este diseño, el frontend solo necesita saber hablarle a **un** backend (el propio):

| Hoy (`frontend/src/lib/`) | Pasa a ser |
|---|---|
| `perfil.ts` (`localStorage: ve:perfil`) | `GET/PUT /perfil` contra FastAPI |
| `progreso.ts` (`sessionStorage: ve:soluciones/ve:borradores`) | `GET/PUT /encargos/{numero}/progreso` contra FastAPI |
| `acceso.ts` (`localStorage: ve:diagnostico-hecho/ve:ultimo-acceso`) | Se resuelve con lo que ya devuelve FastAPI al pedir el estado del estudiante — deja de guardarse a mano |
| `revisionLocal.ts` | Se elimina del cliente; su lógica de dominio se mueve a `domain/revision/` dentro de FastAPI (§3) |
| `sandbox.ts` (`ejecutarPreview`) | **No cambia** — "Ejecutar" sigue siendo 100% cliente (preview en vivo, brief §5.2); solo "Entregar a revisión" pasa a ser `POST /encargos/{numero}/revision` |
| `?e=N` en la URL como fuente de qué encargo se puede abrir | Deja de ser autoridad: sigue sirviendo para navegar, pero FastAPI decide qué está desbloqueado (§3, paso 3) — hoy cualquiera puede escribir `?e=11` y saltarse todo |
| Botón "reiniciar todo (dev)" (`Mapa.tsx`) | Se queda, pero pasa a requerir rol `admin` verificado por FastAPI; hoy es público porque no hay rol en absoluto |
| Música (`lib/musica.ts`) | **No cambia.** Es preferencia local del navegador, no hay razón para moverla al backend |

## 9. Fases de entrega sugeridas

El esquema de arriba está completo, pero no hace falta construirlo todo a la vez:

1. **Fase 1 — lo que bloquea que el resto sea real:** `cohortes`, `usuarios`, `pre_registros`, login
   (camino A o B, §7), `sesiones_catalogo` + `cohorte_calendario`, `encargos_catalogo`, `progreso`,
   `intentos`, y el motor de evaluación dentro de FastAPI (§3). Con esto el desbloqueo por día ya no
   se puede saltar y la revisión ya no es un mock.
2. **Fase 2 — el dashboard del instructor deja de ser ficticio:** `checkpoints` conectado de verdad
   a `Bitacora.tsx`, señales derivadas (`senales_edicion`) calculadas en cada intento (tiempo desde
   `ultimo_cambio_en`, pegados grandes).
3. **Fase 3 — lo demás:** `pistas_mostradas` (conectar el botón "Pedir pista" que hoy no hace nada),
   `parejas`, `diagnostico_preguntas/respuestas` para la variante final (V2), `platino_catalogo/
   progreso`, `portafolios.url_deploy`.

## 10. Impacto sobre `arquitectura.md`

No se reescribe ese documento todavía (es de "decisiones cerradas"), pero si esta propuesta se
adopta, estas filas de su tabla de stack (§2) quedan revisadas — y son cambios más chicos de lo que
parecía en la primera versión de este documento:

- **T1** (`FastAPI + SQLite`) → sigue siendo FastAPI, con la misma estructura en capas de §4 de
  `arquitectura.md`, sin encoger a microservicio. Lo único que cambia es **dónde vive el Postgres**:
  gestionado (p. ej. Supabase) en vez de SQLite local, por conveniencia operativa — se sigue
  accediendo con SQLAlchemy desde `repositories/`, exactamente igual que antes.
- **T7** (auth "correo + código de cohorte", hecha a mano) → sigue siendo lo mismo; la única pregunta
  abierta es si el envío del enlace de acceso lo hace un proveedor externo (Supabase Auth / Firebase
  Auth, camino A de §7) o FastAPI mismo (camino B, sin cambios respecto a lo ya decidido).
- **T3–T6, T8, T9 siguen vigentes tal cual** — el editor, el sandbox del preview, el ejecutor Deno
  aislado (ahora confirmado como módulo interno, no servicio aparte), el patrón de capas pragmáticas
  y el criterio de deploy (un solo contenedor) no cambian con esta propuesta.

## 11. Decisiones abiertas — a confirmar por el equipo

| # | Tema | Notas |
|---|---|---|
| BA1 | ¿Postgres gestionado de Supabase, o cualquier otro (Neon, Railway Postgres, RDS)? | Ya no depende de si se usa el cliente de Supabase (no se usa) — es solo elegir dónde vive el Postgres. Supabase suma Auth gratis al mismo paquete si también se quiere el camino A de §7 |
| BA2 | ¿Camino A (proveedor externo de Auth) o camino B (login propio, T7 original) para emitir el enlace de acceso? | A es menos código propio; B es cero dependencias externas para identidad |
| BA3 | ¿Un instructor puede tener más de una cohorte en v1? | Si no, `usuarios.cohorte_id` alcanza; si sí, hace falta una tabla puente (`instructor_cohortes`) desde el arranque |
| BA4 | ¿Quién crea la primera cohorte y el primer instructor? | Hace falta aunque sea un script de seed una sola vez |
| BA5 | Retención de `intentos` | Tabla append-only que crece con cada entrega de 24 estudiantes × 10 sesiones; definir política antes de que importe |
