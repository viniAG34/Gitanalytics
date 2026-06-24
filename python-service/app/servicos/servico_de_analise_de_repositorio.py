from datetime import datetime, timezone

from app.pipelines.pipeline_de_repositorio import (
    calcular_dias_desde_atualizacao,
    calcular_media_commits_por_semana,
    calcular_razao_de_issues,
    extrair_totais_de_commits,
    gerar_insights_de_repositorio,
)
from app.schemas.entrada import RepoAnalysisRequest
from app.schemas.saida import RepoAnalysisResponse
from app.utilitarios.calculadoras import (
    calcular_health_score,
    calcular_tendencia_de_atividade,
)


def analisar_repositorio(requisicao: RepoAnalysisRequest) -> RepoAnalysisResponse:
    data_ref = datetime.now(timezone.utc)

    media_commits = calcular_media_commits_por_semana(requisicao.commits_por_semana)
    razao_issues = calcular_razao_de_issues(
        requisicao.issues_abertas, requisicao.estrelas
    )
    dias_desde_atualizacao = calcular_dias_desde_atualizacao(
        requisicao.atualizado_em, data_ref
    )
    totais_de_commits = extrair_totais_de_commits(requisicao.commits_por_semana)
    tendencia = calcular_tendencia_de_atividade(totais_de_commits)

    health_score = calcular_health_score(
        media_commits_por_semana=media_commits,
        razao_issues=razao_issues,
        dias_desde_atualizacao=dias_desde_atualizacao,
        forks=requisicao.forks,
    )

    insights = gerar_insights_de_repositorio(
        health_score=health_score,
        dias_desde_atualizacao=dias_desde_atualizacao,
        tendencia_de_atividade=tendencia,
    )

    return RepoAnalysisResponse(
        repo=requisicao.repo,
        health_score=health_score,
        tendencia_de_atividade=tendencia,
        media_de_commits_por_semana=media_commits,
        razao_de_issues_abertas=razao_issues,
        dias_desde_ultima_atualizacao=dias_desde_atualizacao,
        insights=insights,
    )
