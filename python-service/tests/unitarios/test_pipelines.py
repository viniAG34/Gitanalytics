from datetime import datetime, timedelta, timezone

import pytest

from app.pipelines.pipeline_de_repositorio import (
    calcular_dias_desde_atualizacao,
    calcular_media_commits_por_semana,
    calcular_razao_de_issues,
    gerar_insights_de_repositorio,
)
from app.pipelines.pipeline_de_usuario import (
    calcular_distribuicao_de_linguagens,
    contar_repos_recentes,
    gerar_insights_de_usuario,
    obter_repositorio_mais_estrelado,
    somar_estrelas,
)
from app.schemas.entrada import CommitPorSemana, ResumoDeRepositorio
from app.schemas.saida import CompartilhamentoDeLinguagem


def _repo(
    nome: str = "repo",
    linguagem: str | None = "Python",
    estrelas: int = 0,
    dias_atras: int = 0,
) -> ResumoDeRepositorio:
    return ResumoDeRepositorio(
        nome=nome,
        linguagem=linguagem,
        estrelas=estrelas,
        forks=0,
        issues_abertas=0,
        atualizado_em=datetime.now(timezone.utc) - timedelta(days=dias_atras),
    )


class TestPipelineDeUsuario:
    def test_contar_repos_recentes_com_lista_vazia(self) -> None:
        assert contar_repos_recentes([], datetime.now(timezone.utc)) == 0

    def test_contar_repos_recentes_todos_dentro_da_janela(self) -> None:
        repos = [_repo(dias_atras=5), _repo(dias_atras=10)]
        assert contar_repos_recentes(repos, datetime.now(timezone.utc)) == 2

    def test_contar_repos_recentes_nenhum_dentro_da_janela(self) -> None:
        repos = [_repo(dias_atras=60), _repo(dias_atras=90)]
        assert contar_repos_recentes(repos, datetime.now(timezone.utc)) == 0

    def test_somar_estrelas_com_lista_vazia(self) -> None:
        assert somar_estrelas([]) == 0

    def test_somar_estrelas_soma_corretamente(self) -> None:
        repos = [_repo(estrelas=10), _repo(estrelas=20), _repo(estrelas=5)]
        assert somar_estrelas(repos) == 35

    def test_obter_repositorio_mais_estrelado_com_lista_vazia(self) -> None:
        assert obter_repositorio_mais_estrelado([]) is None

    def test_obter_repositorio_mais_estrelado_retorna_nome_correto(self) -> None:
        repos = [_repo("a", estrelas=5), _repo("b", estrelas=100), _repo("c", estrelas=10)]
        assert obter_repositorio_mais_estrelado(repos) == "b"

    def test_calcular_distribuicao_sem_linguagens(self) -> None:
        repos = [_repo(linguagem=None), _repo(linguagem=None)]
        assert calcular_distribuicao_de_linguagens(repos) == []

    def test_calcular_distribuicao_com_lista_vazia(self) -> None:
        assert calcular_distribuicao_de_linguagens([]) == []

    def test_calcular_distribuicao_percentuais_somam_100(self) -> None:
        repos = [_repo(linguagem="Python")] * 3 + [_repo(linguagem="Go")] * 1
        distribuicao = calcular_distribuicao_de_linguagens(repos)
        total = sum(d.percentual for d in distribuicao)
        assert total == pytest.approx(100.0, abs=0.1)

    def test_calcular_distribuicao_ignora_repos_sem_linguagem(self) -> None:
        repos = [_repo(linguagem="Python"), _repo(linguagem=None)]
        distribuicao = calcular_distribuicao_de_linguagens(repos)
        assert len(distribuicao) == 1
        assert distribuicao[0].linguagem == "Python"

    def test_gerar_insights_repositorios_vazios(self) -> None:
        insights = gerar_insights_de_usuario(0.0, [], repositorios_vazios=True)
        assert "Nenhum repositório público encontrado." in insights

    def test_gerar_insights_score_alto(self) -> None:
        insights = gerar_insights_de_usuario(85.0, [], repositorios_vazios=False)
        assert "Alta atividade de desenvolvimento." in insights

    def test_gerar_insights_score_baixo(self) -> None:
        insights = gerar_insights_de_usuario(20.0, [], repositorios_vazios=False)
        assert "Baixa atividade recente." in insights

    def test_gerar_insights_linguagem_dominante(self) -> None:
        top = [CompartilhamentoDeLinguagem(linguagem="Python", percentual=80.0)]
        insights = gerar_insights_de_usuario(50.0, top, repositorios_vazios=False)
        assert "Foco predominante em Python." in insights

    def test_gerar_insights_linguagem_nao_dominante_nao_gera_insight(self) -> None:
        top = [CompartilhamentoDeLinguagem(linguagem="Python", percentual=60.0)]
        insights = gerar_insights_de_usuario(50.0, top, repositorios_vazios=False)
        assert not any("Foco" in i for i in insights)

    def test_gerar_insights_maximo_4(self) -> None:
        top = [CompartilhamentoDeLinguagem(linguagem="Python", percentual=80.0)]
        insights = gerar_insights_de_usuario(85.0, top, repositorios_vazios=False)
        assert len(insights) <= 4


class TestPipelineDeRepositorio:
    def test_calcular_media_commits_lista_vazia(self) -> None:
        assert calcular_media_commits_por_semana([]) == 0.0

    def test_calcular_media_commits_corretamente(self) -> None:
        commits = [CommitPorSemana(semana="2024-01-01", total=10),
                   CommitPorSemana(semana="2024-01-08", total=20)]
        assert calcular_media_commits_por_semana(commits) == 15.0

    def test_calcular_razao_issues_estrelas_zero(self) -> None:
        assert calcular_razao_de_issues(10, 0) == 0.0

    def test_calcular_razao_issues_calculo_correto(self) -> None:
        assert calcular_razao_de_issues(5, 100) == pytest.approx(0.05)

    def test_calcular_dias_desde_atualizacao_hoje(self) -> None:
        agora = datetime.now(timezone.utc)
        assert calcular_dias_desde_atualizacao(agora, agora) == 0

    def test_calcular_dias_desde_atualizacao_30_dias(self) -> None:
        agora = datetime.now(timezone.utc)
        trinta_dias_atras = agora - timedelta(days=30)
        assert calcular_dias_desde_atualizacao(trinta_dias_atras, agora) == 30

    def test_calcular_dias_nao_retorna_negativo(self) -> None:
        agora = datetime.now(timezone.utc)
        futuro = agora + timedelta(days=5)
        assert calcular_dias_desde_atualizacao(futuro, agora) == 0

    def test_gerar_insights_health_score_alto(self) -> None:
        insights = gerar_insights_de_repositorio(90.0, 10, "estavel")
        assert "Projeto muito ativo e bem mantido." in insights

    def test_gerar_insights_sem_atualizacao_ha_muito_tempo(self) -> None:
        insights = gerar_insights_de_repositorio(50.0, 95, "estavel")
        assert "Projeto sem atualizações há mais de 90 dias." in insights

    def test_gerar_insights_tendencia_crescente(self) -> None:
        insights = gerar_insights_de_repositorio(50.0, 10, "crescente")
        assert "Atividade de commits em crescimento recente." in insights

    def test_gerar_insights_maximo_4(self) -> None:
        insights = gerar_insights_de_repositorio(90.0, 95, "crescente")
        assert len(insights) <= 4

    def test_gerar_insights_score_abaixo_limite_nao_gera_insight_de_ativo(self) -> None:
        insights = gerar_insights_de_repositorio(80.0, 10, "estavel")
        assert "Projeto muito ativo e bem mantido." not in insights
