# SDD-03 — python-service (Analisador)

**Pré-requisito:** SDD-01 e SDD-07 lidos.
**Entrega:** python-service funcional na porta 8000, endpoints `/analyze/user` e `/analyze/repo` respondendo conforme spec, testável via docker compose.

---

## 0. Spec por endpoint

---

### 0.1 Spec — `POST /analyze/user`

**Comportamento:**
- Recebe dados brutos de perfil de usuário do GitHub (coletados pelo node-service).
- Calcula `activityScore`, distribuição de linguagens, total de estrelas, repositório mais estrelado, contagem de repos atualizados nos últimos 30 dias, e gera lista de insights.
- Retorna `AnaliseDeUsuario` (tipo definido em SDD-01, seção 6).

**Regras:**
- `repositorios` pode ser lista vazia → retorna análise válida com todos os scores zerados e `insights: ["Nenhum repositório público encontrado."]`. Não é erro.
- `linguagem` pode ser `null` em qualquer repositório → ignorar esses repos no cálculo de distribuição de linguagens.
- `repos_updated_last_30_days` conta repos onde `atualizadoEm` está dentro dos últimos 30 dias a partir da data/hora da requisição.
- `activityScore` sempre entre 0.0 e 100.0 (clampado).
- Se `totalEstrelas` for 0 e nenhum repositório for encontrado: `repositorioMaisEstrelado` retorna `null`.
- Divisão por zero em qualquer cálculo intermediário → tratar como 0, nunca lançar exceção.

**Casos de borda:**
| Situação | Resultado |
|---|---|
| `repositorios: []` | `200` + análise zerada + `insights: ["Nenhum repositório público encontrado."]` |
| Todos os repos com `linguagem: null` | `200` + `topLinguagens: []` + demais campos calculados normalmente |
| `repositoriosPublicos: 0` | `200` + `activityScore` contribuição de volume = 0 |
| Payload sem campo obrigatório (ex: sem `username`) | `422` + detalhe do campo faltando (Pydantic) |
| Payload com tipo errado (ex: `seguidores: "abc"`) | `422` + detalhe do campo com tipo inválido |

**Critérios de aceite:**
- ✓ Payload válido com repos → `200` + `AnaliseDeUsuario` com todos os campos preenchidos
- ✓ `activityScore` entre 0 e 100 para qualquer entrada válida
- ✓ `repositorios: []` → `200` + scores zerados + insight de "nenhum repositório"
- ✓ Repos com `linguagem: null` → não causam erro, são ignorados na distribuição
- ✓ Payload sem `username` → `422` com detalhe do campo
- ✓ `repositorioMaisEstrelado: null` quando não há repositórios

---

### 0.2 Spec — `POST /analyze/repo`

**Comportamento:**
- Recebe dados brutos de um repositório do GitHub.
- Calcula `healthScore`, tendência de atividade, média de commits por semana, razão de issues abertas, dias desde a última atualização, e gera insights.
- Retorna `AnaliseDeRepositorio` (tipo em SDD-01, seção 6).

**Regras:**
- `commitsPorSemana` pode ser lista vazia (repositório sem commits no último ano) → `mediaDeCommitsPorSemana: 0`, `tendenciaDeAtividade: 'decrescente'`. Não é erro.
- `issuesAbertas / estrelas`: se `estrelas = 0`, `razaoDeIssuesAbertas = 0` (não dividir por zero).
- `diasDesdeUltimaAtualizacao`: calculado a partir da data/hora da requisição menos `atualizadoEm`.
- `tendenciaDeAtividade`: calculada comparando média das últimas 4 semanas vs média das 4 semanas anteriores a essas. Se `commitsPorSemana` tiver menos de 8 semanas → usar todas as semanas disponíveis; se menos de 2 semanas → `'estavel'`.
- `healthScore` sempre entre 0.0 e 100.0 (clampado).

**Casos de borda:**
| Situação | Resultado |
|---|---|
| `commitsPorSemana: []` | `200` + `mediaDeCommitsPorSemana: 0`, `tendenciaDeAtividade: 'decrescente'` |
| `estrelas: 0` | `200` + `razaoDeIssuesAbertas: 0` (sem divisão por zero) |
| `commitsPorSemana` com menos de 2 semanas | `200` + `tendenciaDeAtividade: 'estavel'` |
| `atualizadoEm` hoje | `200` + `diasDesdeUltimaAtualizacao: 0` |
| Payload sem `owner` | `422` + detalhe do campo |

**Critérios de aceite:**
- ✓ Payload válido → `200` + `AnaliseDeRepositorio` com todos os campos preenchidos
- ✓ `healthScore` entre 0 e 100 para qualquer entrada válida
- ✓ `commitsPorSemana: []` → `mediaDeCommitsPorSemana: 0`, sem erro
- ✓ `estrelas: 0` → `razaoDeIssuesAbertas: 0`, sem erro de divisão
- ✓ Menos de 2 semanas de commits → `tendenciaDeAtividade: 'estavel'`
- ✓ Payload inválido → `422` com detalhe Pydantic

---

### 0.3 Spec — `GET /health`

**Comportamento:** health check para Docker Compose e Nginx.

**Critérios de aceite:**
- ✓ `GET /health` → `200` + `{ "status": "ok" }`
- ✓ Responde em menos de 100ms

---

### 0.4 Review das specs (checklist aplicado)

| Verificação | Resultado |
|---|---|
| Todas as permissões definidas? | ✓ Sem autenticação — serviço interno, não exposto ao frontend. Nginx garante isolamento. |
| Todos os casos de erro mapeados? | ✓ 422 para payload inválido (Pydantic automático). Todos os casos de divisão por zero e lista vazia explicitados. |
| Decisões de negócio são do dono? | ✓ Pesos dos scores, fórmula de tendência, critério de "menos de 2 semanas → estável" — todos explicitados na seção 1. |
| Critérios de aceite verificáveis? | ✓ Todos testáveis com payload fixo e comparação de resultado. |
| Casos de borda esquecidos? | Rate limit: não aplicável (sem chamadas externas). Concorrência: FastAPI + Uvicorn é assíncrono por padrão, sem estado compartilhado entre requisições. |

---

## 1. Fórmulas de cálculo (decisões de negócio explícitas)

### 1.1 Activity Score (usuário) — 0 a 100

| Fator | Peso | Fórmula |
|---|---|---|
| Repos atualizados nos últimos 30 dias | 35% | `min(reposRecentes / reposTotal, 1.0)` se reposTotal > 0, senão 0 |
| Total de estrelas | 25% | `min(log10(totalEstrelas + 1) / 5, 1.0)` |
| Diversidade de linguagens | 20% | `min(qtdLinguagens / 5, 1.0)` |
| Volume de repositórios públicos | 20% | `min(log2(repositoriosPublicos + 1) / 7, 1.0)` |

`activityScore = (fator1 * 0.35 + fator2 * 0.25 + fator3 * 0.20 + fator4 * 0.20) * 100`

### 1.2 Health Score (repositório) — 0 a 100

| Fator | Peso | Fórmula |
|---|---|---|
| Frequência de commits | 40% | `min(mediaCommitsPorSemana / 20, 1.0)` |
| Razão de issues abertas | 25% | `max(1 - razaoDeIssues * 10, 0)` |
| Recência da última atualização | 20% | `max(1 - diasDesdeAtualizacao / 180, 0)` |
| Volume de forks | 15% | `min(log10(forks + 1) / 4, 1.0)` |

`healthScore = (fator1 * 0.40 + fator2 * 0.25 + fator3 * 0.20 + fator4 * 0.15) * 100`

### 1.3 Tendência de atividade

```
ultimas4Semanas = média de commits das 4 semanas mais recentes em commitsPorSemana
anteriores4Semanas = média de commits das 4 semanas imediatamente anteriores

se len(commitsPorSemana) < 2: tendencia = 'estavel'
se ultimas4 > anteriores4 * 1.1: tendencia = 'crescente'
se ultimas4 < anteriores4 * 0.9: tendencia = 'decrescente'
senão: tendencia = 'estavel'
```

### 1.4 Geração de insights

Insights são strings geradas por regras fixas (não por IA generativa). Exemplos de regras:

| Condição | Insight gerado |
|---|---|
| `activityScore >= 80` | `"Alta atividade de desenvolvimento."` |
| `activityScore < 30` | `"Baixa atividade recente."` |
| Linguagem dominante > 70% | `"Foco predominante em {linguagem}."` |
| `healthScore >= 85` | `"Projeto muito ativo e bem mantido."` |
| `diasDesdeAtualizacao > 90` | `"Projeto sem atualizações há mais de 90 dias."` |
| `tendenciaDeAtividade == 'crescente'` | `"Atividade de commits em crescimento recente."` |
| `repositorios: []` | `"Nenhum repositório público encontrado."` |

Máximo de 4 insights por resposta. Se nenhuma regra disparar: `insights: []`.

---

## 2. Stack técnica

| Categoria | Tecnologia | Observação |
|---|---|---|
| Linguagem | Python 3.11+ | |
| Framework | FastAPI | Async, Pydantic integrado |
| Servidor | Uvicorn | ASGI |
| Análise | Pandas | Manipulação de dados |
| Validação | Pydantic v2 | Schemas de entrada e saída |
| Testes | Pytest + httpx | Unitários e de endpoint |
| Linting | Ruff | Linter + formatter |
| Container | Docker | python:3.11-slim |

---

## 3. Estrutura de diretórios

```
python-service/
  app/
    api/v1/rotas/
      analise.py         # rotas FastAPI
    schemas/
      entrada.py         # UserAnalysisRequest, RepoAnalysisRequest (Pydantic)
      saida.py           # UserAnalysisResponse, RepoAnalysisResponse (Pydantic)
    servicos/
      servico_de_analise_de_usuario.py
      servico_de_analise_de_repositorio.py
    pipelines/
      pipeline_de_usuario.py   # funções puras de transformação
      pipeline_de_repositorio.py
    utilitarios/
      constantes.py      # PESO_*, LIMITE_*, etc.
      calculadoras.py    # funções puras: calcular_activity_score, etc.
    main.py
    config.py
  tests/
    unitarios/
    test_api/
  Dockerfile
  requirements.txt
```

---

## 4. Schemas Pydantic (contratos de entrada/saída)

### Entrada: `UserAnalysisRequest`
```python
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
    repositorios: List[ResumoDeRepositorio]
```

### Entrada: `RepoAnalysisRequest`
```python
class CommitPorSemana(BaseModel):
    semana: str  # ISO 8601
    total: int = Field(ge=0)

class RepoAnalysisRequest(BaseModel):
    owner: str = Field(min_length=1)
    repo: str = Field(min_length=1)
    estrelas: int = Field(ge=0)
    forks: int = Field(ge=0)
    issues_abertas: int = Field(ge=0)
    linguagem: Optional[str] = None
    atualizado_em: datetime
    commits_por_semana: List[CommitPorSemana]
```

### Saída: `UserAnalysisResponse`
```python
class CompartilhamentoDeLinguagem(BaseModel):
    linguagem: str
    percentual: float

class UserAnalysisResponse(BaseModel):
    username: str
    activity_score: float = Field(ge=0, le=100)
    top_linguagens: List[CompartilhamentoDeLinguagem]
    total_estrelas: int
    repositorio_mais_estrelado: Optional[str]
    repos_atualizados_ultimos_30_dias: int
    insights: List[str]
```

---

## 5. Constantes obrigatórias (`utilitarios/constantes.py`)

```python
# Pesos do activity score (spec 0.1 / seção 1.1)
PESO_REPOS_RECENTES = 0.35
PESO_TOTAL_ESTRELAS = 0.25
PESO_DIVERSIDADE_LINGUAGENS = 0.20
PESO_VOLUME_REPOSITORIOS = 0.20

# Pesos do health score (spec 0.2 / seção 1.2)
PESO_FREQUENCIA_COMMITS = 0.40
PESO_RAZAO_ISSUES = 0.25
PESO_RECENCIA_ATUALIZACAO = 0.20
PESO_VOLUME_FORKS = 0.15

# Limites de normalização (seção 1.1 e 1.2)
MAX_REPOS_RECENTES_PARA_NORMALIZACAO = 10  # não usado diretamente na fórmula mas documenta a intenção
MAX_COMMITS_SEMANA_PARA_NORMALIZACAO = 20
MAX_LINGUAGENS_PARA_NORMALIZACAO = 5
DIAS_SEM_ATUALIZACAO_PARA_SCORE_ZERO = 180

# Tendência (seção 1.3)
SEMANAS_PARA_CALCULO_DE_TENDENCIA = 4
LIMIAR_CRESCIMENTO_TENDENCIA = 1.1
LIMIAR_QUEDA_TENDENCIA = 0.9

# Insights (seção 1.4)
MAX_INSIGHTS_POR_RESPOSTA = 4
LIMITE_SCORE_ALTO = 80
LIMITE_SCORE_BAIXO = 30
LIMITE_PERCENTUAL_LINGUAGEM_DOMINANTE = 70
LIMITE_DIAS_SEM_ATUALIZACAO_PARA_INSIGHT = 90
```

---

## 6. Estratégia de testes

### Unitários (Pytest)
- `calcular_activity_score`: testar com 0 repos, 1 repo, muitos repos, todos valores extremos.
- `calcular_health_score`: testar com `commitsPorSemana: []`, `estrelas: 0`, repositório inativo.
- `calcular_tendencia_de_atividade`: testar com < 2 semanas, 4 semanas, 8+ semanas.
- `gerar_insights`: testar cada regra isoladamente com valor de gatilho e valor abaixo do gatilho.

### Testes de API (Pytest + httpx)
- `POST /analyze/user` com payload completo → verificar todos os campos do response.
- `POST /analyze/user` com `repositorios: []` → verificar scores zerados + insight.
- `POST /analyze/repo` com `commitsPorSemana: []` → verificar média 0 + tendência 'decrescente'.
- `POST /analyze/repo` com `estrelas: 0` → verificar `razaoDeIssuesAbertas: 0`.
- Ambos endpoints com payload inválido (campo faltando) → `422`.

---

## 7. Critérios de conclusão desta etapa

- [ ] Todos os critérios de aceite das specs 0.1, 0.2 e 0.3 verificados.
- [ ] `activityScore` e `healthScore` sempre entre 0 e 100 — verificado com inputs extremos (0 repos, estrelas altíssimas, etc.).
- [ ] Divisão por zero impossível — testado com `estrelas: 0`, `repositorios: []`.
- [ ] Fórmulas da seção 1 implementadas exatamente como especificado (sem variação da IA).
- [ ] Constantes da seção 5 usadas — nenhum número mágico no código de pipeline.
- [ ] Pydantic rejeitando payload inválido com `422` automaticamente.
- [ ] Cobertura de testes: ≥ 85% nas funções de pipeline e calculadoras.
