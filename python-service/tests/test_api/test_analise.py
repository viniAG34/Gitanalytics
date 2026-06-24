from fastapi.testclient import TestClient


PAYLOAD_USUARIO_VALIDO = {
    "username": "torvalds",
    "repositorios_publicos": 10,
    "seguidores": 5000,
    "repositorios": [
        {
            "nome": "linux",
            "linguagem": "C",
            "estrelas": 150000,
            "forks": 50000,
            "issues_abertas": 300,
            "atualizado_em": "2024-06-01T00:00:00",
        },
        {
            "nome": "subsurface",
            "linguagem": "C++",
            "estrelas": 2000,
            "forks": 500,
            "issues_abertas": 50,
            "atualizado_em": "2024-05-15T00:00:00",
        },
    ],
}

PAYLOAD_REPO_VALIDO = {
    "owner": "facebook",
    "repo": "react",
    "estrelas": 200000,
    "forks": 40000,
    "issues_abertas": 1000,
    "linguagem": "JavaScript",
    "atualizado_em": "2024-06-01T00:00:00",
    "commits_por_semana": [
        {"semana": "2024-01-01", "total": 10},
        {"semana": "2024-01-08", "total": 12},
        {"semana": "2024-01-15", "total": 15},
        {"semana": "2024-01-22", "total": 18},
        {"semana": "2024-01-29", "total": 20},
        {"semana": "2024-02-05", "total": 25},
        {"semana": "2024-02-12", "total": 22},
        {"semana": "2024-02-19", "total": 28},
    ],
}


class TestEndpointDeAnaliseDeUsuario:
    def test_payload_valido_retorna_200_com_todos_os_campos(
        self, cliente: TestClient
    ) -> None:
        resposta = cliente.post("/analyze/user", json=PAYLOAD_USUARIO_VALIDO)
        assert resposta.status_code == 200
        dados = resposta.json()
        assert "username" in dados
        assert "activity_score" in dados
        assert "top_linguagens" in dados
        assert "total_estrelas" in dados
        assert "repositorio_mais_estrelado" in dados
        assert "repos_atualizados_ultimos_30_dias" in dados
        assert "insights" in dados

    def test_activity_score_entre_zero_e_cem(self, cliente: TestClient) -> None:
        resposta = cliente.post("/analyze/user", json=PAYLOAD_USUARIO_VALIDO)
        assert resposta.status_code == 200
        score = resposta.json()["activity_score"]
        assert 0.0 <= score <= 100.0

    def test_repositorios_vazios_retorna_scores_zerados_e_insight(
        self, cliente: TestClient
    ) -> None:
        payload = {
            "username": "test",
            "repositorios_publicos": 0,
            "seguidores": 0,
            "repositorios": [],
        }
        resposta = cliente.post("/analyze/user", json=payload)
        assert resposta.status_code == 200
        dados = resposta.json()
        assert dados["activity_score"] == 0.0
        assert dados["total_estrelas"] == 0
        assert dados["repositorio_mais_estrelado"] is None
        assert "Nenhum repositório público encontrado." in dados["insights"]

    def test_repositorios_com_linguagem_null_nao_causam_erro(
        self, cliente: TestClient
    ) -> None:
        payload = {
            "username": "user",
            "repositorios_publicos": 2,
            "seguidores": 10,
            "repositorios": [
                {
                    "nome": "repo1",
                    "linguagem": None,
                    "estrelas": 5,
                    "forks": 0,
                    "issues_abertas": 0,
                    "atualizado_em": "2024-06-01T00:00:00",
                }
            ],
        }
        resposta = cliente.post("/analyze/user", json=payload)
        assert resposta.status_code == 200
        assert resposta.json()["top_linguagens"] == []

    def test_payload_sem_username_retorna_422(self, cliente: TestClient) -> None:
        payload = {
            "repositorios_publicos": 5,
            "seguidores": 100,
            "repositorios": [],
        }
        resposta = cliente.post("/analyze/user", json=payload)
        assert resposta.status_code == 422

    def test_payload_com_tipo_errado_retorna_422(self, cliente: TestClient) -> None:
        payload = {**PAYLOAD_USUARIO_VALIDO, "seguidores": "abc"}
        resposta = cliente.post("/analyze/user", json=payload)
        assert resposta.status_code == 422

    def test_repositorio_mais_estrelado_nulo_quando_sem_repos(
        self, cliente: TestClient
    ) -> None:
        payload = {
            "username": "vazio",
            "repositorios_publicos": 0,
            "seguidores": 0,
            "repositorios": [],
        }
        resposta = cliente.post("/analyze/user", json=payload)
        assert resposta.json()["repositorio_mais_estrelado"] is None


class TestEndpointDeAnaliseDeRepositorio:
    def test_payload_valido_retorna_200_com_todos_os_campos(
        self, cliente: TestClient
    ) -> None:
        resposta = cliente.post("/analyze/repo", json=PAYLOAD_REPO_VALIDO)
        assert resposta.status_code == 200
        dados = resposta.json()
        assert "repo" in dados
        assert "health_score" in dados
        assert "tendencia_de_atividade" in dados
        assert "media_de_commits_por_semana" in dados
        assert "razao_de_issues_abertas" in dados
        assert "dias_desde_ultima_atualizacao" in dados
        assert "insights" in dados

    def test_health_score_entre_zero_e_cem(self, cliente: TestClient) -> None:
        resposta = cliente.post("/analyze/repo", json=PAYLOAD_REPO_VALIDO)
        assert resposta.status_code == 200
        score = resposta.json()["health_score"]
        assert 0.0 <= score <= 100.0

    def test_commits_por_semana_vazio_retorna_media_zero_e_tendencia_decrescente(
        self, cliente: TestClient
    ) -> None:
        payload = {
            "owner": "fb",
            "repo": "react",
            "estrelas": 0,
            "forks": 0,
            "issues_abertas": 0,
            "linguagem": None,
            "atualizado_em": "2024-01-01T00:00:00",
            "commits_por_semana": [],
        }
        resposta = cliente.post("/analyze/repo", json=payload)
        assert resposta.status_code == 200
        dados = resposta.json()
        assert dados["media_de_commits_por_semana"] == 0.0
        assert dados["tendencia_de_atividade"] == "decrescente"

    def test_estrelas_zero_razao_issues_zero_sem_divisao_por_zero(
        self, cliente: TestClient
    ) -> None:
        payload = {**PAYLOAD_REPO_VALIDO, "estrelas": 0, "issues_abertas": 10}
        resposta = cliente.post("/analyze/repo", json=payload)
        assert resposta.status_code == 200
        assert resposta.json()["razao_de_issues_abertas"] == 0.0

    def test_menos_de_2_semanas_tendencia_estavel(self, cliente: TestClient) -> None:
        payload = {
            **PAYLOAD_REPO_VALIDO,
            "commits_por_semana": [{"semana": "2024-01-01", "total": 5}],
        }
        resposta = cliente.post("/analyze/repo", json=payload)
        assert resposta.status_code == 200
        assert resposta.json()["tendencia_de_atividade"] == "estavel"

    def test_payload_sem_owner_retorna_422(self, cliente: TestClient) -> None:
        payload = {k: v for k, v in PAYLOAD_REPO_VALIDO.items() if k != "owner"}
        resposta = cliente.post("/analyze/repo", json=payload)
        assert resposta.status_code == 422

    def test_tendencia_de_atividade_valor_valido(self, cliente: TestClient) -> None:
        resposta = cliente.post("/analyze/repo", json=PAYLOAD_REPO_VALIDO)
        assert resposta.status_code == 200
        tendencia = resposta.json()["tendencia_de_atividade"]
        assert tendencia in {"crescente", "estavel", "decrescente"}


class TestEndpointDeHealth:
    def test_health_retorna_200_com_status_ok(self, cliente: TestClient) -> None:
        resposta = cliente.get("/health")
        assert resposta.status_code == 200
        assert resposta.json() == {"status": "ok"}
