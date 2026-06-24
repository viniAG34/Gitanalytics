import pytest

from app.utilitarios.calculadoras import (
    calcular_activity_score,
    calcular_health_score,
    calcular_tendencia_de_atividade,
)


class TestCalcularActivityScore:
    def test_sem_repositorios_retorna_zero(self) -> None:
        score = calcular_activity_score(
            repos_recentes=0,
            repos_total=0,
            total_estrelas=0,
            qtd_linguagens=0,
            repositorios_publicos=0,
        )
        assert score == 0.0

    def test_score_sempre_entre_zero_e_cem(self) -> None:
        score = calcular_activity_score(
            repos_recentes=100,
            repos_total=100,
            total_estrelas=1_000_000,
            qtd_linguagens=100,
            repositorios_publicos=1000,
        )
        assert 0.0 <= score <= 100.0

    def test_score_maximo_com_dados_ideais(self) -> None:
        score = calcular_activity_score(
            repos_recentes=10,
            repos_total=10,
            total_estrelas=100_000,
            qtd_linguagens=5,
            repositorios_publicos=128,
        )
        assert score == pytest.approx(100.0, abs=1.0)

    def test_repositorios_publicos_zero_nao_levanta_excecao(self) -> None:
        score = calcular_activity_score(
            repos_recentes=0,
            repos_total=0,
            total_estrelas=0,
            qtd_linguagens=0,
            repositorios_publicos=0,
        )
        assert score == 0.0

    def test_repos_total_zero_nao_levanta_excecao(self) -> None:
        score = calcular_activity_score(
            repos_recentes=5,
            repos_total=0,
            total_estrelas=10,
            qtd_linguagens=2,
            repositorios_publicos=5,
        )
        assert 0.0 <= score <= 100.0

    def test_score_cresce_com_mais_dados(self) -> None:
        score_baixo = calcular_activity_score(
            repos_recentes=1,
            repos_total=10,
            total_estrelas=10,
            qtd_linguagens=1,
            repositorios_publicos=5,
        )
        score_alto = calcular_activity_score(
            repos_recentes=10,
            repos_total=10,
            total_estrelas=1000,
            qtd_linguagens=5,
            repositorios_publicos=50,
        )
        assert score_alto > score_baixo


class TestCalcularHealthScore:
    def test_commits_zero_nao_levanta_excecao(self) -> None:
        score = calcular_health_score(
            media_commits_por_semana=0.0,
            razao_issues=0.0,
            dias_desde_atualizacao=0,
            forks=0,
        )
        assert 0.0 <= score <= 100.0

    def test_forks_zero_nao_levanta_excecao(self) -> None:
        score = calcular_health_score(
            media_commits_por_semana=5.0,
            razao_issues=0.0,
            dias_desde_atualizacao=10,
            forks=0,
        )
        assert 0.0 <= score <= 100.0

    def test_score_sempre_entre_zero_e_cem(self) -> None:
        score = calcular_health_score(
            media_commits_por_semana=100.0,
            razao_issues=10.0,
            dias_desde_atualizacao=365,
            forks=100_000,
        )
        assert 0.0 <= score <= 100.0

    def test_repositorio_inativo_score_baixo(self) -> None:
        score = calcular_health_score(
            media_commits_por_semana=0.0,
            razao_issues=1.0,
            dias_desde_atualizacao=365,
            forks=0,
        )
        assert score == 0.0

    def test_repositorio_ideal_score_alto(self) -> None:
        score = calcular_health_score(
            media_commits_por_semana=20.0,
            razao_issues=0.0,
            dias_desde_atualizacao=0,
            forks=10_000,
        )
        assert score == pytest.approx(100.0, abs=1.0)

    def test_razao_issues_alta_penaliza_score(self) -> None:
        score_sem_issues = calcular_health_score(
            media_commits_por_semana=5.0,
            razao_issues=0.0,
            dias_desde_atualizacao=30,
            forks=100,
        )
        score_com_issues = calcular_health_score(
            media_commits_por_semana=5.0,
            razao_issues=0.5,
            dias_desde_atualizacao=30,
            forks=100,
        )
        assert score_sem_issues > score_com_issues


class TestCalcularTendenciaDeAtividade:
    def test_lista_vazia_retorna_decrescente(self) -> None:
        assert calcular_tendencia_de_atividade([]) == "decrescente"

    def test_uma_semana_retorna_estavel(self) -> None:
        assert calcular_tendencia_de_atividade([10]) == "estavel"

    def test_duas_semanas_sem_mudanca_retorna_estavel(self) -> None:
        assert calcular_tendencia_de_atividade([10, 10]) == "estavel"

    def test_crescente_com_4_semanas(self) -> None:
        # últimas 2 semanas bem maiores que primeiras 2
        assert calcular_tendencia_de_atividade([2, 2, 20, 20]) == "crescente"

    def test_decrescente_com_4_semanas(self) -> None:
        # últimas 2 semanas bem menores que primeiras 2
        assert calcular_tendencia_de_atividade([20, 20, 2, 2]) == "decrescente"

    def test_estavel_com_variacao_pequena(self) -> None:
        # variação de 5% — abaixo do limiar de 10%
        assert calcular_tendencia_de_atividade([10, 10, 10, 10, 10, 10, 10, 10]) == "estavel"

    def test_crescente_com_8_semanas(self) -> None:
        # últimas 4 muito maiores que anteriores 4
        assert calcular_tendencia_de_atividade([1, 1, 1, 1, 20, 20, 20, 20]) == "crescente"

    def test_decrescente_com_8_semanas(self) -> None:
        assert calcular_tendencia_de_atividade([20, 20, 20, 20, 1, 1, 1, 1]) == "decrescente"

    def test_anteriores_zero_e_recentes_positivo_retorna_crescente(self) -> None:
        assert calcular_tendencia_de_atividade([0, 0, 5, 5]) == "crescente"

    def test_anteriores_zero_e_recentes_zero_retorna_estavel(self) -> None:
        assert calcular_tendencia_de_atividade([0, 0, 0, 0]) == "estavel"

    def test_mais_de_8_semanas_usa_apenas_ultimas_8(self) -> None:
        # semanas antigas muito altas não devem influenciar (últimas 4 crescentes sobre 4 anteriores)
        dados = [1000, 1000, 1, 1, 1, 1, 20, 20, 20, 20]
        assert calcular_tendencia_de_atividade(dados) == "crescente"
