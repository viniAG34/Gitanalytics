# SDD-01 — Mestre: GitAnalytics

**Autor:** Vinicius Aguiar Gadelha
**Versão:** 2.0
**Status:** Aprovado para implementação

---

## 1. Como usar este conjunto de documentos

| Ordem | Arquivo | Entrega |
|---|---|---|
| 1 | **SDD-01-Arquitetura-Geral.md** (este) | Visão geral, decisões globais, glossário de tipos |
| 2 | `SDD-02-Servico-Node.md` | node-service: gateway, auth, coleta GitHub, cache |
| 3 | `SDD-03-Servico-Python.md` | python-service: análise, scores, insights |
| 4 | `SDD-04-Frontend-React.md` | SPA React: páginas, estado, comunicação com API |
| 5 | `SDD-05-Infraestrutura.md` | Docker, Nginx, variáveis de ambiente, deploy |
| 6 | `SDD-06-Seguranca.md` | JWT, bcrypt, rate limit, CORS, proteção de rotas |
| 7 | `SDD-07-Tratamento-de-Erros.md` | Padrão Guard, códigos HTTP, mensagens ao usuário |

**Regra de uso:** cada SDD é autocontido para sua camada. Quem implementa o node-service lê SDD-01 + SDD-02 + SDD-06 + SDD-07. Não avance para o próximo SDD sem concluir os critérios de aceite do atual.

---

## 2. Objetivo do projeto

GitAnalytics é uma aplicação web que permite a qualquer usuário autenticado buscar um perfil de usuário ou repositório do GitHub e receber uma análise visual com scores, métricas e insights gerados automaticamente.

**Fora de escopo nesta versão (v1):**
- Análise de organizações GitHub
- Comparação entre dois perfis/repositórios
- Notificações ou alertas periódicos
- Export de relatório em PDF
- Integração com GitLab ou Bitbucket

---

## 3. Arquitetura consolidada

```
[ Browser / React SPA ]
        |
        | HTTPS (porta 80/443)
        v
    [ Nginx ]  ← proxy reverso + servir build estático
     /      \
    /        \
   v          v
[ node-service ]    [ /static React build ]
   porta 3000
   |    \
   |     \──── HTTP interno ──→ [ python-service ]
   |                                porta 8000
   |
   +──→ [ Redis ]      ← cache de respostas da API GitHub (TTL 10min)
   +──→ [ PostgreSQL ] ← usuários + histórico de buscas
```

### 3.1 Responsabilidades por componente

| Componente | Responsabilidade | O que NÃO faz |
|---|---|---|
| node-service | Gateway único, auth JWT, coleta GitHub, cache Redis, persistência PostgreSQL, delega análise ao python-service | Não calcula métricas, não serve arquivos estáticos |
| python-service | Recebe dados brutos, calcula scores, gera insights | Não acessa GitHub, não persiste dados, não autentica |
| frontend | SPA React, busca e visualização de dados | Não acessa GitHub diretamente, não chama python-service |
| Nginx | Proxy reverso, serve build estático React, SSL/TLS | Não contém lógica de negócio |
| Redis | Cache de respostas do GitHub com TTL | Não persiste dados de usuário |
| PostgreSQL | Usuários + histórico de buscas | Não armazena dados brutos do GitHub |

---

## 4. Contratos de comunicação entre serviços

### 4.1 Frontend → node-service (Base URL: `/api/v1`)

| Endpoint | Método | Auth | Descrição |
|---|---|---|---|
| `/auth/register` | POST | Não | Cadastro |
| `/auth/login` | POST | Não | Login, retorna JWT + refreshToken |
| `/auth/refresh` | POST | Não | Renova JWT via refreshToken |
| `/github/user/:username` | GET | Sim | Busca + análise de perfil |
| `/github/repo/:owner/:repo` | GET | Sim | Busca + análise de repositório |
| `/history` | GET | Sim | Histórico de buscas (últimas 20) |
| `/history/:id` | DELETE | Sim | Remove item do histórico |

### 4.2 node-service → python-service (interno, não exposto)

| Endpoint | Método | Descrição |
|---|---|---|
| `/analyze/user` | POST | Dados brutos de usuário → métricas + score |
| `/analyze/repo` | POST | Dados brutos de repositório → health score |
| `/health` | GET | Health check |

### 4.3 Envelope de resposta padrão (todos os endpoints)

```typescript
// Sucesso
{ "success": true, "data": { ... } }

// Erro
{ "success": false, "error": { "code": "CODIGO_ERRO", "message": "Mensagem legível" } }
```

**Regra:** nenhum endpoint retorna `data` e `error` preenchidos simultaneamente. Em sucesso parcial (circuit breaker), `data` é retornado com campo `analysisAvailable: false` — não é tratado como erro.

---

## 5. Decisões de design (não reabrir sem motivo técnico novo)

| Decisão | Escolha | Justificativa |
|---|---|---|
| Arquitetura | Microsserviços (2 backends) | Node.js natural para I/O; Python natural para análise com Pandas |
| Comunicação interna | HTTP síncrono | Volume baixo, latência aceitável, menor complexidade que mensageria |
| node-service como gateway único | Centraliza auth, cache e rate limit em um ponto | Frontend não precisa conhecer python-service |
| python-service não exposto | Isolamento de responsabilidade | Garante que só dados já validados chegam à análise |
| Cache Redis 10min | Reduz chamadas ao GitHub | Rate limit do GitHub: 5.000 req/h autenticado |
| JWT + refreshToken | Auth stateless | Padrão de mercado, sem necessidade de sessão no servidor |
| Refresh expirado → logout automático | Simplicidade + segurança | Renovação silenciosa tem custo alto de implementação |
| Rate limit GitHub estourado → 503 | Honestidade + simplicidade | Sem dado no cache = nada útil para retornar |
| Circuit breaker → resposta parcial | UX preservada | Dados brutos (nome, repos, stars) são suficientemente úteis sem score |

---

## 6. Glossário de tipos compartilhados

Estes tipos são a fonte única de verdade. Qualquer alteração aqui deve ser propagada para os SDDs dos serviços afetados.

```typescript
// Usuário autenticado no sistema
interface Usuario {
  id: string;           // UUID
  nome: string;
  email: string;
  criadoEm: string;     // ISO 8601
}

// Tokens de autenticação
interface TokensDeAutenticacao {
  token: string;        // JWT, expira em 24h
  refreshToken: string; // expira em 7 dias
  expiresIn: number;    // segundos até expiração do token principal
}

// Resumo de repositório (usado dentro de PerfilDeUsuarioGitHub)
interface ResumoDeRepositorio {
  nome: string;
  linguagem: string | null;
  estrelas: number;
  forks: number;
  issuesAbertas: number;
  atualizadoEm: string; // ISO 8601
}

// Dados brutos de usuário coletados do GitHub (enviados ao python-service)
interface PerfilDeUsuarioGitHub {
  username: string;
  repositoriosPublicos: number;
  seguidores: number;
  repositorios: ResumoDeRepositorio[];
}

// Dados brutos de repositório coletados do GitHub (enviados ao python-service)
interface DadosBrutosDeRepositorio {
  owner: string;
  repo: string;
  estrelas: number;
  forks: number;
  issuesAbertas: number;
  linguagem: string | null;
  atualizadoEm: string; // ISO 8601
  commitsPorSemana: { semana: string; total: number }[];
}

// Resposta da análise de usuário (retornada pelo python-service)
interface AnaliseDeUsuario {
  username: string;
  activityScore: number;          // 0–100
  topLinguagens: { linguagem: string; percentual: number }[];
  totalEstrelas: number;
  repositorioMaisEstrelado: string;
  repositoriosAtualizadosUltimos30Dias: number;
  insights: string[];
}

// Resposta da análise de repositório (retornada pelo python-service)
interface AnaliseDeRepositorio {
  repo: string;
  healthScore: number;            // 0–100
  tendenciaDeAtividade: 'crescente' | 'estavel' | 'decrescente';
  mediaDeCommitsPorSemana: number;
  razaoDeIssuesAbertas: number;   // issuesAbertas / estrelas
  diasDesdeUltimaAtualizacao: number;
  insights: string[];
}

// Resposta consolidada de busca de usuário (retornada pelo node-service ao frontend)
interface RespostaDeBuscaDeUsuario {
  perfil: PerfilDeUsuarioGitHub;
  analise: AnaliseDeUsuario | null;  // null quando analysisAvailable = false
  analysisAvailable: boolean;
  cacheadoEm: string | null;         // ISO 8601, null se dado veio direto da API
}

// Resposta consolidada de busca de repositório
interface RespostaDeBuscaDeRepositorio {
  dados: DadosBrutosDeRepositorio;
  analise: AnaliseDeRepositorio | null;
  analysisAvailable: boolean;
  cacheadoEm: string | null;
}

// Item do histórico de buscas
interface ItemDeHistorico {
  id: string;           // UUID
  tipoDeBusca: 'usuario' | 'repositorio';
  valorBuscado: string; // username ou owner/repo
  score: number | null; // activityScore ou healthScore; null se analysis não disponível
  realizadaEm: string;  // ISO 8601
}
```

---

## 7. Convenções de código (aplicam-se a todos os SDDs)

### 7.1 Nomenclatura
- **Funções, métodos, variáveis e classes em português, autoexplicativos.** Ex: `buscarPerfilDeUsuarioNoGitHub`, `calcularScoreDeAtividade`, `validarTokenJWT`.
- **Nomes de arquivos** seguem a convenção da tecnologia: `camelCase.ts` para Node/TS, `snake_case.py` para Python, `PascalCase.tsx` para componentes React.
- **Tipos e interfaces em português** quando representam conceitos de domínio (ver seção 6); em inglês quando são genéricos de infraestrutura exigidos pela lib (ex: `Env`, `Context`).

### 7.2 Princípios SOLID
- **S:** cada função faz uma coisa. `buscarDadosDoGitHub` só busca. `validarPerfilDeUsuario` só valida.
- **O:** novos tipos de análise entram como nova classe que implementa a interface base — sem alterar classes existentes.
- **L:** `RepositorioDeUsuarioEmMemoria` (para testes) e `RepositorioDeUsuarioPostgres` (produção) são intercambiáveis.
- **I:** interfaces pequenas e específicas. `IRepositorioDeUsuario` não mistura com `IRepositorioDeCache`.
- **D:** services recebem repositórios e clientes HTTP via construtor — nunca instanciam diretamente.

### 7.3 Qualidade
- Sem números mágicos — toda constante nomeada em arquivo de constantes, com comentário referenciando qual decisão da spec a originou.
- Tipagem estrita em TypeScript (`strict: true`, zero `any`). Pydantic v2 para Python.
- Tratamento de erro explícito em toda operação que pode falhar — ver SDD-07.
- Funções puras para validação e transformação. Efeitos colaterais (rede, banco) isolados em serviços.

---

## 8. Checklist de consistência (verificar antes de abrir o primeiro PR)

Este checklist garante que o glossário da seção 6 e as decisões da seção 5 estão refletidos no código real — e não divergiram durante a implementação.

**Tipos de domínio (seção 6):**
- [ ] Todos os 10 tipos do glossário existem como interfaces/classes no código e os nomes batem exatamente
- [ ] `RespostaDeBuscaDeUsuario.analysisAvailable` é `boolean` (não `string`, não `number`)
- [ ] `ItemDeHistorico.score` é `number | null` — nunca `undefined`
- [ ] `AnaliseDeUsuario.activityScore` e `AnaliseDeRepositorio.healthScore` são `number` (float 0–100), nunca `string`
- [ ] Campos opcionais do glossário (`linkDemo?`, `cacheadoEm | null`) implementados com o tipo correto

**Decisões de arquitetura (seção 5):**
- [ ] python-service não aparece em nenhum import ou chamada do frontend
- [ ] node-service é o único serviço que chama a GitHub API (grep por `api.github.com` no python-service e frontend — deve retornar vazio)
- [ ] Circuit breaker implementado: desligar python-service e confirmar que `GET /github/user/:username` retorna `200` com `analysisAvailable: false`
- [ ] Refresh token expirado → redirect para `/login?motivo=sessao_expirada` com banner visível (não 401 puro)
- [ ] Rate limit GitHub → `503` com `SERVICE_UNAVAILABLE` sem vazar a mensagem original da API do GitHub

**Convenções (seção 7):**
- [ ] Grep por funções em inglês no node-service (`getUser`, `calcScore`, `handleErr`) — deve retornar vazio
- [ ] Grep por números literais fora de `constantes.ts`/`constantes.py` — deve retornar vazio (exceto `0`, `1`, `-1`)
- [ ] `any` ausente no TypeScript: `npx tsc --noEmit` sem erros em todos os serviços
