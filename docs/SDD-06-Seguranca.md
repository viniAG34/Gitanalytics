# SDD-06 — Segurança

**Pré-requisito:** SDD-01 lido.
**Escopo:** autenticação JWT, hashing de senhas, CORS, proteção de rotas, boas práticas de segredos. Lido em conjunto com SDD-02 (node-service) e SDD-04 (frontend).

---

## 0. Spec — Autenticação JWT

**Comportamento:**
- JWT principal (`token`): expira em 24h. Assinado com `JWT_SECRET`.
- refreshToken: expira em 7 dias. Assinado com `JWT_REFRESH_SECRET` (chave diferente).
- Middleware `autenticarJWT` aplicado em todas as rotas privadas antes de qualquer lógica de controlador.
- Refresh token não é rotacionado (v1): o mesmo refreshToken continua válido até expirar.

**Regras:**
- `JWT_SECRET` e `JWT_REFRESH_SECRET` são strings aleatórias de no mínimo 64 caracteres. Nunca podem ser iguais.
- Payload do JWT contém apenas: `{ sub: usuario.id, email: usuario.email, iat, exp }`. Nunca inclui senha, hash ou dados sensíveis.
- Token entregue apenas no corpo da resposta JSON (não em cookie, não em header customizado na resposta).
- Token enviado pelo cliente no header `Authorization: Bearer {token}`.

**Casos de borda:**
| Situação | Resultado |
|---|---|
| Token ausente no header | `401` + `{ code: "MISSING_TOKEN", message: "Autenticação necessária." }` |
| Token malformado (não é JWT válido) | `401` + `{ code: "INVALID_TOKEN", message: "Token inválido." }` |
| Token com assinatura inválida (adulterado) | `401` + `{ code: "INVALID_TOKEN", message: "Token inválido." }` |
| Token expirado | `401` + `{ code: "TOKEN_EXPIRED", message: "Token expirado." }` — frontend usa esse código para disparar o refresh |
| refreshToken expirado em `POST /auth/refresh` | `401` + `{ code: "TOKEN_EXPIRED", message: "Sessão expirada, faça login novamente." }` |

**Critérios de aceite:**
- ✓ Requisição sem header `Authorization` → `401` com `MISSING_TOKEN`
- ✓ JWT adulterado → `401` com `INVALID_TOKEN`
- ✓ JWT expirado → `401` com `TOKEN_EXPIRED` (frontend usa para refresh)
- ✓ JWT válido → middleware chama `next()`, `req.usuarioAutenticado` preenchido com `{ id, email }`
- ✓ refreshToken expirado → `401` com `TOKEN_EXPIRED` e mensagem de sessão expirada

---

## 0.2 Spec — Hashing de senhas (bcrypt)

**Comportamento:**
- Toda senha é hasheada com bcrypt antes de persistir. Custo: 12.
- Em login, `bcrypt.compare` é sempre executado — mesmo quando o email não existe (usando hash dummy pré-calculado). Isso garante tempo de resposta uniforme entre "email não existe" e "senha errada", impedindo timing attacks.

**Regras:**
- Hash dummy: string bcrypt pré-calculada em tempo de inicialização do serviço, armazenada em memória.
  - Propósito: quando o email não é encontrado no banco, executar `bcrypt.compare(senhaFornecida, hashDummy)` para manter o tempo de resposta consistente.
- Custo 12 implica ~250ms por operação de hash em hardware moderno — aceitável.
- Nunca logar senha em texto claro ou hash em nenhum nível de log.

**Critérios de aceite:**
- ✓ Registro: senha armazenada como hash bcrypt no banco, nunca em texto claro
- ✓ Login com email inexistente: tempo de resposta similar ao login com email existente + senha errada (± 50ms)
- ✓ Login com email existente + senha correta: `bcrypt.compare` retorna true, login bem-sucedido
- ✓ Nenhum log contém a string da senha ou do hash

---

## 0.3 Spec — CORS

**Comportamento:**
- CORS configurado no node-service via middleware (não no Nginx — o Nginx apenas faz proxy).
- Em desenvolvimento: `origin: 'http://localhost'` (frontend servido pelo Nginx local).
- Em produção: `origin: 'https://seudominio.com'` (substituir pelo domínio real).
- Nunca `origin: '*'` em nenhum ambiente.

**Headers CORS permitidos:**
- `Access-Control-Allow-Origin`: domínio específico
- `Access-Control-Allow-Methods`: `GET, POST, DELETE, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type, Authorization`

**Critérios de aceite:**
- ✓ Requisição OPTIONS de `http://localhost` → responde com headers CORS corretos (status 204)
- ✓ Requisição de origem diferente (ex: `http://malicioso.com`) → sem headers CORS na resposta (browser bloqueia)

---

## 0.4 Spec — Proteção de dados sensíveis

**Regras — segredos:**
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GITHUB_TOKEN`, `POSTGRES_PASSWORD` nunca em código-fonte ou logs.
- Sempre carregados de variáveis de ambiente (`.env` em desenvolvimento, variáveis do sistema em produção).
- `.env` no `.gitignore`. Verificar via `git status` antes de todo commit.

**Regras — respostas da API:**
- Hash de senha (`senha_hash`) nunca incluído em nenhum payload de resposta.
- `GITHUB_TOKEN` nunca exposto ao frontend ou em logs.
- Mensagens de erro de banco de dados nunca expostas ao cliente (ver SDD-07).

**Critérios de aceite:**
- ✓ `GET /api/v1/history` → resposta não contém campo `senha_hash` em nenhum objeto de usuário
- ✓ Logs do Winston em nível `info` não contêm valores de `JWT_SECRET`, `GITHUB_TOKEN` ou senhas
- ✓ `.env` ausente do repositório Git (verificar com `git ls-files .env`)

---

## 0.5 Review das specs de segurança (checklist aplicado)

| Verificação | Resultado |
|---|---|
| Todos os cenários de token inválido mapeados? | ✓ Ausente, malformado, adulterado, expirado — cada um com código distinto |
| Timing attack de login mitigado? | ✓ Hash dummy garante tempo uniforme |
| CORS restritivo? | ✓ Origin específica, nunca `*` |
| Segredos fora do código? | ✓ Sempre via variável de ambiente |
| Casos de borda esquecidos? | Rate limiting de tentativas de login: excluído da v1 por decisão consciente (SDD-02, spec 0.2) |

---

## 1. Implementação do middleware `autenticarJWT`

```typescript
// middlewares/autenticarJWT.ts
import jwt from 'jsonwebtoken';
import { CODIGO_ERRO } from '../utilitarios/constantes'; // ver seção 2

export function autenticarJWT(req, res, next) {
  const cabecalhoDeAutorizacao = req.headers['authorization'];

  if (!cabecalhoDeAutorizacao || !cabecalhoDeAutorizacao.startsWith('Bearer ')) {
    return res.status(401).json(responderComErro('MISSING_TOKEN', 'Autenticação necessária.'));
  }

  const token = cabecalhoDeAutorizacao.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as PayloadDoToken;
    req.usuarioAutenticado = { id: payload.sub, email: payload.email };
    next();
  } catch (erro) {
    if (erro instanceof jwt.TokenExpiredError) {
      return res.status(401).json(responderComErro('TOKEN_EXPIRED', 'Token expirado.'));
    }
    return res.status(401).json(responderComErro('INVALID_TOKEN', 'Token inválido.'));
  }
}
```

---

## 2. Constantes de segurança (`utilitarios/constantes.ts`)

```typescript
// JWT (spec 0.1)
export const DURACAO_TOKEN_JWT = '24h';
export const DURACAO_REFRESH_TOKEN = '7d';

// bcrypt (spec 0.2)
export const CUSTO_BCRYPT = 12;

// Códigos de erro de autenticação (SDD-07)
export const CODIGO_ERRO_TOKEN_AUSENTE = 'MISSING_TOKEN';
export const CODIGO_ERRO_TOKEN_INVALIDO = 'INVALID_TOKEN';
export const CODIGO_ERRO_TOKEN_EXPIRADO = 'TOKEN_EXPIRED';
export const CODIGO_ERRO_CREDENCIAIS_INVALIDAS = 'INVALID_CREDENTIALS';
```

---

## 3. Checklist de segurança pré-deploy

- [ ] `JWT_SECRET` e `JWT_REFRESH_SECRET` gerados com `openssl rand -base64 64` (strings distintas)
- [ ] `GITHUB_TOKEN` com escopo mínimo: apenas `public_repo`
- [ ] `.env` ausente do repositório: `git ls-files .env` retorna vazio
- [ ] Hash dummy inicializado no startup do node-service (não calculado a cada login)
- [ ] CORS com `origin` específica configurada (não `*`)
- [ ] Nenhum `console.log` com dados sensíveis (grep no código antes do deploy)
- [ ] `senha_hash` ausente de todos os tipos de resposta TypeScript
