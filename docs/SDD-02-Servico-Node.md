# SDD-02 — node-service (Gateway + Coletor)

**Pré-requisito:** SDD-01, SDD-06, SDD-07 lidos.
**Entrega:** node-service funcional na porta 3000, todos os endpoints respondendo conforme spec, testável localmente com Docker Compose.

---

## 0. Spec por endpoint (Spec-Driven Development)

Cada endpoint é especificado como contrato antes da implementação. O fluxo seguido: **Intenção → Spec → Review → Design → Implementação.**

---

### 0.1 Spec — `POST /api/v1/auth/register`

**Comportamento:**
- Qualquer visitante pode se cadastrar (sem autenticação).
- Valida campos, verifica se email já existe, salva usuário com senha hasheada, retorna tokens.

**Regras:**
- `nome`: mínimo 2 caracteres, máximo 100.
- `email`: formato válido (RFC 5322), único no banco, armazenado em lowercase.
- `senha`: mínimo 8 caracteres, pelo menos 1 número e 1 letra maiúscula.
- Hash da senha: bcrypt, custo 12 (ver SDD-06).
- Não revelar se o email já existe com mensagem específica — retornar erro genérico de validação.

**Casos de borda:**
| Situação | Resultado |
|---|---|
| Email já cadastrado | `400` + `{ code: "VALIDATION_ERROR", message: "Dados inválidos. Verifique os campos." }` (não revelar que o email existe) |
| Senha sem número | `400` + mensagem indicando requisito de senha |
| Nome vazio | `400` + mensagem indicando campo obrigatório |
| Email mal formatado | `400` + mensagem indicando formato inválido |

**Critérios de aceite:**
- ✓ `POST /auth/register` com dados válidos → `201` + `{ success: true, data: { usuario, token, refreshToken, expiresIn } }`
- ✓ Email já cadastrado → `400` + mensagem genérica de validação (não vaza que o email existe)
- ✓ Senha sem número → `400` com mensagem de requisito
- ✓ Campos faltando → `400` com indicação do campo
- ✓ Senha nunca retorna no payload de resposta, nem em hash

---

### 0.2 Spec — `POST /api/v1/auth/login`

**Comportamento:**
- Valida credenciais, retorna JWT de 24h e refreshToken de 7 dias.

**Regras:**
- Email inexistente e senha incorreta → mesmo código `401` e mesma mensagem (não revelar qual falhou).
- Não implementar bloqueio por tentativas nesta versão (fora de escopo v1).

**Casos de borda:**
| Situação | Resultado |
|---|---|
| Email não cadastrado | `401` + `{ code: "INVALID_CREDENTIALS", message: "Email ou senha incorretos." }` |
| Senha incorreta | `401` + mesma mensagem acima |
| Campos vazios | `400` + mensagem de campo obrigatório |

**Critérios de aceite:**
- ✓ Credenciais válidas → `200` + `{ success: true, data: { usuario, token, refreshToken, expiresIn: 86400 } }`
- ✓ Email inexistente → `401` com `INVALID_CREDENTIALS`
- ✓ Senha incorreta → `401` com mesma mensagem que email inexistente
- ✓ Tempo de resposta entre credencial válida e inválida não deve ser distinguível (bcrypt.compare sempre executa mesmo com email inexistente — usar hash dummy)

---

### 0.3 Spec — `POST /api/v1/auth/refresh`

**Comportamento:**
- Recebe `refreshToken` válido, retorna novo JWT. O refreshToken continua válido até expirar.

**Regras:**
- refreshToken expirado → `401`, frontend faz logout automático e redireciona para `/login` com mensagem "Sessão expirada, faça login novamente." (decisão confirmada SDD-01, seção 5).
- refreshToken inválido (adulterado) → `401`.
- Não rotacionar o refreshToken nesta versão (fora de escopo v1).

**Critérios de aceite:**
- ✓ refreshToken válido → `200` + `{ success: true, data: { token, expiresIn: 86400 } }`
- ✓ refreshToken expirado → `401` + `{ code: "TOKEN_EXPIRED", message: "Sessão expirada, faça login novamente." }`
- ✓ refreshToken inválido → `401` + `{ code: "INVALID_TOKEN", message: "Token inválido." }`

---

### 0.4 Spec — `GET /api/v1/github/user/:username`

**Comportamento:**
1. Middleware valida JWT (ver SDD-06).
2. Verifica cache Redis na chave `github:user:{username}`.
3. Cache HIT: retorna dado cacheado, campo `cacheadoEm` preenchido.
4. Cache MISS: busca em paralelo `GET /users/:username` e `GET /users/:username/repos?per_page=100` na API do GitHub.
5. Chama `POST /analyze/user` no python-service com dados brutos.
6. Se python-service falhar (timeout > 5s ou erro 5xx): retorna dados brutos com `analysisAvailable: false` (circuit breaker — decisão confirmada SDD-01, seção 5).
7. Armazena resultado consolidado no Redis com TTL de 600s.
8. Registra busca no histórico (PostgreSQL).
9. Retorna resposta consolidada.

**Regras:**
- `username` com caracteres inválidos para o GitHub → `400`.
- Username inexistente no GitHub → `404` + `{ code: "USER_NOT_FOUND", message: "Usuário não encontrado no GitHub." }`
- Rate limit do GitHub estourado (resposta 403/429 da API do GitHub) → `503` + `{ code: "SERVICE_UNAVAILABLE", message: "Serviço temporariamente indisponível. Tente novamente em alguns minutos." }` (não expor que é rate limit do GitHub — decisão confirmada SDD-01, seção 5).
- Histórico registrado mesmo quando `analysisAvailable: false`; `score` salvo como `null` nesses casos.
- Timeout do python-service: 5000ms (constante `TIMEOUT_PYTHON_SERVICE_MS`).
- TTL do cache Redis: 600s (constante `TTL_CACHE_GITHUB_EM_SEGUNDOS`).

**Casos de borda:**
| Situação | Resultado |
|---|---|
| Username com espaço ou caractere inválido | `400` + mensagem de parâmetro inválido |
| Username inexistente no GitHub | `404` + `USER_NOT_FOUND` |
| Rate limit do GitHub estourado | `503` + `SERVICE_UNAVAILABLE` |
| python-service indisponível (timeout/5xx) | `200` + dados brutos + `analysisAvailable: false` |
| Cache HIT | `200` + dados cacheados + `cacheadoEm` preenchido |
| Usuário sem repositórios públicos | `200` + perfil com `repositorios: []`, análise válida com scores zerados |

**Critérios de aceite:**
- ✓ Username válido, cache MISS → `200` com `RespostaDeBuscaDeUsuario` completa, `analysisAvailable: true`
- ✓ Mesma busca repetida em menos de 10min → `200` com `cacheadoEm` preenchido (sem chamar GitHub API)
- ✓ Username inexistente → `404` com `USER_NOT_FOUND`
- ✓ Rate limit estourado → `503` com `SERVICE_UNAVAILABLE` (sem vazar mensagem da API do GitHub)
- ✓ python-service derrubado → `200` com `analysisAvailable: false` e `analise: null`
- ✓ Busca registrada no histórico em todos os casos acima exceto `4xx`/`503`
- ✓ JWT ausente ou inválido → `401` (middleware, antes de qualquer lógica)

---

### 0.5 Spec — `GET /api/v1/github/repo/:owner/:repo`

**Comportamento:** idêntico ao 0.4, mas para repositório. Chave de cache: `github:repo:{owner}:{repo}`. Chama `POST /analyze/repo` no python-service.

**Casos de borda:**
| Situação | Resultado |
|---|---|
| Repositório inexistente no GitHub | `404` + `{ code: "REPO_NOT_FOUND", message: "Repositório não encontrado no GitHub." }` |
| Repositório privado (GitHub retorna 404) | `404` + mesmo código acima (não revelar que é privado) |
| Demais casos | Idênticos ao 0.4 |

**Critérios de aceite:**
- ✓ `owner/repo` válido, cache MISS → `200` com `RespostaDeBuscaDeRepositorio` completa
- ✓ Repositório inexistente ou privado → `404` com `REPO_NOT_FOUND`
- ✓ Demais critérios idênticos ao endpoint de usuário (0.4)

---

### 0.6 Spec — `GET /api/v1/history`

**Comportamento:**
- Retorna as 20 buscas mais recentes do usuário autenticado, ordenadas por `realizadaEm` decrescente.

**Regras:**
- Usuário sem histórico → `200` + `{ success: true, data: [] }` (não é erro).
- Máximo 20 itens. Sem paginação na v1 (fora de escopo).

**Critérios de aceite:**
- ✓ Usuário com buscas → `200` + lista de `ItemDeHistorico[]` (máx 20, mais recente primeiro)
- ✓ Usuário sem buscas → `200` + `data: []`
- ✓ JWT inválido → `401`

---

### 0.7 Spec — `DELETE /api/v1/history/:id`

**Comportamento:**
- Remove item do histórico do usuário autenticado.

**Regras:**
- ID inexistente → `404`.
- ID pertencente a outro usuário → `403` (não revelar que o ID existe — retornar `404`).

**Critérios de aceite:**
- ✓ ID válido e do próprio usuário → `200` + `{ success: true, data: { removido: true } }`
- ✓ ID inexistente → `404` + `{ code: "NOT_FOUND", message: "Item não encontrado." }`
- ✓ ID de outro usuário → `404` (mesmo código, não vaza que pertence a outro usuário)
- ✓ JWT inválido → `401`

---

### 0.8 Review do conjunto de specs (checklist aplicado)

| Verificação | Resultado |
|---|---|
| Todas as permissões definidas? | ✓ Rotas públicas: register, login, refresh. Todas as demais exigem JWT válido. |
| Todos os casos de erro mapeados? | ✓ 400, 401, 403→404, 404, 503 cobertos com código e mensagem definidos |
| Decisões de negócio são do dono, não da IA? | ✓ Refresh → logout automático; rate limit → 503; circuit breaker → parcial — todas explicitadas em SDD-01, seção 5 |
| Critérios de aceite são verificáveis? | ✓ Todos testáveis via requisição HTTP com resultado binário |
| Casos de borda esquecidos? | Bloqueio por tentativas: decisão consciente de excluir da v1. Rotação de refreshToken: excluído da v1. |

---

## 1. Stack técnica

| Categoria | Tecnologia | Observação |
|---|---|---|
| Runtime | Node.js v20 LTS | |
| Linguagem | TypeScript v5+ | `strict: true` |
| Framework HTTP | Express v4 | |
| ORM | Prisma v5 | Migrations + acesso PostgreSQL |
| Cache | ioredis | Cliente Redis |
| HTTP Client | Axios | GitHub API + python-service |
| Autenticação | jsonwebtoken + bcryptjs | Ver SDD-06 |
| Validação | Zod | Schemas de entrada |
| Logs | Winston | JSON estruturado |
| Testes | Jest + Supertest | Unitários + integração |
| Container | Docker | node:20-alpine |

---

## 2. Estrutura de diretórios

```
node-service/
  src/
    config/           # variáveis de ambiente tipadas
    rotas/            # definição de rotas (sem lógica)
    controladores/    # orquestra: lê req, chama serviço, retorna resposta
    servicos/         # lógica de negócio
      ServicoDeAutenticacao.ts
      ServicoGitHub.ts
      ServicoDeAnalise.ts   # faz a chamada ao python-service
      ServicoDeHistorico.ts
    repositorios/     # acesso a dados (abstrações + implementações)
      interfaces.ts
      RepositorioDeUsuarioPostgres.ts
      RepositorioDeHistoricoPostgres.ts
      RepositorioDeCacheRedis.ts
    middlewares/      # autenticação, validação, erros (ver SDD-07)
    validadores/      # schemas Zod por endpoint
    utilitarios/
      constantes.ts   # todas as constantes nomeadas
      respostaHttp.ts # responderComSucesso / responderComErro
    tipos/            # tipos TypeScript (ver SDD-01, seção 6)
    app.ts
    server.ts
  prisma/
    schema.prisma
    migrations/
  tests/
    unitarios/
    integracao/
  Dockerfile
```

---

## 3. Modelos de dados (PostgreSQL)

### Tabela `usuarios`
| Campo | Tipo | Restrição |
|---|---|---|
| id | UUID | PK, gerado automaticamente |
| email | VARCHAR(255) | UNIQUE, NOT NULL, lowercase |
| senha_hash | VARCHAR(255) | NOT NULL |
| nome | VARCHAR(100) | NOT NULL |
| criado_em | TIMESTAMP | NOT NULL, default now() |
| atualizado_em | TIMESTAMP | NOT NULL, default now() |

### Tabela `historico_buscas`
| Campo | Tipo | Restrição |
|---|---|---|
| id | UUID | PK |
| usuario_id | UUID | FK → usuarios.id, NOT NULL |
| tipo_busca | ENUM('usuario','repositorio') | NOT NULL |
| valor_buscado | VARCHAR(255) | NOT NULL |
| score | DECIMAL(5,2) | NULL (quando analysisAvailable = false) |
| realizada_em | TIMESTAMP | NOT NULL, default now() |

---

## 4. Constantes obrigatórias (`utilitarios/constantes.ts`)

```typescript
// Cache (spec 0.4 — Regras)
export const TTL_CACHE_GITHUB_EM_SEGUNDOS = 600; // 10 minutos

// Circuit breaker (spec 0.4 — Regras)
export const TIMEOUT_PYTHON_SERVICE_EM_MS = 5000;

// Auth (SDD-06)
export const DURACAO_TOKEN_JWT = '24h';
export const DURACAO_REFRESH_TOKEN = '7d';
export const CUSTO_BCRYPT = 12;

// Histórico (spec 0.6 — Regras)
export const LIMITE_ITENS_HISTORICO = 20;

// GitHub
export const REPOS_POR_PAGINA_GITHUB = 100;
```

---

## 5. Fluxo detalhado: `GET /github/user/:username`

```
1. autenticarJWT (middleware) → 401 se inválido
2. validarParametroUsername (middleware Zod) → 400 se inválido
3. ServicoGitHub.buscarAnaliseDeUsuario(username)
   3a. RepositorioDeCacheRedis.buscar('github:user:{username}')
       → HIT: retornar dado + cacheadoEm
       → MISS: continuar
   3b. API GitHub: GET /users/:username + GET /users/:username/repos (em paralelo)
       → 404 do GitHub: lançar ErroUsuarioNaoEncontrado
       → 403/429 do GitHub: lançar ErroServicoIndisponivel
   3c. ServicoDeAnalise.analisarUsuario(dadosBrutos)
       → Timeout/5xx: retornar { analise: null, analysisAvailable: false }
       → Sucesso: retornar { analise, analysisAvailable: true }
   3d. RepositorioDeCacheRedis.armazenar('github:user:{username}', resultado, TTL_CACHE_GITHUB_EM_SEGUNDOS)
   3e. ServicoDeHistorico.registrar({ usuario_id, tipo: 'usuario', valor: username, score })
4. Controlador formata e retorna RespostaDeBuscaDeUsuario
```

---

## 6. Estratégia de testes

### Unitários (Jest)
- `ServicoGitHub`: mock do `RepositorioDeCacheRedis` e do cliente Axios. Testar cache HIT, cache MISS, rate limit estourado.
- `ServicoDeAutenticacao`: mock do `RepositorioDeUsuario`. Testar registro com email duplicado, login com credenciais inválidas, hash dummy para timing.
- `ServicoDeAnalise`: mock do Axios. Testar circuit breaker (timeout), resposta válida.

### Integração (Supertest)
- Fluxo completo de registro → login → busca de usuário com GitHub API mockada (nock).
- Comportamento do circuit breaker com python-service não respondendo.
- Rate limit do GitHub simulado (mock retornando 429).

### Cobertura mínima
- Serviços: 80%
- Controladores: 70%
- Repositórios: testados via integração

---

## 7. Critérios de conclusão desta etapa

- [ ] Todos os critérios de aceite das specs 0.1 a 0.7 testados manualmente via curl/Postman.
- [ ] Cache Redis funcionando: segunda busca do mesmo username em menos de 10min não chama a GitHub API (verificável via logs do Winston).
- [ ] Circuit breaker funcionando: com python-service parado, endpoint retorna `200` com `analysisAvailable: false`.
- [ ] Rate limit simulado: mock retornando 429 do GitHub → endpoint retorna `503` com `SERVICE_UNAVAILABLE`.
- [ ] Nenhum segredo (JWT_SECRET, GITHUB_TOKEN) em código ou log.
- [ ] Zero `any` no TypeScript, `strict: true` sem erros.
- [ ] Estrutura em camadas respeitada: nenhuma lógica de negócio em `rotas/`, nenhum acesso direto ao Prisma em `servicos/`.
