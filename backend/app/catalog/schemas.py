from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class ChallengeTeaser(BaseModel):
    id: UUID
    key: str
    title: str
    teaser_summary: str
    kind: Literal["core", "platinum", "manual"]
    unlocked: bool


class SessionTeaser(BaseModel):
    id: UUID
    code: str
    day_number: int
    order_index: int
    title: str
    teaser_summary: str
    state: Literal["done", "active", "future"]
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
    # Una sesion abierta sin encargos sigue siendo una sesion que se puede abrir;
    # la lista vacia es un estado legitimo, no un error.
    challenges: list[ChallengeDetail]
    # El admin la abre para revisarla sin que cuente como progreso de nadie.
    preview: bool = False
