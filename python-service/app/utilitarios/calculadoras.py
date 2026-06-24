import math

from app.utilitarios.constantes import (
    DIAS_SEM_ATUALIZACAO_PARA_SCORE_ZERO,
    DIVISOR_LOG10_ESTRELAS,
    DIVISOR_LOG10_FORKS,
    DIVISOR_LOG2_REPOSITORIOS,
    FATOR_PENALIZACAO_ISSUES,
    LIMIAR_CRESCIMENTO_TENDENCIA,
    LIMIAR_QUEDA_TENDENCIA,
    MAX_COMMITS_SEMANA_PARA_NORMALIZACAO,
    MAX_LINGUAGENS_PARA_NORMALIZACAO,
    PESO_DIVERSIDADE_LINGUAGENS,
    PESO_FREQUENCIA_COMMITS,
    PESO_RAZAO_ISSUES,
    PESO_RECENCIA_ATUALIZACAO,
    PESO_REPOS_RECENTES,
    PESO_TOTAL_ESTRELAS,
    PESO_VOLUME_FORKS,
    PESO_VOLUME_REPOSITORIOS,
    SEMANAS_PARA_CALCULO_DE_TENDENCIA,
)


def calcular_activity_score(
    repos_recentes: int,
    repos_total: int,
    total_estrelas: int,
    qtd_linguagens: int,
    repositorios_publicos: int,
) -> float:
    fator_repos_recentes = (
        min(repos_recentes / repos_total, 1.0) if repos_total > 0 else 0.0
    )
    fator_estrelas = min(
        math.log10(total_estrelas + 1) / DIVISOR_LOG10_ESTRELAS, 1.0
    )
    fator_linguagens = min(qtd_linguagens / MAX_LINGUAGENS_PARA_NORMALIZACAO, 1.0)
    fator_volume = min(
        math.log2(repositorios_publicos + 1) / DIVISOR_LOG2_REPOSITORIOS, 1.0
    )

    score = (
        fator_repos_recentes * PESO_REPOS_RECENTES
        + fator_estrelas * PESO_TOTAL_ESTRELAS
        + fator_linguagens * PESO_DIVERSIDADE_LINGUAGENS
        + fator_volume * PESO_VOLUME_REPOSITORIOS
    ) * 100

    return max(0.0, min(score, 100.0))


def calcular_health_score(
    media_commits_por_semana: float,
    razao_issues: float,
    dias_desde_atualizacao: int,
    forks: int,
) -> float:
    fator_commits = min(
        media_commits_por_semana / MAX_COMMITS_SEMANA_PARA_NORMALIZACAO, 1.0
    )
    fator_issues = max(1.0 - razao_issues * FATOR_PENALIZACAO_ISSUES, 0.0)
    fator_recencia = max(
        1.0 - dias_desde_atualizacao / DIAS_SEM_ATUALIZACAO_PARA_SCORE_ZERO, 0.0
    )
    fator_forks = min(math.log10(forks + 1) / DIVISOR_LOG10_FORKS, 1.0)

    score = (
        fator_commits * PESO_FREQUENCIA_COMMITS
        + fator_issues * PESO_RAZAO_ISSUES
        + fator_recencia * PESO_RECENCIA_ATUALIZACAO
        + fator_forks * PESO_VOLUME_FORKS
    ) * 100

    return max(0.0, min(score, 100.0))


def calcular_tendencia_de_atividade(totais_de_commits: list[int]) -> str:
    quantidade = len(totais_de_commits)

    if quantidade == 0:
        return "decrescente"
    if quantidade == 1:
        return "estavel"

    metade = min(SEMANAS_PARA_CALCULO_DE_TENDENCIA, quantidade // 2)
    ultimas = totais_de_commits[-metade:]
    anteriores = totais_de_commits[-(metade * 2) : -metade]

    if not anteriores:
        return "estavel"

    media_ultimas = sum(ultimas) / len(ultimas)
    media_anteriores = sum(anteriores) / len(anteriores)

    if media_anteriores == 0:
        return "crescente" if media_ultimas > 0 else "estavel"

    if media_ultimas > media_anteriores * LIMIAR_CRESCIMENTO_TENDENCIA:
        return "crescente"
    if media_ultimas < media_anteriores * LIMIAR_QUEDA_TENDENCIA:
        return "decrescente"
    return "estavel"
