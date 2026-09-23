from typing import Literal
from uuid import UUID

from pydantic import BaseModel

ProgressStatus = Literal["not_started", "draft", "in_progress", "accepted"]

# open: el alumno puede entrar. paused: el docente lo cerro a mano; el progreso
# sigue guardado. locked: todavia no llega el curso a ese dia.
SessionAccess = Literal["open", "paused", "locked"]


class ChallengeTeaser(BaseModel):
    id: UUID
    key: str
    title: str
    teaser_summary: str
    kind: Literal["core", "platinum", "manual"]
    unlocked: bool
    # Cuenta para dar el dia por completado. Un reto platino es opcional.
    required: bool = True
    progress_status: ProgressStatus = "not_started"


class SessionProgress(BaseModel):
    """Resumen del alumno en un dia, calculado con sus filas reales de progress."""

    required_total: int = 0
    accepted: int = 0
    # Retos requeridos con trabajo guardado pero todavia sin aceptar.
    started: int = 0


class SessionTeaser(BaseModel):
    id: UUID
    code: str
    day_number: int
    order_index: int
    title: str
    teaser_summary: str
    # Posicion respecto al dia actual. Se conserva tal cual para clientes que aun no
    # leen access: no dice si el docente pauso el dia.
    state: Literal["done", "active", "future"]
    access: SessionAccess = "open"
    is_current: bool = False
    progress: SessionProgress = SessionProgress()
    challenges: list[ChallengeTeaser]


class MapView(BaseModel):
    cohort_id: UUID
    cohort_name: str
    sessions: list[SessionTeaser]


class ChallengeDetail(ChallengeTeaser):
    instructions: str


class SessionDetail(BaseModel):
    id: UUID
    code: str
    day_number: int
    order_index: int
    title: str
    description: str
    teaser_summary: str
    access: SessionAccess = "open"
    is_current: bool = False
    progress: SessionProgress = SessionProgress()
    # Una sesion abierta sin encargos sigue siendo una sesion que se puede abrir;
    # la lista vacia es un estado legitimo, no un error.
    challenges: list[ChallengeDetail]
    # El admin la abre para revisarla sin que cuente como progreso de nadie.
    preview: bool = False
