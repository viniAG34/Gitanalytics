# Pesos do activity score (SDD-03 spec 0.1 / seção 1.1)
PESO_REPOS_RECENTES = 0.35
PESO_TOTAL_ESTRELAS = 0.25
PESO_DIVERSIDADE_LINGUAGENS = 0.20
PESO_VOLUME_REPOSITORIOS = 0.20

# Pesos do health score (SDD-03 spec 0.2 / seção 1.2)
PESO_FREQUENCIA_COMMITS = 0.40
PESO_RAZAO_ISSUES = 0.25
PESO_RECENCIA_ATUALIZACAO = 0.20
PESO_VOLUME_FORKS = 0.15

# Limites de normalização (SDD-03 seção 1.1 e 1.2)
MAX_REPOS_RECENTES_PARA_NORMALIZACAO = 10  # documenta intenção — fórmula usa reposTotal dinamicamente
MAX_COMMITS_SEMANA_PARA_NORMALIZACAO = 20
MAX_LINGUAGENS_PARA_NORMALIZACAO = 5
DIAS_SEM_ATUALIZACAO_PARA_SCORE_ZERO = 180

# Divisores dos logaritmos usados nas fórmulas (SDD-03 seção 1.1 e 1.2)
# log10(100_001) ≈ 5 → 100K estrelas = score máximo
DIVISOR_LOG10_ESTRELAS = 5
# log2(128) ≈ 7 → 127 repositórios = score máximo
DIVISOR_LOG2_REPOSITORIOS = 7
# log10(10_001) ≈ 4 → 10K forks = score máximo
DIVISOR_LOG10_FORKS = 4

# Fator de penalização da razão de issues (SDD-03 seção 1.2)
# razao * 10: razão de 0.1 já zera o fator (1 issue por 10 estrelas = máximo aceitável)
FATOR_PENALIZACAO_ISSUES = 10

# Janela de tempo para contagem de repositórios recentes (SDD-03 spec 0.1)
DIAS_PARA_REPOS_RECENTES = 30

# Tendência de atividade (SDD-03 seção 1.3)
SEMANAS_PARA_CALCULO_DE_TENDENCIA = 4
LIMIAR_CRESCIMENTO_TENDENCIA = 1.1
LIMIAR_QUEDA_TENDENCIA = 0.9

# Insights (SDD-03 seção 1.4)
MAX_INSIGHTS_POR_RESPOSTA = 4
LIMITE_SCORE_ALTO = 80
LIMITE_SCORE_BAIXO = 30
LIMITE_PERCENTUAL_LINGUAGEM_DOMINANTE = 70
LIMITE_DIAS_SEM_ATUALIZACAO_PARA_INSIGHT = 90
# Threshold de health score para insight "muito ativo" (SDD-03 seção 1.4)
LIMITE_HEALTH_SCORE_ALTO = 85
