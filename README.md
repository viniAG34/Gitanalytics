# GitAnalytics

Plataforma web para análise de perfis e repositórios do GitHub com scores e insights gerados automaticamente.

---

<img width="1600" height="850" alt="image" src="https://github.com/user-attachments/assets/502d4510-38af-4e33-b657-274b60d50ee4" />
<img width="1600" height="813" alt="image" src="https://github.com/user-attachments/assets/45624ba4-5c88-456c-b8b2-1b8610922410" />
<img width="1600" height="808" alt="image" src="https://github.com/user-attachments/assets/c0cbfaf6-3e11-4ab1-a887-427066a59718" />
<img width="1600" height="821" alt="image" src="https://github.com/user-attachments/assets/21e116b4-b4ce-414c-8946-53d994f64fe9" />

---

## Funcionalidades

- Busca e análise de perfis de usuário do GitHub com **activity score** de 0–100
- Busca e análise de repositórios com **health score** de 0–100
- Cálculo de tendência de atividade (crescente / estável / decrescente)
- Distribuição de linguagens, total de estrelas e insights automáticos por perfil/repositório
- Cache de respostas no Redis (TTL 10 min) para reduzir chamadas à API do GitHub
- Histórico de buscas por usuário (últimas 20 entradas, com scores)
- Autenticação JWT com refresh token transparente (24h access + 7 dias refresh)
- Degradação elegante: python-service indisponível retorna dados brutos com `analysisAvailable: false`

---

## Arquitetura

```
[ Browser / React SPA ]
        |
        | HTTP (porta 80)
        v
    [ Nginx ]  ← proxy reverso + serve build estático React
        |
        v
[ node-service ]  ← gateway único, auth, coleta GitHub, cache, persistência
   porta 3000
   |    \
   |     \──── HTTP interno ──→ [ python-service ]  ← cálculo de scores e insights
   |                                porta 8000
   |
   +──→ [ Redis ]       ← cache de respostas da API GitHub (TTL 10 min)
   +──→ [ PostgreSQL ]  ← usuários e histórico de buscas
```

| Componente | Responsabilidade | O que não faz |
|---|---|---|
| node-service | Gateway, auth JWT, coleta GitHub, cache Redis, persistência | Não calcula métricas, não serve arquivos estáticos |
| python-service | Recebe dados brutos, calcula scores, gera insights | Não acessa GitHub, não persiste dados, não autentica |
| frontend | SPA React, busca e visualização | Não acessa GitHub diretamente, não chama python-service |
| Nginx | Proxy reverso, serve build estático, SSL/TLS | Sem lógica de negócio |
| Redis | Cache de respostas do GitHub com TTL | Não persiste dados de usuário |
| PostgreSQL | Usuários e histórico de buscas | Não armazena dados brutos do GitHub |

---

## Stack

| Camada | Tecnologias |
|---|---|
| Backend (Node.js) | Node 20, TypeScript, Express, Prisma, ioredis, Axios, Zod, Winston, jsonwebtoken, bcryptjs |
| Backend (Python) | Python 3.11, FastAPI, Uvicorn, Pandas, Pydantic v2 |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, Recharts, React Hook Form |
| Infraestrutura | Docker, Docker Compose, Nginx, PostgreSQL 16, Redis 7 |

---

## Decisões técnicas

**Dois backends (Node + Python):** cada serviço faz o que faz bem — Node para I/O e gateway, Python para análise com Pandas.

**Circuit breaker:** python-service indisponível não derruba o sistema. O node-service retorna dados brutos com `analysisAvailable: false`.

**Cache Redis (TTL 10 min):** a API do GitHub tem rate limit de 5.000 req/h. O cache reduz drasticamente as chamadas repetidas para o mesmo perfil/repositório.

**Hash dummy no login:** `bcrypt.compare` executa mesmo quando o e-mail não existe, eliminando timing attack por diferença de tempo de resposta.

**Scores determinísticos:** fórmulas com pesos documentados nos SDDs — sem IA generativa, auditáveis e reproduzíveis.

**Spec-Driven Development:** todo o projeto foi especificado antes de implementado, com critérios de aceite verificáveis por endpoint (ver `docs/`).

**115 testes automatizados:** 67 no python-service (pytest), 48 no node-service (Jest) — cobrindo scores, circuit breaker, autenticação e integração com a API do GitHub.

---

## Como rodar localmente

**Pré-requisitos:** Docker Desktop instalado e rodando, Git, GitHub Personal Access Token (escopo: `public_repo`).

```bash
# 1. Clonar o repositório
git clone <url-do-repositorio>
cd gitanalytics

# 2. Criar o arquivo de variáveis de ambiente
cp .env.example .env

# 3. Gerar os segredos JWT (execute duas vezes — valores devem ser diferentes)
openssl rand -base64 64  # → JWT_SECRET
openssl rand -base64 64  # → JWT_REFRESH_SECRET

# 4. Preencher GITHUB_TOKEN no .env com seu Personal Access Token

# 5. Subir os serviços
docker compose up -d --build

# 6. Verificar se todos os serviços estão healthy
docker compose ps

# 7. Acessar a aplicação em http://localhost
```

---

## Estrutura do repositório

```
gitanalytics/
├── docs/                  ← especificações (SDD-01 a SDD-07)
├── node-service/          ← gateway, auth, GitHub, cache, histórico
│   ├── src/
│   ├── prisma/
│   └── tests/
├── python-service/        ← cálculo de scores e insights
│   ├── app/
│   └── tests/
├── frontend/              ← SPA React
│   └── src/
├── nginx/                 ← configuração do proxy reverso
├── docker-compose.yml
└── .env.example
```

---

## Documentação

O projeto foi desenvolvido com **Spec-Driven Development**: cada camada foi especificada em um SDD antes da implementação, com critérios de aceite verificáveis por endpoint.

| Documento | Descrição |
|---|---|
| `docs/SDD-01-Arquitetura-Geral.md` | Visão geral, decisões de design, glossário de tipos compartilhados |
| `docs/SDD-02-Servico-Node.md` | node-service: auth, coleta GitHub, cache, histórico |
| `docs/SDD-03-Servico-Python.md` | python-service: scores, tendências, insights |
| `docs/SDD-04-Frontend-React.md` | SPA React: páginas, estado, comunicação com a API |
| `docs/SDD-05-Infraestrutura.md` | Docker, Nginx, variáveis de ambiente |
| `docs/SDD-06-Seguranca.md` | JWT, bcrypt, rate limit, CORS, proteção de rotas |
| `docs/SDD-07-Tratamento-de-Erros.md` | Padrão Guard, códigos HTTP, mensagens ao cliente |
