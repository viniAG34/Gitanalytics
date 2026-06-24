from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ResumoDeRepositorio(BaseModel):
    nome: str
    linguagem: Optional[str] = None
    estrelas: int = Field(ge=0)
    forks: int = Field(ge=0)
    issues_abertas: int = Field(ge=0)
    atualizado_em: datetime


class UserAnalysisRequest(BaseModel):
    username: str = Field(min_length=1)
    repositorios_publicos: int = Field(ge=0)
    seguidores: int = Field(ge=0)
    repositorios: list[ResumoDeRepositorio]


class CommitPorSemana(BaseModel):
    semana: str
    total: int = Field(ge=0)


class RepoAnalysisRequest(BaseModel):
    owner: str = Field(min_length=1)
    repo: str = Field(min_length=1)
    estrelas: int = Field(ge=0)
    forks: int = Field(ge=0)
    issues_abertas: int = Field(ge=0)
    linguagem: Optional[str] = None
    atualizado_em: datetime
    commits_por_semana: list[CommitPorSemana]
