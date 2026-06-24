from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.schemas.entrada import ResumoDeRepositorio
from app.schemas.saida import CompartilhamentoDeLinguagem
from app.utilitarios.constantes import (
    DIAS_PARA_REPOS_RECENTES,
    LIMITE_PERCENTUAL_LINGUAGEM_DOMINANTE,
    LIMITE_SCORE_ALTO,
    LIMITE_SCORE_BAIXO,
    MAX_INSIGHTS_POR_RESPOSTA,
)


def _normalizar_para_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def contar_repos_recentes(
    repositorios: list[ResumoDeRepositorio],
    data_ref: datetime,
) -> int:
    ref_utc = _normalizar_para_utc(data_ref)
    corte = ref_utc - timedelta(days=DIAS_PARA_REPOS_RECENTES)
    return sum(
        1
        for repo in repositorios
        if _normalizar_para_utc(repo.atualizado_em) > corte
    )


def somar_estrelas(repositorios: list[ResumoDeRepositorio]) -> int:
    return sum(repo.estrelas for repo in repositorios)


def obter_repositorio_mais_estrelado(
    repositorios: list[ResumoDeRepositorio],
) -> Optional[str]:
    if not repositorios:
        return None
    return max(repositorios, key=lambda r: r.estrelas).nome


def calcular_distribuicao_de_linguagens(
    repositorios: list[ResumoDeRepositorio],
) -> list[CompartilhamentoDeLinguagem]:
    linguagens = [r.linguagem for r in repositorios if r.linguagem is not None]
    if not linguagens:
        return []

    contagem = Counter(linguagens)
    total = len(linguagens)

    return [
        CompartilhamentoDeLinguagem(
            linguagem=lingua,
            percentual=round((qtd / total) * 100, 1),
        )
        for lingua, qtd in contagem.most_common()
    ]


def gerar_insights_de_usuario(
    activity_score: float,
    top_linguagens: list[CompartilhamentoDeLinguagem],
    repositorios_vazios: bool,
) -> list[str]:
    insights: list[str] = []

    if repositorios_vazios:
        insights.append("Nenhum repositório público encontrado.")
        return insights

    if activity_score >= LIMITE_SCORE_ALTO:
        insights.append("Alta atividade de desenvolvimento.")
    elif activity_score < LIMITE_SCORE_BAIXO:
        insights.append("Baixa atividade recente.")

    if (
        top_linguagens
        and top_linguagens[0].percentual > LIMITE_PERCENTUAL_LINGUAGEM_DOMINANTE
    ):
        insights.append(f"Foco predominante em {top_linguagens[0].linguagem}.")

    return insights[:MAX_INSIGHTS_POR_RESPOSTA]
