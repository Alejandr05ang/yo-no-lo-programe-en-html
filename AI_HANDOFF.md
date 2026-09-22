# AI HANDOFF — Tutorías de Verano

Este documento es el punto de entrada para quien retome el proyecto: otra persona
del equipo o un asistente de IA. Está escrito para que no haga falta el contexto de
ninguna conversación previa.

**Lee esto entero antes de tocar código.** El repositorio y la producción tienen
alumnos y datos reales.

---

## Estado actual

| | |
|---|---|
| Frontend | https://tutorias-de-verano.web.app (Firebase Hosting) |
| Backend | Cloud Run `tutorias-api`, región `us-east1`, proyecto `tutorias-de-verano` |
| Base de datos | Supabase PostgreSQL, esquema `app` |
| Autenticación | Firebase Auth |
| Rama funcional | `release/mvp-production` |
| Estado E2E | READY FOR CLASSROOM USE, verificado contra producción con alumno real |

---

## Arquitectura que NO debe romperse

- **Firebase Auth** = identidad y sesión. Nada más.
- **FastAPI** = autorización. Decide quién puede qué.
- **PostgreSQL** = fuente de verdad.
- **localStorage / IndexedDB** = respaldo temporal, nunca fuente de verdad.

Reglas duras:

- No Supabase Auth. La identidad la da Firebase.
- Los roles **nunca** se deciden en el cliente. Salen de `session.user.role`, que
  viene de `POST /api/auth/bootstrap` y el backend revalida en cada petición.
- No poner secretos en variables `VITE_*`: todo lo que empiece por `VITE_` acaba en
  el bundle que descarga el navegador.
- La demo vive en un iframe con `sandbox="allow-scripts"` **exacto**. Añadir
  `allow-same-origin` anula el aislamiento, porque el iframe es del mismo origen.
- Un solo cliente HTTP autenticado: `auth.api` de `useAuth()`
  (`frontend/src/lib/http.ts`). Es el único que adjunta el token de Firebase.
  **Nunca uses `fetch` crudo contra `/api`**: responde 401 y el fallo es silencioso.
  Este error ya ocurrió tres veces en este proyecto.

---

## Flujo del alumno

```
login
 └─ sin clase        → /mapa ofrece "Únete a tu clase" (código del docente)
 └─ con clase        → /mapa
                        └─ sesión disponible → /sesiones/:codigo   (L1, Ma1, Mi1…)
                                                 └─ encargo → /portafolio?e=N
                                                                └─ progreso en Postgres
```

Dos reglas que costaron encontrarse y conviene no volver a romper:

1. **Las sesiones futuras se bloquean también en el backend.** La interfaz las
   oculta, pero quien manda es `require_challenge_access` / `session_detail`. Un
   alumno que escriba la URL a mano recibe `403 SESSION_LOCKED`.
2. **Una sesión con 0 encargos DEBE poder abrirse.** L1 es el día de diagnóstico y
   no tiene ninguno. Durante un tiempo el mapa solo generaba enlaces dentro de
   `session.challenges`, así que esa celda no tenía nada clicable y el día quedaba
   muerto. Hoy cada sesión alcanzable tiene su propio botón "Entrar", y la página
   muestra un estado vacío explícito.

Las claves públicas de sesión son `L1`, `Ma1`, `Mi1`… — **nunca UUID en la URL**.

---

## Flujo del administrador

`/admin` permite:

- ver el estado del taller y qué sesión está activa;
- ver la lista ordenada de sesiones (Demo, Día 1 … Día 10) con su estado
  Activa / Abierta / Bloqueada;
- activar una sesión con confirmación dentro de la página;
- crear clases, generar el código de acceso y ver alumnos matriculados con su fecha
  de unión;
- previsualizar cualquier sesión aunque no esté abierta y aunque el admin no esté
  matriculado.

Prohibido: `window.prompt`, `window.alert`, `window.confirm`, y mostrar UUID al
usuario. Todo eso existió y se retiró.

### La demo como estado del taller

`cohort_state.active_session_id = NULL` **no es un error**: significa "ningún día
abierto, los alumnos solo tienen la demo". El gating lo traduce a `order_index 0`,
con lo que nada queda desbloqueado. Por eso la demo no necesita fila propia en
`sessions_catalog` ni migración.

### El código de acceso no se puede volver a mostrar

Se guarda hasheado (`join_code_hash`). El panel solo puede **generar uno nuevo**,
invalidando el anterior. Es lo correcto en seguridad. Si alguien pide "ver el código
actual", la respuesta es que no existe forma sin guardarlo en claro, y eso sería un
retroceso.

---

## Demo

- `GET` / `PUT /api/demo/progress`, autenticados.
- El servidor es la autoridad; el respaldo local va por UID
  (`tutorias:demo:<uid>`), nunca compartido entre cuentas.
- Una copia local **sin sincronizar** gana sobre el servidor, porque por
  construcción es posterior al último guardado correcto. Si está sincronizada, gana
  el servidor.
- **Sin eco al restaurar**: `bump(mensaje, notificar)` acepta `notificar=false`. Si
  restaurar avisara al padre, este volvería a guardar lo que acaba de leer y pisaría
  el servidor con datos más viejos.
- El editor del iframe: **el textarea es el único que scrollea**; el resaltado y los
  números de línea copian su `scrollTop`/`scrollLeft`. Así el caret, la selección y
  el mapeo del clic los resuelve el navegador. Si alguna capa vuelve a scrollear por
  su cuenta, el texto se desalinea del cursor.

---

## Perfil

**PostgreSQL es la fuente de verdad.** `users.full_name`, `display_name`,
`description`, `github_url`, `linkedin_url`, `website_url`, `hobbies`.

`ve:perfil` en localStorage es **solo** origen de una migración de una vez:

- si el servidor ya tiene perfil → gana el servidor y la copia local se descarta;
- si está vacío y hay copia local → se sube, y solo cuando el servidor confirma se
  borra la local.

No volver a usar localStorage como perfil principal.

---

## Migraciones

**No corren solas.** Cloud Run levanta varias instancias y todas migrarían a la vez.

Orden de despliegue, y el orden importa: una migración aditiva es segura con el
backend viejo corriendo, pero el backend nuevo puede mapear una columna que todavía
no existe.

```bash
# 1. migraciones
cd backend
.venv/Scripts/python.exe scripts/migrate.py --estado   # qué revisión hay aplicada
.venv/Scripts/python.exe scripts/migrate.py            # aplica hasta head

# 2. backend
cd ..
gcloud run deploy tutorias-api --source backend --region us-east1 --project tutorias-de-verano

# 3. frontend
cd frontend && npm run build && cd ..
firebase deploy --only hosting --project tutorias-de-verano
```

---

## QA obligatoria

```bash
# backend  (uv NO está en el PATH de esta máquina; se usa el venv directamente)
cd backend
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/python.exe -m ruff check .

# frontend
cd frontend
npm test
npm run build
npm run lint

# repositorio
git diff --check
```

Referencia de la última QA verde: backend **92 passed, 1 skipped**; frontend
**33 passed**; ruff limpio; build correcto; lint **0 errores, 5 avisos conocidos**.

No declares PASS solo porque compila.

---

## Producción

`VITE_API_URL=/api`. El frontend habla con el backend **por el mismo origen**, y
`firebase.json` reescribe `/api/**` al servicio de Cloud Run. Nunca publiques una
URL con `localhost`.

Comprobación rápida de que el proxy funciona: `/api/demo/progress` sin token debe
devolver **401** (respuesta real de Cloud Run), no el `index.html` del SPA.

---

## Seguridad

- Los endpoints `/api/admin/**` exigen rol admin verificado contra la base.
- Un alumno no puede activar sesiones ni leer datos de otro: toda consulta se acota
  al `user.id` resuelto del token.
- Ningún endpoint acepta un `user_id` del cliente.
- No expongas el `firebase_uid` al navegador. Ya pasó: un endpoint sin
  `response_model` serializaba la fila entera de `users`.
- La documentación interactiva de FastAPI está cerrada en producción:
  `/docs`, `/redoc` y `/openapi.json` devuelven **404** cuando `APP_ENV=production`.

---

## Git

Nunca:

- `push --force` sobre `master`;
- rebase destructivo;
- `amend` de commits ajenos;
- reescribir historia para cambiar la lista de Contributors.

Todos los commits nuevos con la identidad real de quien los hace.

### Sobre el contribuidor "Claude" en GitHub

Aparece por trailers `Co-Authored-By` históricos. Según auditoría, **no existe
ningún commit cuyo autor sea Claude**: los commits son de `Alejandr05ang` o de
`Josue Saenz`. Uno de esos trailers vive en `722c6c6`, un commit de Alejandro ya
publicado en `master`.

Quitar "Claude" de Contributors exigiría reescribir `master`. **No se hace.** El
coste es real y el beneficio es cosmético.

---

## Decisión de producto pendiente

Hay una inconsistencia conocida entre la documentación y el seed:

- `docs/brief.md` sitúa **E1 en L1** ("L1 (inicio) → Ma1 (cierre)").
- `backend/app/catalog/seed.py` asigna `e1`, `e2` y `e3` **los tres a Ma1**.

Por eso L1 tiene 0 encargos. El software ya soporta ese caso y la sesión abre con su
estado vacío.

**No muevas E1 automáticamente.** Es una decisión pedagógica y cambia el currículum
de una clase en marcha. Si se toma, va en un commit independiente.

---

## Deuda técnica conocida

- **5 avisos de lint** del tipo `set-state-in-effect`, en efectos de carga de datos
  de Admin, Instructor y Onboarding. No son errores. No hagas refactor solo para
  bajar el número si no mejora el comportamiento.
- La pantalla de acceso apila sus columnas en anchos intermedios y el formulario
  queda por debajo del pliegue: se llega scrolleando, pero en un móvil estrecho
  puede parecer que no hay login.
- `challenge_overrides`, `diagnostic_responses` y `user_links` están modeladas en la
  base y ninguna ruta las usa todavía.
- `GET /api/profile/avatar` existe y nadie lo llama, así que el avatar se sube y no
  se muestra.
- Los listados de `/api/admin/**` no tienen paginación.

---

## Antes de que una IA toque el proyecto

```bash
git fetch origin --prune
git status
git branch --show-current
git log --oneline -10
```

Después: ejecuta los tests. Después: reproduce el problema. Después: modifica.

Nunca empieces cambiando código a ciegas, y desconfía de los informes de estado
—incluidos los tuyos— que no vengan con una medición detrás.

---

## Regla final

El repositorio y la producción tienen usuarios y datos reales: alumnos matriculados,
progreso guardado y perfiles escritos por ellos.

**No** limpies la base, resetees progreso, borres membresías, regeneres seeds ni
cambies `active_session` "para probar" sin entender el efecto. Si necesitas tocar un
dato de producción para verificar algo, déjalo como estaba y dilo.
