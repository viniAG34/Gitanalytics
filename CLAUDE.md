# CLAUDE.md — GitAnalytics

Leia este arquivo **inteiro** antes de qualquer ação. Ele é sua fonte de verdade para este projeto.

---

## 1. Antes de começar qualquer etapa

1. Leia o `SDD-01-Arquitetura-Geral.md` (tipos globais, decisões de arquitetura, convenções).
2. Leia o `SDD-06-Seguranca.md` e o `SDD-07-Tratamento-de-Erros.md` — eles se aplicam a todas as etapas de backend.
3. Leia o SDD da etapa atual (indicado na seção 4 deste arquivo).
4. Só então comece a implementar — nunca antes.

Se dois SDDs conflitarem, o SDD da etapa atual prevalece (é mais específico). Se conflitarem com o SDD-01, sinalize antes de prosseguir — pode ser inconsistência nos docs.

---

## 2. Convenções obrigatórias (violação = reescrever)

### Nomenclatura
- Funções, métodos, variáveis, classes: **português, autoexplicativos**
  - ✓ `buscarPerfilDeUsuarioNoGitHub`, `calcularScoreDeAtividade`, `validarTokenJWT`
  - ✗ `getUser`, `calcScore`, `validateToken`
- Arquivos TypeScript/Node: `camelCase.ts`
- Arquivos Python: `snake_case.py`
- Componentes React: `PascalCase.tsx` (convenção da comunidade — o conteúdo interno segue português)
- Tipos e interfaces de domínio: **português** (ver SDD-01, seção 6)
- Tipos de infraestrutura exigidos por libs: **inglês** (ex: tipos do Express, FastAPI, Pydantic internos)

### TypeScript (node-service e frontend)
- `strict: true` em todos os `tsconfig.json` — sem exceção
- Zero `any` — use `unknown` + validação quando o tipo não for conhecido
- Tipagem explícita em todas as funções exportadas (parâmetros e retorno)
- Zero `// @ts-ignore` ou `// eslint-disable`

### Python (python-service)
- Pydantic v2 para todos os schemas de entrada e saída
- Type hints em todas as funções
- Ruff para lint e formatação — zero warnings

### Qualidade de código
- **Zero números mágicos** — toda constante vai em `utilitarios/constantes.ts` (Node) ou `utilitarios/constantes.py` (Python), com nome autoexplicativo e comentário referenciando o SDD/seção de origem
- **Funções puras** para validação, transformação e cálculo (sem efeito colateral)
- **Efeitos colaterais** (banco, Redis, GitHub API, python-service) isolados em serviços/repositórios
- **Funções pequenas** — máximo 20-30 linhas. Se precisar de "e" pra descrever o que a função faz, divida.
- **Early return** — retorne cedo em casos de erro, evite aninhamento excessivo de `if`

### SOLID aplicado
- **S**: cada classe/função tem uma única razão para mudar
- **O**: novos tipos de análise entram como nova classe implementando a interface — sem alterar existentes
- **L**: `RepositorioDeUsuarioEmMemoria` (testes) e `RepositorioDeUsuarioPostgres` (produção) são intercambiáveis
- **I**: interfaces pequenas e específicas — `IRepositorioDeUsuario` não mistura com `IRepositorioDeCache`
- **D**: serviços recebem repositórios e clientes HTTP via construtor — nunca instanciam diretamente

### Padrão Guard (SDD-07 — obrigatório em todo o node-service)
- **Critical**: interrompe o fluxo, lança `ErroDeNegocio`, loga em `error`
- **Non-Critical**: continua com fallback, loga em `warn` (ex: python-service down → `analysisAvailable: false`)
- **Silent**: absorve o erro, loga em `debug` (ex: cache MISS no Redis)

---

## 3. O que você NUNCA deve fazer

- Implementar qualquer coisa não especificada no SDD da etapa atual
- Criar arquivos fora da estrutura de pastas definida no SDD
- Adicionar dependências não listadas no SDD sem avisar explicitamente
- Usar `any`, `// @ts-ignore`, `// eslint-disable` ou equivalentes Python
- Duplicar lógica que já existe em outro módulo — importar, não copiar
- Expor detalhes internos ao cliente: stack trace, mensagem de banco, query SQL, nome de variável de ambiente
- Commitar segredos — eles ficam exclusivamente no `.env` (nunca no `.env.example`)
- Retornar `res.status(xxx).json(...)` diretamente nos controladores para erros — sempre lançar `ErroDeNegocio` e deixar o `tratadorDeErrosGlobal` tratar
- Acessar Prisma ou ioredis diretamente em serviços — sempre via repositório
- Colocar lógica de negócio em `rotas/` — rota só define path/método e delega ao controlador

---

## 4. Etapa atual

```
STATUS:    CONCLUÍDO
ETAPA:     Fase 4 — Frontend React
SDDs:      SDD-04 (specs 0.1, 0.2, 0.3)
PRÓXIMA:   — (projeto concluído)
```

### Sequência completa de implementação

| Fase | SDDs | Entrega | Dependências |
|---|---|---|---|
| ✓ **1 — Fundação** | SDD-05 + SDD-07 | Docker Compose com todos os serviços saudáveis + `ErroDeNegocio` + `tratadorDeErrosGlobal` | Nenhuma |
| ✓ **2 — python-service** | SDD-03 | `/analyze/user`, `/analyze/repo`, `/health` funcionando com testes | Fase 1 |
| ✓ **3a — Auth** | SDD-02 + SDD-06 | `/auth/register`, `/auth/login`, `/auth/refresh` + middleware `autenticarJWT` | Fase 1 |
| ✓ **3b — GitHub + Histórico** | SDD-02 | `/github/user/:username`, `/github/repo/:owner/:repo`, `/history`, `/history/:id` | Fase 2 + 3a |
| ✓ **4 — Frontend** | SDD-04 | SPA React completa consumindo API real | Fase 3b |

> Quando uma fase estiver concluída, atualize o bloco acima antes de continuar.

---

## 5. Critérios para avançar de fase

Antes de declarar uma fase concluída e mudar o bloco da seção 4:

1. Verificar **todos** os itens do checklist "Critérios de conclusão" no final do SDD da fase
2. Todos os critérios de aceite da seção `0.x` do SDD testados manualmente (curl, Postman ou pytest)
3. **Node/Frontend:** `npm run lint` — zero erros
4. **Python:** `ruff check .` — zero warnings
5. **Node/Frontend:** `npx tsc --noEmit` — zero erros de tipo
6. Nenhum arquivo criado fora da estrutura de pastas do SDD
7. Nenhum número mágico no código novo (grep por literais numéricos fora de constantes)

Só depois disso atualizar a seção 4.

---

## 6. Estrutura de documentos

```
docs/
├── SDD-01-Arquitetura-Geral.md   ← leia sempre primeiro
├── SDD-02-Servico-Node.md
├── SDD-03-Servico-Python.md
├── SDD-04-Frontend-React.md
├── SDD-05-Infraestrutura.md
├── SDD-06-Seguranca.md           ← leia antes de qualquer etapa de backend
└── SDD-07-Tratamento-de-Erros.md ← leia antes de qualquer etapa de backend
```

---

## 7. Estrutura do repositório

```
gitanalytics/
├── CLAUDE.md                      ← este arquivo
├── docs/                          ← SDDs
├── .env                           ← nunca commitado
├── .env.example                   ← commitado, sem valores
├── docker-compose.yml
├── node-service/
│   ├── src/
│   │   ├── config/
│   │   ├── rotas/
│   │   ├── controladores/
│   │   ├── servicos/
│   │   ├── repositorios/
│   │   │   └── interfaces.ts
│   │   ├── middlewares/
│   │   ├── validadores/
│   │   ├── utilitarios/
│   │   │   ├── constantes.ts
│   │   │   ├── respostaHttp.ts
│   │   │   └── erros.ts
│   │   ├── tipos/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   ├── tests/
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── python-service/
│   ├── app/
│   │   ├── api/v1/rotas/
│   │   ├── schemas/
│   │   ├── servicos/
│   │   ├── pipelines/
│   │   └── utilitarios/
│   │       ├── constantes.py
│   │       └── calculadoras.py
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── componentes/
│   │   ├── paginas/
│   │   ├── hooks/
│   │   ├── store/
│   │   ├── tipos/
│   │   ├── utilitarios/
│   │   │   └── constantes.ts
│   │   └── roteador/
│   ├── Dockerfile
│   └── vite.config.ts
└── nginx/
    └── nginx.conf
```

---

## 8. Stack e decisões fechadas (não reabrir)

| Decisão | Escolha |
|---|---|
| Arquitetura | Microsserviços: node-service (gateway) + python-service (análise) |
| node-service | Node.js 20 + TypeScript + Express + Prisma + ioredis + Axios + Zod + Winston |
| python-service | Python 3.11 + FastAPI + Uvicorn + Pandas + Pydantic v2 + Pytest |
| Frontend | React 18 + TypeScript + Vite + Tailwind + TanStack Query + Axios + Zustand + React Hook Form + Zod |
| Banco de dados | PostgreSQL 16 (Prisma ORM) |
| Cache | Redis 7 (TTL 10min para GitHub, sem persistência) |
| Proxy reverso | Nginx (único ponto de entrada externo) |
| Auth | JWT 24h + refreshToken 7d (jsonwebtoken + bcryptjs, custo 12) |
| Refresh expirado | Logout automático + redirect `/login?motivo=sessao_expirada` |
| Rate limit GitHub estourado | 503 `SERVICE_UNAVAILABLE` (sem expor que é rate limit do GitHub) |
| Circuit breaker python-service | Resposta parcial com `analysisAvailable: false` (não erro) |
| Timeout python-service | 5000ms (`TIMEOUT_PYTHON_SERVICE_EM_MS`) |
| Orquestração local | Docker Compose (5 serviços) |

---

## 9. Variáveis de ambiente obrigatórias

Todas devem estar no `.env` antes de `docker compose up`. Ver `.env.example` para a lista completa.

| Variável | Serviço | Observação |
|---|---|---|
| `JWT_SECRET` | node-service | Mínimo 64 chars, gerado com `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | node-service | Diferente do `JWT_SECRET`, mesmo tamanho |
| `GITHUB_TOKEN` | node-service | Escopo mínimo: `public_repo` |
| `DATABASE_URL` | node-service | Connection string do postgres interno |
| `REDIS_URL` | node-service | URL do redis interno |
| `PYTHON_SERVICE_URL` | node-service | `http://python-service:8000` |
| `POSTGRES_PASSWORD` | postgres | String forte, diferente entre ambientes |

---

## 10. Comandos úteis

```bash
# Subir ambiente completo
docker compose up -d --build

# Verificar saúde dos serviços
docker compose ps

# Logs em tempo real
docker compose logs -f node-service
docker compose logs -f python-service

# Shell dentro de um container
docker compose exec node-service sh
docker compose exec python-service bash

# Rodar migrations Prisma
docker compose exec node-service npx prisma migrate dev

# Acessar PostgreSQL
docker compose exec postgres psql -U gitanalytics gitanalytics_db

# Acessar Redis CLI
docker compose exec redis redis-cli

# Testes Python
docker compose exec python-service pytest tests/ -v

# Testes Node
docker compose exec node-service npm test

# Lint Node
docker compose exec node-service npm run lint

# Lint Python
docker compose exec python-service ruff check .

# Parar tudo (preserva volumes)
docker compose down

# Parar tudo E apagar dados do banco
docker compose down -v
```

---

## 11. Como reportar ao fim de cada fase

Quando terminar uma fase, responda com exatamente este formato:

```
✓ Fase X — [Nome] concluída

Critérios de aceite verificados:
- ✓ [critério do SDD] — [como foi testado]
- ✓ ...

Arquivos criados:
- caminho/do/arquivo.ts — [responsabilidade]

Arquivos modificados:
- caminho/do/arquivo.ts — [o que mudou]

Pontos de atenção (se houver):
- [qualquer decisão tomada fora do SDD, com justificativa]
- [dependências adicionadas não previstas no SDD]
```

Se algum critério de aceite não pôde ser atendido, **explique o motivo e aguarde instrução** antes de continuar.

---

## 12. Checklist de segurança (verificar antes de qualquer commit)

- [ ] `.env` ausente do stage: `git status` não mostra `.env`
- [ ] Nenhum `console.log` ou `logger.*` com token, senha ou hash
- [ ] `senha_hash` ausente de todos os tipos de resposta TypeScript
- [ ] Nenhum stack trace em resposta HTTP ao cliente
- [ ] `JWT_SECRET` ≠ `JWT_REFRESH_SECRET`
- [ ] CORS com `origin` específica (nunca `*`)
