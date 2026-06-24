# SDD-07 — Tratamento de Erros

**Pré-requisito:** SDD-01 lido.
**Escopo:** padrão Guard para classificação de erros, mapeamento de códigos HTTP, mensagens ao usuário, logging. Lido em conjunto com SDD-02 (node-service) e SDD-03 (python-service).

---

## 0. Spec — Padrão de erros

**Comportamento:**
- Todo erro que chega ao cliente segue o envelope padrão definido no SDD-01, seção 4.3:
  ```json
  { "success": false, "error": { "code": "CODIGO", "message": "Mensagem legível" } }
  ```
- Detalhes internos (stack trace, mensagem de banco, query SQL) nunca chegam ao cliente.
- O cliente sempre recebe um `code` estável (string constante) que o frontend pode usar para lógica condicional, e uma `message` legível para exibição.

**Regras:**
- Erros de validação Zod (400) incluem campo `fields` com os campos inválidos: `{ code: "VALIDATION_ERROR", message: "...", fields: { nomeDoCampo: "mensagem do erro" } }`.
- Erros inesperados (500) retornam mensagem genérica — nunca a mensagem original da exceção.
- Todos os erros são logados pelo Winston com nível apropriado (ver seção 2).

**Critérios de aceite:**

Família 400 — validação:
- ✓ `POST /auth/register` com `email: "invalido"` → `400` + `{ code: "VALIDATION_ERROR", fields: { email: "..." } }` (verificar via curl)
- ✓ Campo obrigatório ausente no body → `400` + `fields` com o nome do campo faltando

Família 401 — autenticação:
- ✓ `GET /github/user/torvalds` sem header `Authorization` → `401` + `{ code: "MISSING_TOKEN" }`
- ✓ Mesma rota com token adulterado (alterar 1 char no JWT) → `401` + `{ code: "INVALID_TOKEN" }`
- ✓ Mesma rota com JWT expirado → `401` + `{ code: "TOKEN_EXPIRED" }`

Família 404 — recurso não encontrado:
- ✓ `GET /github/user/usuario-que-nao-existe-xyzxyz` → `404` + `{ code: "USER_NOT_FOUND" }`
- ✓ `DELETE /history/uuid-inexistente` → `404` + `{ code: "NOT_FOUND" }` (mesmo para UUID de outro usuário)
- ✓ `GET /api/v1/rota-que-nao-existe` → `404` + `{ code: "ROUTE_NOT_FOUND" }`

Família 503 — serviço externo:
- ✓ Com GITHUB_TOKEN inválido gerando rate limit: `GET /github/user/torvalds` → `503` + `{ code: "SERVICE_UNAVAILABLE" }` sem mencionar GitHub na mensagem

Família 500 — erro inesperado:
- ✓ Com banco derrubado (`docker compose stop postgres`): qualquer rota autenticada → `500` + `{ code: "INTERNAL_ERROR", message: "Erro interno. Tente novamente em instantes." }` sem stack trace no body
- ✓ Log do Winston contém o stack trace completo do mesmo erro (verificar via `docker compose logs node-service`)

Envelope:
- ✓ Nenhuma resposta de erro contém stack trace, mensagem de banco ou query SQL no body
- ✓ Todo erro tem exatamente os campos `success: false` e `error: { code, message }` — nada a mais, nada a menos (exceto `fields` no 400)

---

## 1. Classificação de erros — padrão Guard

Todo erro no node-service é classificado em uma das três categorias antes de ser tratado:

### Guard Critical
**Quando usar:** falha que impede a requisição de prosseguir e requer atenção imediata.
**Ação:** interrompe o fluxo, retorna erro HTTP ao cliente, loga em nível `error`.
**Exemplos:** banco de dados inacessível, erro interno inesperado, falha ao salvar dado obrigatório.

### Guard Non-Critical
**Quando usar:** falha parcial que pode ser contornada com fallback.
**Ação:** continua com o dado de fallback, loga em nível `warn`.
**Exemplos:** python-service indisponível → retorna `analysisAvailable: false`. Histórico falhou ao salvar → requisição continua, log de aviso.

### Guard Silent
**Quando usar:** falha esperada e de baixo impacto que não afeta a experiência do usuário.
**Ação:** absorve o erro, não interrompe, loga em nível `debug`.
**Exemplos:** item de cache não encontrado no Redis (é esperado — cache MISS). Falha ao atualizar TTL de um item cacheado.

---

## 2. Tabela de erros por código HTTP

### 400 — Bad Request (erro do cliente, dados inválidos)
| Code | Situação | Mensagem ao cliente |
|---|---|---|
| `VALIDATION_ERROR` | Campo com formato inválido, tamanho fora do limite | "Dados inválidos. Verifique os campos." + `fields` |
| `INVALID_PARAMETER` | Parâmetro de rota inválido (ex: username com caractere especial) | "Parâmetro inválido: {campo}." |

### 401 — Unauthorized (autenticação falhou)
| Code | Situação | Mensagem ao cliente |
|---|---|---|
| `MISSING_TOKEN` | Header Authorization ausente | "Autenticação necessária." |
| `INVALID_TOKEN` | Token malformado ou assinatura inválida | "Token inválido." |
| `TOKEN_EXPIRED` | JWT ou refreshToken expirado | "Token expirado." / "Sessão expirada, faça login novamente." |
| `INVALID_CREDENTIALS` | Email/senha incorretos | "Email ou senha incorretos." |

### 404 — Not Found (recurso não existe)
| Code | Situação | Mensagem ao cliente |
|---|---|---|
| `USER_NOT_FOUND` | Username não existe no GitHub | "Usuário não encontrado no GitHub." |
| `REPO_NOT_FOUND` | Repositório não existe ou é privado | "Repositório não encontrado." |
| `NOT_FOUND` | Item do histórico não encontrado ou de outro usuário | "Item não encontrado." |
| `ROUTE_NOT_FOUND` | Rota da API não existe | "Rota não encontrada." |

### 422 — Unprocessable Entity (Pydantic — python-service)
| Code | Situação | Mensagem |
|---|---|---|
| Automático Pydantic | Payload com tipo inválido ou campo obrigatório ausente | Detalhes automáticos do Pydantic |

### 500 — Internal Server Error (falha inesperada)
| Code | Situação | Mensagem ao cliente | Log |
|---|---|---|---|
| `INTERNAL_ERROR` | Exceção não tratada, falha de banco inesperada | "Erro interno. Tente novamente em instantes." | `error` com stack trace completo |

### 503 — Service Unavailable (serviço externo indisponível)
| Code | Situação | Mensagem ao cliente |
|---|---|---|
| `SERVICE_UNAVAILABLE` | Rate limit do GitHub estourado (403/429 da API GitHub) | "Serviço temporariamente indisponível. Tente novamente em alguns minutos." |

---

## 3. Middleware de tratamento de erros (node-service)

Middleware Express registrado por último em `app.ts`, captura todos os erros lançados nos controladores e serviços:

```typescript
// middlewares/tratadorDeErros.ts
export function tratadorDeErrosGlobal(erro, req, res, next) {
  // Erros de domínio (lançados intencionalmente)
  if (erro instanceof ErroDeNegocio) {
    logger.warn({ code: erro.code, path: req.path, message: erro.message });
    return res.status(erro.statusHttp).json({
      success: false,
      error: { code: erro.code, message: erro.mensagemParaCliente }
    });
  }

  // Erros de validação Zod
  if (erro instanceof ZodError) {
    const campos = formatarErrosZod(erro);
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos. Verifique os campos.', fields: campos }
    });
  }

  // Erro inesperado — Guard Critical
  logger.error({ path: req.path, stack: erro.stack, message: erro.message });
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno. Tente novamente em instantes.' }
  });
}
```

### Classe base `ErroDeNegocio`

```typescript
// utilitarios/erros.ts
export class ErroDeNegocio extends Error {
  constructor(
    public readonly code: string,
    public readonly mensagemParaCliente: string,
    public readonly statusHttp: number
  ) {
    super(mensagemParaCliente);
  }
}

// Erros específicos (instanciados nos serviços)
export class ErroUsuarioNaoEncontrado extends ErroDeNegocio {
  constructor() { super('USER_NOT_FOUND', 'Usuário não encontrado no GitHub.', 404); }
}
export class ErroRepositorioNaoEncontrado extends ErroDeNegocio {
  constructor() { super('REPO_NOT_FOUND', 'Repositório não encontrado.', 404); }
}
export class ErroServicoIndisponivel extends ErroDeNegocio {
  constructor() { super('SERVICE_UNAVAILABLE', 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.', 503); }
}
export class ErroCredenciaisInvalidas extends ErroDeNegocio {
  constructor() { super('INVALID_CREDENTIALS', 'Email ou senha incorretos.', 401); }
}
export class ErroItemNaoEncontrado extends ErroDeNegocio {
  constructor() { super('NOT_FOUND', 'Item não encontrado.', 404); }
}
```

---

## 4. Logging (Winston — node-service)

### Níveis por tipo de evento

| Nível | Quando usar |
|---|---|
| `error` | Guard Critical: exceção inesperada, falha de banco, stack trace completo |
| `warn` | Guard Non-Critical: circuit breaker acionado, falha ao salvar histórico, rate limit externo |
| `info` | Requisição recebida (path, method, status, duração), startup e shutdown do serviço |
| `debug` | Guard Silent: cache MISS, cache HIT, detalhes de chamadas internas |

### Campos obrigatórios em todo log

```typescript
{
  timestamp: string,   // ISO 8601
  level: string,
  message: string,
  path?: string,       // rota HTTP quando aplicável
  method?: string,
  statusCode?: number,
  duracaoMs?: number,
  usuarioId?: string,  // quando autenticado (nunca email)
  code?: string,       // code do ErroDeNegocio quando aplicável
}
```

**Campos proibidos em qualquer nível de log:** `senha`, `senhaHash`, `token`, `refreshToken`, `JWT_SECRET`, `GITHUB_TOKEN`, `Authorization`.

### Formato de log

- Desenvolvimento: legível (colorido, com stack trace inline).
- Produção: JSON linha por linha (facilita parsing por ferramentas de observabilidade).

---

## 5. Tratamento de erros no python-service

O python-service usa o mecanismo automático do FastAPI + Pydantic para validação de entrada (`422`). Para erros de processamento interno:

```python
# app/utilitarios/erros.py
class ErroDeDivisaoPorZero(Exception):
    """Levantado quando denominador é zero em cálculo de score."""
    pass
```

**Regra:** nunca lançar exceção por divisão por zero — sempre verificar denominador antes de dividir e retornar 0 nesses casos (ver SDD-03, spec 0.1 e 0.2). `ErroDeDivisaoPorZero` existe apenas como documentação da intenção — não deve ser lançada em runtime.

Handler de erro global no FastAPI para erros inesperados:
```python
@app.exception_handler(Exception)
async def tratador_de_erro_global(request, exc):
    logger.error(f"Erro inesperado: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Erro interno."})
```

---

## 6. Critérios de conclusão deste SDD

- [ ] Middleware `tratadorDeErrosGlobal` registrado como último middleware em `app.ts`.
- [ ] Todas as classes de `ErroDeNegocio` definidas em `utilitarios/erros.ts`.
- [ ] Nenhum controlador ou serviço retorna `res.status(xxx).json(...)` diretamente — todos lançam `ErroDeNegocio` e deixam o middleware tratar.
- [ ] Teste: erro inesperado (ex: banco fora do ar) → `500` com `INTERNAL_ERROR`, stack trace apenas no log.
- [ ] Teste: `JWT_SECRET` e `GITHUB_TOKEN` ausentes dos logs (grep nos logs após testes).
- [ ] python-service: `POST /analyze/user` com `estrelas: 0` → sem exceção de divisão por zero.
- [ ] python-service: handler global registrado em `main.py`, retornando mensagem genérica em exceções não tratadas.
