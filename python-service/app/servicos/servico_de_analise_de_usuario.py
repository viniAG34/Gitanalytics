from datetime import datetime, timezone

from app.pipelines.pipeline_de_usuario import (
    calcular_distribuicao_de_linguagens,
    contar_repos_recentes,
    gerar_insights_de_usuario,
    obter_repositorio_mais_estrelado,
    somar_estrelas,
)
from app.schemas.entrada import UserAnalysisRequest
from app.schemas.saida import UserAnalysisResponse
from app.utilitarios.calculadoras import calcular_activity_score


def analisar_usuario(requisicao: UserAnalysisRequest) -> UserAnalysisResponse:
    data_ref = datetime.now(timezone.utc)
    repositorios = requisicao.repositorios

    total_estrelas = somar_estrelas(repositorios)
    repos_recentes = contar_repos_recentes(repositorios, data_ref)
    top_linguagens = calcular_distribuicao_de_linguagens(repositorios)
    repositorio_mais_estrelado = obter_repositorio_mais_estrelado(repositorios)

    qtd_linguagens = len(top_linguagens)
    repos_total = len(repositorios)

    activity_score = calcular_activity_score(
        repos_recentes=repos_recentes,
        repos_total=repos_total,
        total_estrelas=total_estrelas,
        qtd_linguagens=qtd_linguagens,
        repositorios_publicos=requisicao.repositorios_publicos,
    )

    insights = gerar_insights_de_usuario(
        activity_score=activity_score,
        top_linguagens=top_linguagens,
        repositorios_vazios=not repositorios,
    )

    return UserAnalysisResponse(
        username=requisicao.username,
        activity_score=activity_score,
        top_linguagens=top_linguagens,
        total_estrelas=total_estrelas,
        repositorio_mais_estrelado=repositorio_mais_estrelado,
        repos_atualizados_ultimos_30_dias=repos_recentes,
        insights=insights,
    )
