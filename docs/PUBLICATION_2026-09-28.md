# Publicación de portafolios — contrato local, 2026-09-28

Esta implementación prepara una migración aditiva; **no se ha aplicado a producción**.
La fuente continúa en `Progress.draft_code`. Publicar guarda un HTML sanitizado separado,
con slug aleatorio estable, revisión y huella de la fuente. Editar un encargo nunca cambia
una publicación. No se ejecuta JavaScript del alumno en el servidor ni en la página principal.

## API autenticada

Todas las rutas usan `/api` y Firebase mediante `auth.api`/`ApiClient`.

- `GET /portfolio/publication?challenge_key=e13`: consulta de propietario. La selección es
  opcional: publicación previa accesible, e13 guardado, o último encargo curricular guardado.
- `POST /portfolio/publication/preview`: mismo cuerpo que publicar; devuelve
  `{snapshot_html, source_fingerprint}` sin modificar la publicación.
- `POST /portfolio/publication/publish`: cuerpo
  `{challenge_key, title, snapshot_html, source_fingerprint, visibility: "cohort"}`.
  Devuelve el mismo estado que la consulta del propietario.
- `POST /portfolio/publication/unpublish`: cuerpo vacío; devuelve el estado del propietario.
  Disponible aunque Ju2 esté cerrado o el propietario ya no tenga membresía.
- `GET /cohort/gallery`: `{items: [{slug,title,display_name,has_avatar,updated_at}]}`.
- `GET /cohort/portfolios/{slug}`: `{slug,title,display_name,has_avatar,snapshot_html,updated_at}`.
- `GET /cohort/portfolios/{slug}/avatar`: bytes `image/webp`, autenticados y sin caché;
  404 si no existe avatar o publicación visible.

El estado del propietario contiene:

```typescript
{
  publication: {
    slug: string; title: string; visibility: 'cohort'; snapshot_html: string;
    source_challenge_key: string; source_fingerprint: string; revision: number;
    published_at: string; updated_at: string; is_published: boolean;
  } | null;
  sources: {challenge_key: string; title: string; session_code: string; last_saved_at: string | null}[];
  source: {challenge_key: string; draft_code: string; datos: Record<string, unknown>; source_fingerprint: string} | null;
  has_unpublished_changes: boolean;
  can_publish: boolean;
  publish_block_reason: string | null;
}
```

`datos` es exactamente el objeto para el sandbox: nombre visible, descripción, redes
opcionales sin correo de acceso, aficiones y listas vacías `proyectos`/`skills`. No añadir
fixtures de ejercicios en el cliente: el perfil no tiene todavía un modelo de proyectos
o habilidades propios. e13 es la selección inicial preferida cuando existe.
La huella SHA-256 cubre cohorte, encargo, código completo, datos y versión del contrato.
El título se compara aparte en la interfaz. Una huella antigua devuelve 409 `SOURCE_CHANGED`.

## Acceso y privacidad

El servidor deriva la cohorte de la membresía activa usada por el mapa. Publicar y revisar
la previsualización requieren Ju2 publicado y abierto y un encargo fuente accesible con
borrador guardado. Ni el cliente ni un campo adicional pueden elegir otra cohorte/propietario.
Cada lectura de galería, sitio y avatar verifica cohorte activa, cuenta activa y membresías
activas del visitante y del autor. Se usa 404 para slugs fuera de alcance.
Las respuestas de visitantes no incluyen fuente, correo, UID, IDs internos ni rutas de storage.
El avatar se recupera mediante proxy autorizado; no se distribuyen URLs firmadas reutilizables.

Solo existe visibilidad `cohort`. No hay endpoint público ni se activa `public_portfolios`.
No se cambia ese flag en ninguna migración, seed ni entorno de producción.

## Sanitización y límites

El backend usa el parser/sanitizador HTML5 `nh3` con listas permitidas de elementos,
atributos, enlaces y propiedades CSS. Elimina scripts, eventos, SVG/MathML, marcos,
formularios, recursos externos, imports CSS y atributos de navegación activa.
Reconstruye únicamente estilos globales generados y validados para fondo y geometría Ju1;
no admite CSS arbitrario. El cliente muestra el resultado sanitizado antes de publicar.
El snapshot es estático: temporizadores y manejadores de eventos no se publican.
El iframe conserva aislamiento y CSP restrictiva; no carga fuentes ni imágenes remotas.

El HTML recibido sigue siendo entrada no confiable aunque el token de fuente coincida:
la huella evita publicar una versión desactualizada, no certifica que el HTML se haya
calculado honestamente a partir del código. La sanitización se aplica siempre en servidor.

## Verificación

Las pruebas usan exclusivamente SQLite/fixtures y almacenamiento simulado. Cubren huellas
obsoletas, separación fuente/snapshot, bajas y cambio de cohorte, días cerrados, privacidad,
recursos externos y entradas HTML/CSS adversariales. La migración se compila sin conexión.

Verificación del backend al terminar esta implementación:

- Suite completa final: **197 passed, 1 skipped** (42.55 s), frente a baseline 133 passed / 1 skipped.
- Ruff completo: **All checks passed**.
- `pip-audit` sobre los paquetes instalados: **No known vulnerabilities found**.
- Sanitización: 36 pruebas, incluidos HTML malformado, eventos, SVG/MathML, esquemas
  inseguros, recursos externos, CSS, Unicode inválido, conservación visual e idempotencia.
- Migración: SQL PostgreSQL compilado localmente; tabla, claves, unicidad, checks y RLS
  verificados. Revoca privilegios de PUBLIC y, si existen, anon/authenticated. Sin conexión ni aplicación a producción.
- Mutación: **7/7 detectadas** en copias temporales de aplicación/pruebas; originales
  intactos. Se retiró por separado la comprobación de huella (2 fallos), membresía del
  autor (1), cohorte (1), sanitización (21), apertura de Ju2 (1), denegación de reingreso
  retirado (1) y filtro de membresía del instructor (1). Copias restauradas y eliminadas.

También se corrigieron dos fallos previos reproducidos antes de editar: el código de
clase ya no reactiva membresías retiradas/pendientes, y el listado de un instructor
excluye membresías inactivas y cohortes inactivas. Los resúmenes y detalles de cohortes
para instructores ya no incluyen `join_code_hash`. Estas correcciones empezaron con
seis pruebas fallidas y quedaron verificadas por la suite completa y mutaciones.

Referencias consultadas: [nh3](https://nh3.readthedocs.io/en/latest/),
[nh3 0.3.7 en PyPI](https://pypi.org/project/nh3/0.3.7/),
[descargas privadas de Supabase Storage](https://supabase.com/docs/guides/storage/serving/downloads).
La versión de nh3 queda fijada en `pyproject.toml` y `uv.lock`.

Limitaciones deliberadas: el snapshot es estático; no contiene recursos remotos ni
temporizadores. Los proyectos y habilidades de ejercicios eran ejemplos y no se
publican como datos propios. Una membresía retirada requiere una restauración explícita
administrativa; el código compartido no concede esa restauración. Las garantías de
PostgreSQL concurrente y Storage real requieren una revisión posterior en un entorno
de pruebas separado; esta sesión no conectó con producción.

El QA en Chromium detectó y corrigió la serialización de posiciones como `grid-area`:
se conservan inicios y spans numéricos acotados, sin aceptar expresiones ni áreas arbitrarias.
Las celdas combinadas conservan su ancho y la versión móvil usa una columna sin desbordamiento.
Las capturas y las instrucciones del harness están en `qa-2026-09-28/README.md`.
