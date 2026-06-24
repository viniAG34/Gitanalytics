from typing import Literal, Optional

from pydantic import BaseModel, Field


class CompartilhamentoDeLinguagem(BaseModel):
    linguagem: str
    percentual: float


class UserAnalysisResponse(BaseModel):
    username: str
    activity_score: float = Field(ge=0, le=100)
    top_linguagens: list[CompartilhamentoDeLinguagem]
    total_estrelas: int
    repositorio_mais_estrelado: Optional[str]
    repos_atualizados_ultimos_30_dias: int
    insights: list[str]


class RepoAnalysisResponse(BaseModel):
    repo: str
    health_score: float = Field(ge=0, le=100)
    tendencia_de_atividade: Literal["crescente", "estavel", "decrescente"]
    media_de_commits_por_semana: float
    razao_de_issues_abertas: float
    dias_desde_ultima_atualizacao: int
    insights: list[str]
