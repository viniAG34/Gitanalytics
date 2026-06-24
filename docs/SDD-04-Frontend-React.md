# SDD-04 — Frontend React

**Pré-requisito:** SDD-01, SDD-06, SDD-07 lidos.
**Entrega:** SPA React funcional, todas as páginas implementadas, consumindo o node-service real, com estados de loading/erro tratados visualmente.

---

## 0. Spec por fluxo (comportamento esperado)

---

### 0.1 Spec — Fluxo de autenticação

**Comportamento — Registro:**
- Usuário preenche nome, email e senha.
- Validação client-side: campos obrigatórios, formato de email, requisitos de senha (mín. 8 chars, 1 número, 1 maiúscula) — validação de UX, não de negócio (regra de negócio está no backend).
- Sucesso: armazena token + refreshToken no AuthStore, redireciona para `/`.
- Erro `400`: exibe mensagem de validação retornada pela API.
- Erro de rede: exibe "Não foi possível conectar ao servidor."

**Comportamento — Login:**
- Sucesso: armazena tokens, redireciona para `/`.
- `401`: exibe "Email ou senha incorretos." (mensagem vinda da API, não criada no frontend).
- Erro de rede: "Não foi possível conectar ao servidor."

**Comportamento — Expiração de sessão:**
- JWT expirado em qualquer requisição autenticada → interceptor do Axios chama `POST /auth/refresh`.
- Refresh bem-sucedido: nova requisição original é executada transparentemente (usuário não percebe).
- refreshToken expirado (`401` com `TOKEN_EXPIRED`): AuthStore.logout(), redirect para `/login` com query param `?motivo=sessao_expirada`, LoginPage exibe banner "Sessão expirada, faça login novamente."

**Regras:**
- Token JWT armazenado no Zustand (memória) + localStorage para persistência entre abas/recargas.
- refreshToken armazenado apenas no localStorage (não no store em memória após hidratação inicial).
- Nunca armazenar senha em nenhum estado, localStorage ou log.

**Critérios de aceite:**
- ✓ Registro com dados válidos → redireciona para `/` autenticado
- ✓ Login com credenciais inválidas → exibe "Email ou senha incorretos." sem redirecionar
- ✓ JWT expirado durante uso → refresh transparente, usuário não percebe
- ✓ refreshToken expirado → logout + redirect `/login?motivo=sessao_expirada` + banner visível
- ✓ Recarregar a página com token válido no localStorage → continua autenticado
- ✓ Sem token no localStorage → redirect para `/login`

---

### 0.2 Spec — Fluxo de busca

**Comportamento:**
- SearchPage exibe campo de busca com dois modos detectados automaticamente:
  - Modo usuário: input sem barra (`torvalds`)
  - Modo repositório: input com exatamente uma barra (`facebook/react`)
- Input com mais de uma barra → modo inválido, exibe hint "Use o formato usuario/repositorio".
- Submit redireciona para `/user/:username` ou `/repo/:owner/:repo` conforme o modo.
- A própria página de resultado (`UserResultPage` ou `RepoResultPage`) dispara a busca via React Query.

**Estados da página de resultado:**
| Estado | O que mostrar |
|---|---|
| Loading | Skeleton dos cards, não texto "Carregando..." |
| Sucesso com `analysisAvailable: true` | Dashboard completo com scores e insights |
| Sucesso com `analysisAvailable: false` | Dashboard parcial: dados brutos visíveis, seção de análise substituída por aviso "Análise temporariamente indisponível." |
| `404 USER_NOT_FOUND` | Página de erro: "Usuário não encontrado no GitHub." + botão voltar |
| `404 REPO_NOT_FOUND` | Página de erro: "Repositório não encontrado." + botão voltar |
| `503 SERVICE_UNAVAILABLE` | Página de erro: "Serviço temporariamente indisponível. Tente novamente em alguns minutos." + botão voltar |
| Erro de rede | "Não foi possível conectar ao servidor." + botão tentar novamente |

**Regras:**
- Cache do React Query: `staleTime: 5 * 60 * 1000` (5 min). Mesma busca em menos de 5min não refaz a requisição.
- `refetchOnWindowFocus: false` — não refazer ao focar a aba.
- URL de busca navegável: `/user/torvalds` pode ser acessada diretamente (deep link).

**Critérios de aceite:**
- ✓ Input `torvalds` → redireciona para `/user/torvalds`
- ✓ Input `facebook/react` → redireciona para `/repo/facebook/react`
- ✓ Input `a/b/c` → exibe hint de formato inválido, não redireciona
- ✓ Página de usuário em loading → skeletons visíveis
- ✓ Página de usuário com `analysisAvailable: false` → aviso visível, dados brutos presentes
- ✓ `404` → mensagem de erro + botão voltar, sem tela quebrada
- ✓ `/user/torvalds` acessado diretamente (deep link) → funciona corretamente
- ✓ Mesma busca repetida em menos de 5min → sem nova requisição (verificável nas DevTools)

---

### 0.3 Spec — Histórico de buscas

**Comportamento:**
- HistoryPage lista as 20 buscas mais recentes com: tipo (ícone), valor buscado, score (ou "—" se `null`), data.
- Clicar em um item redireciona para `/user/:username` ou `/repo/:owner/:repo`.
- Botão de remover (ícone lixeira) em cada item: chama `DELETE /history/:id`, remove da lista otimisticamente (atualiza UI antes da resposta da API), reverte em caso de erro.

**Casos de borda:**
| Situação | Resultado |
|---|---|
| Lista vazia | Exibe "Nenhuma busca realizada ainda." |
| Score `null` | Exibe "—" no lugar do score |
| Erro ao remover | Reverte item à lista + exibe toast de erro |

**Critérios de aceite:**
- ✓ Lista com itens → renderiza cada item com tipo, valor, score e data
- ✓ Score `null` → exibe "—", sem erro de renderização
- ✓ Lista vazia → exibe mensagem vazia, sem erro
- ✓ Clique em item → redireciona para a página correta
- ✓ Remoção → item some da lista imediatamente (otimista) + confirmação da API
- ✓ Erro na remoção → item retorna à lista + toast de erro visível

---

### 0.4 Review das specs (checklist aplicado)

| Verificação | Resultado |
|---|---|
| Todas as permissões/rotas protegidas? | ✓ `/`, `/user/*`, `/repo/*`, `/history` protegidas por `RotePrivada`. Login/registro são públicos. |
| Todos os estados visuais definidos? | ✓ Loading (skeleton), sucesso completo, sucesso parcial, 4 tipos de erro, rede offline — todos especificados. |
| Decisões de negócio são do dono? | ✓ Cache 5min React Query; refresh transparente; logout automático em sessão expirada; remoção otimista — todos em SDD-01, seção 5. |
| Critérios verificáveis? | ✓ Todos testáveis via interação ou DevTools Network. |
| Casos de borda esquecidos? | Input vazio no SearchBar → submit desabilitado (botão disabled quando campo vazio). |

---

## 1. Stack técnica

| Categoria | Tecnologia | Justificativa |
|---|---|---|
| Framework | React 18 | |
| Linguagem | TypeScript | `strict: true` |
| Build | Vite | |
| Estilo | Tailwind CSS | |
| Gráficos | Recharts | Componentes React nativos, responsivos |
| HTTP + Cache | TanStack Query (React Query v5) | Cache, loading e error automáticos |
| HTTP Client | Axios | Interceptors para JWT e refresh |
| Rotas | React Router v6 | |
| Estado global | Zustand | Auth store |
| Formulários | React Hook Form + Zod | Validação tipada |
| Testes | Vitest + React Testing Library | |

---

## 2. Estrutura de diretórios

```
frontend/
  src/
    api/
      cliente.ts            # instância Axios configurada + interceptors
      apiDeAutenticacao.ts
      apiDoGitHub.ts
      apiDeHistorico.ts
    componentes/
      ui/                   # Button, Input, Card, Badge, Skeleton, Toast
      graficos/             # GraficoDeLinguagens, GraficoDeCommits
      layout/               # Header, RotePrivada, PageWrapper
    paginas/
      LoginPage/
      RegisterPage/
      SearchPage/
      UserResultPage/
      RepoResultPage/
      HistoryPage/
    hooks/
      useAutenticacao.ts    # wrapper do AuthStore
      useUsuarioGitHub.ts   # React Query para busca de usuário
      useRepositorioGitHub.ts
      useHistorico.ts
    store/
      authStore.ts          # Zustand: user, token, login(), logout()
    tipos/                  # interfaces do SDD-01, seção 6 (copiadas aqui)
    utilitarios/
      formatadores.ts       # formatarData, formatarScore, formatarNumero
      constantes.ts
    roteador/
      index.tsx             # React Router config
    App.tsx
    main.tsx
```

---

## 3. Configuração do cliente Axios (`api/cliente.ts`)

**Interceptor de request:** adiciona `Authorization: Bearer {token}` automaticamente.

**Interceptor de response:**
```
Recebe resposta com status 401:
  Se o erro tem code === 'TOKEN_EXPIRED' E ainda não tentou refresh:
    → POST /auth/refresh com refreshToken do localStorage
    → Sucesso: atualiza token no store e localStorage, repete requisição original
    → Falha (401): AuthStore.logout() + navigate('/login?motivo=sessao_expirada')
  Senão:
    → Propaga o erro normalmente
```

**Regra:** flag `_jaTemouRefresh` na config da requisição original para evitar loop infinito de refresh.

---

## 4. AuthStore (Zustand)

```typescript
interface AuthStore {
  usuario: Usuario | null;
  token: string | null;
  estaAutenticado: boolean; // derivado: !!token
  login: (tokens: TokensDeAutenticacao, usuario: Usuario) => void;
  logout: () => void;
  hidratarDoLocalStorage: () => void; // chamado no App.tsx na inicialização
}
```

**`login()`:** salva token no store + localStorage. Salva refreshToken apenas no localStorage.
**`logout()`:** limpa store e localStorage. Não faz chamada de API (sem endpoint de logout na v1).
**`hidratarDoLocalStorage()`:** chamado uma vez no mount do App.tsx. Lê token do localStorage e popula o store se válido (sem verificar expiração — o interceptor cuida disso na primeira requisição autenticada).

---

## 5. Páginas e rotas

| Rota | Página | Proteção |
|---|---|---|
| `/login` | LoginPage | Pública (redireciona para `/` se já autenticado) |
| `/register` | RegisterPage | Pública (redireciona para `/` se já autenticado) |
| `/` | SearchPage | Privada |
| `/user/:username` | UserResultPage | Privada |
| `/repo/:owner/:repo` | RepoResultPage | Privada |
| `/history` | HistoryPage | Privada |
| `*` | NotFoundPage | Pública — "Página não encontrada" + link para `/` |

---

## 6. Componentes principais e suas props

### `UserDashboard`
```typescript
interface PropsDoUserDashboard {
  dados: RespostaDeBuscaDeUsuario;
}
```
Composto por: `CartaoDeActivityScore`, `GraficoDeLinguagens`, `GridDeEstatisticas`, `TabelaDeRepositorios`, `ListaDeInsights`, e (quando `!analysisAvailable`) `AvisoDeAnaliseIndisponivel`.

### `RepoDashboard`
```typescript
interface PropsDoRepoDashboard {
  dados: RespostaDeBuscaDeRepositorio;
}
```
Composto por: `CartaoDeHealthScore`, `GraficoDeCommits`, `GridDeEstatisticasDeRepo`, `BadgeDeTendencia`, `ListaDeInsights`, e (quando `!analysisAvailable`) `AvisoDeAnaliseIndisponivel`.

### `AvisoDeAnaliseIndisponivel`
Componente simples, sem props. Exibe mensagem "Análise temporariamente indisponível. Os dados brutos do GitHub estão disponíveis abaixo." com ícone de aviso.

### `Skeleton`
```typescript
interface PropsDeSkeleton {
  largura?: string;
  altura?: string;
  arredondado?: boolean;
}
```
Usado em todos os estados de loading dos dashboards.

---

## 7. Constantes (`utilitarios/constantes.ts`)

```typescript
// Cache React Query (spec 0.2 — Regras)
export const STALE_TIME_BUSCA_GITHUB_EM_MS = 5 * 60 * 1000; // 5 minutos

// Auth (SDD-06)
export const CHAVE_TOKEN_LOCAL_STORAGE = 'ga_token';
export const CHAVE_REFRESH_TOKEN_LOCAL_STORAGE = 'ga_refresh_token';
export const CHAVE_USUARIO_LOCAL_STORAGE = 'ga_usuario';

// Histórico (spec 0.3)
export const MENSAGEM_HISTORICO_VAZIO = 'Nenhuma busca realizada ainda.';

// URL base da API
export const URL_BASE_DA_API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost/api/v1';
```

---

## 8. Estratégia de testes

### Testes de componente (Vitest + RTL)
- `SearchBar`: input `torvalds` → modo usuário. Input `facebook/react` → modo repo. Input `a/b/c` → exibe hint de inválido.
- `RotePrivada`: sem token no store → redireciona para `/login`. Com token → renderiza filho.
- `AvisoDeAnaliseIndisponivel`: renderiza mensagem correta.
- `CartaoDeActivityScore`: score 0, score 50, score 100 — todos renderizam sem erro.

### Testes de página (mock React Query)
- `UserResultPage` em loading → skeletons visíveis.
- `UserResultPage` com `analysisAvailable: false` → `AvisoDeAnaliseIndisponivel` visível.
- `UserResultPage` com erro `404` → mensagem de erro + botão voltar.
- `HistoryPage` com lista vazia → mensagem vazia.
- `HistoryPage` com itens onde `score: null` → exibe "—".

### Testes de hook
- `useAutenticacao`: `login()` popula store e localStorage. `logout()` limpa ambos.

---

## 9. Critérios de conclusão desta etapa

- [ ] Todos os critérios de aceite das specs 0.1, 0.2 e 0.3 verificados manualmente.
- [ ] Refresh transparente funcionando: JWT expirado → nova requisição acontece sem o usuário perceber (verificável via DevTools).
- [ ] refreshToken expirado → banner visível em `/login?motivo=sessao_expirada`.
- [ ] `analysisAvailable: false` → `AvisoDeAnaliseIndisponivel` visível, restante da página funcional.
- [ ] Deep links funcionando: `/user/torvalds` carregado diretamente → busca disparada e página renderizada.
- [ ] Input `a/b/c` no SearchBar → hint visível, sem redirect.
- [ ] Zero erros de TypeScript, `strict: true`.
- [ ] Sem `any` explícito no código.
