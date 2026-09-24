import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.db.models import Challenge, SessionCatalog
from app.db.session import create_database

SESSIONS = [
    ("L1", 1, "Diagnóstico y algoritmos", "Prepara el entorno y reconoce el punto de partida."),
    ("Ma1", 2, "Variables y DOM", "Tu nombre, tu voz y las primeras secciones."),
    ("Mi1", 3, "Condicionales y bucles", "Contacto, redes y listas que crecen con tus datos."),
    ("Ju1", 4, "Personalización visual", "Paleta, tipografía y decisiones visuales propias."),
    ("V1", 5, "Estado y movimiento", "Avisos condicionales y proyectos destacados en movimiento."),
    ("L2", 6, "Filtrar con intención", "Muestra solo lo que ya está listo para compartir."),
    ("Ma2", 7, "Matrices y funciones", "Organiza habilidades sin fijar cantidades."),
    ("Mi2", 8, "Funciones por tipo", "Cada proyecto se presenta según lo que ofrece."),
    ("Ju2", 9, "Git y publicación", "Prepara una versión pública y revisable."),
    ("V2", 10, "Demo final", "Cuenta el recorrido y comparte el portafolio terminado."),
]

CHALLENGES = [
    (
        "e1",
        "Ma1",
        "Tu nombre",
        "Da identidad a la portada.",
        "Muestra tu nombre como título principal.",
    ),
    (
        "e2",
        "Ma1",
        "Sobre mí",
        "Presenta quién eres en tus propias palabras.",
        "Añade al menos dos párrafos debajo del título.",
    ),
    (
        "e3",
        "Ma1",
        "Dale forma con secciones",
        "Organiza el contenido para leerlo de un vistazo.",
        "Crea un subtítulo que abra una sección.",
    ),
    (
        "e4",
        "Mi1",
        "Cómo encontrarte",
        "Publica solo los enlaces que tienen dirección.",
        "Recorre tus redes y muestra únicamente las que tengan URL.",
    ),
    (
        "e5",
        "Mi1",
        "Tus hobbies",
        "Convierte intereses en una lista visible.",
        "Construye una lista y agrega un elemento por hobby.",
    ),
    (
        "e6",
        "Mi1",
        "La lista que no se queda quieta",
        "Haz que la lista soporte cualquier cantidad.",
        "Vacía la lista y recorre los datos con un bucle.",
    ),
    (
        # Claves "e12"/"e13" (no "e7"/"e8"): e1..e11 ya estaban sembrados en producción antes
        # de agregar estos retos. Renumerar las claves existentes haría upsert por clave y les
        # cambiaría el contenido a alumnos que ya tengan progreso ahí (ver
        # frontend/src/lib/encargos.ts). El orden real en /api/map sale de esta posición en la
        # lista (sort_order), no de la clave: por eso pueden ir acá, entre e6 y e7.
        "e12",
        "Ju1",
        "Organiza tu página",
        "Agrupa contenido en secciones antes de personalizarlo.",
        "Agrupa alguna parte de tu portafolio con crearSeccion().",
    ),
    (
        "e13",
        "Ju1",
        "Dale tu estilo",
        "Personaliza colores, tipografía y fondo.",
        "Aplica al menos una herramienta de color o tipografía sobre tu portafolio.",
    ),
    (
        "e7",
        "V1",
        "En construcción",
        "Explica un estado vacío sin romper la página.",
        "Muestra el aviso solo cuando el texto sobre ti esté vacío.",
    ),
    (
        "e8",
        "V1",
        "Carrusel de proyectos destacados",
        "Destaca proyectos sin acumular elementos.",
        "Crea un carrusel que rote únicamente proyectos destacados.",
    ),
    (
        "e9",
        "L2",
        "Solo los proyectos terminados",
        "Filtra antes de publicar.",
        "Muestra únicamente proyectos con terminado en true.",
    ),
    (
        "e10",
        "Ma2",
        "Agrupar por categoría",
        "Presenta habilidades con estructura flexible.",
        "Recorre categorías y luego sus items.",
    ),
    (
        "e11",
        "Mi2",
        "Cada proyecto se ve distinto",
        "Adapta la presentación al tipo de proyecto.",
        "Decide qué crear según el tipo sin romper tipos desconocidos.",
    ),
]


async def seed_catalog(session: AsyncSession) -> tuple[int, int]:
    sessions_by_code: dict[str, SessionCatalog] = {}
    created_sessions = 0
    created_challenges = 0
    for order, (code, day, title, teaser) in enumerate(SESSIONS, start=1):
        item = await session.scalar(select(SessionCatalog).where(SessionCatalog.code == code))
        if item is None:
            item = SessionCatalog(code=code, day_number=day, order_index=order, title=title)
            session.add(item)
            created_sessions += 1
        item.day_number = day
        item.order_index = order
        item.title = title
        item.teaser_summary = teaser
        item.description = teaser
        item.is_published = True
        sessions_by_code[code] = item
    await session.flush()
    for sort_order, (key, code, title, teaser, instructions) in enumerate(CHALLENGES, start=1):
        challenge = await session.scalar(select(Challenge).where(Challenge.key == key))
        if challenge is None:
            challenge = Challenge(key=key, session_id=sessions_by_code[code].id, title=title)
            session.add(challenge)
            created_challenges += 1
        challenge.session_id = sessions_by_code[code].id
        challenge.title = title
        challenge.teaser_summary = teaser
        challenge.instructions = instructions
        challenge.kind = "core"
        challenge.status = "published"
        challenge.sort_order = sort_order
        challenge.preview_visible = True
    await session.flush()
    return created_sessions, created_challenges


async def main() -> None:
    engine = create_database(Settings())
    if engine is None:
        raise RuntimeError("Database is not configured")
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session, session.begin():
        sessions, challenges = await seed_catalog(session)
    print(f"CATALOG_SEED=PASS sessions_created={sessions} challenges_created={challenges}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
