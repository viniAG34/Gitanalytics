from datetime import datetime, timezone

from app.schemas.entrada import CommitPorSemana
from app.utilitarios.constantes import (
    LIMITE_DIAS_SEM_ATUALIZACAO_PARA_INSIGHT,
    LIMITE_HEALTH_SCORE_ALTO,
    MAX_INSIGHTS_POR_RESPOSTA,
)


def _normalizar_para_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def calcular_media_commits_por_semana(
    commits_por_semana: list[CommitPorSemana],
) -> float:
    if not commits_por_semana:
        return 0.0
    return sum(c.total for c in commits_por_semana) / len(commits_por_semana)


def calcular_razao_de_issues(issues_abertas: int, estrelas: int) -> float:
    if estrelas == 0:
        return 0.0
    return issues_abertas / estrelas


def calcular_dias_desde_atualizacao(
    atualizado_em: datetime,
    data_ref: datetime,
) -> int:
    delta = _normalizar_para_utc(data_ref) - _normalizar_para_utc(atualizado_em)
    return max(0, delta.days)


def extrair_totais_de_commits(commits_por_semana: list[CommitPorSemana]) -> list[int]:
    return [c.total for c in commits_por_semana]


def gerar_insights_de_repositorio(
    health_score: float,
    dias_desde_atualizacao: int,
    tendencia_de_atividade: str,
) -> list[str]:
    insights: list[str] = []

    if health_score >= LIMITE_HEALTH_SCORE_ALTO:
        insights.append("Projeto muito ativo e bem mantido.")

    if dias_desde_atualizacao > LIMITE_DIAS_SEM_ATUALIZACAO_PARA_INSIGHT:
        insights.append("Projeto sem atualizações há mais de 90 dias.")

    if tendencia_de_atividade == "crescente":
        insights.append("Atividade de commits em crescimento recente.")

    return insights[:MAX_INSIGHTS_POR_RESPOSTA]
