# SDD-QA — Qualidade de Código: Node.js + Express

**Versão:** 1.0  
**Stack:** Node.js + Express + TypeScript  
**Nível:** Máximo (cobertura total)  
**Autor:** Vinicius Aguiar Gadelha  

> Este documento é carregado como contexto pelo Claude Code em todo projeto Node/Express.  
> Antes de finalizar qualquer arquivo, o subagente DEVE verificar cada seção deste documento.  
> Código que não passa no checklist final **não é considerado pronto**.

---

## 1. Arquitetura de Camadas

### Regra fundamental
Cada camada tem UMA responsabilidade. Nunca misture responsabilidades entre camadas.

```
Request → Router → Controller → Service → Repository → Database
```

| Camada | Responsabilidade | O que NÃO deve ter |
|---|---|---|
| **Router** | Definir rota + chamar controller | Lógica nenhuma |
| **Controller** | Receber req/res, validar input, chamar service, retornar resposta | Regra de negócio, acesso a DB |
| **Service** | Regra de negócio, orquestração | Acesso direto a DB, req/res |
| **Repository** | Queries ao banco | Regra de negócio |
| **Middleware** | Concerns transversais (auth, log, erro) | Regra de negócio |

### Anti-patterns que sênior reprocha imediatamente
```typescript
// ❌ ERRADO — lógica de negócio no controller
app.post('/pedido', async (req, res) => {
  const usuario = await db.query('SELECT * FROM usuarios WHERE id = $1', [req.body.userId]);
  if (usuario.saldo < req.body.valor) {
    return res.status(400).json({ error: 'Saldo insuficiente' });
  }
  await db.query('UPDATE usuarios SET saldo = saldo - $1 WHERE id = $2', [req.body.valor, req.body.userId]);
  res.json({ ok: true });
});

// ✅ CORRETO
// router.ts
router.post('/pedido', autenticar, PedidoController.criar);

// PedidoController.ts
async criar(req: Request, res: Response): Promise<void> {
  const dto = CriarPedidoSchema.parse(req.body); // validação
  const pedido = await pedidoService.criar(dto, req.usuario.id);
  res.status(201).json(pedido);
}

// PedidoService.ts
async criar(dto: CriarPedidoDto, usuarioId: string): Promise<Pedido> {
  await this.validarSaldo(usuarioId, dto.valor); // regra de negócio aqui
  return this.pedidoRepository.criar({ ...dto, usuarioId });
}
```

---

## 2. Funções e Complexidade

### Regras obrigatórias
- **Máximo 20 linhas** por função. Se passar, quebre em subfunções nomeadas.
- **Máximo 3 condicionais** (if/else/switch) por função. Se passar, use Early Return ou dispatch.
- **Uma função = uma ação**. O nome deve descrever exatamente o que ela faz.
- **Sem side effects ocultos**. Função que busca usuário não deve alterar estado global.
- **Parâmetros**: máximo 3. Se precisar de mais, use um objeto de configuração.

### Early Return (Guard Clauses) — obrigatório
```typescript
// ❌ ERRADO — ifs aninhados (código "flecha")
async function processarPagamento(pedidoId: string, usuarioId: string) {
  const pedido = await buscarPedido(pedidoId);
  if (pedido) {
    if (pedido.usuarioId === usuarioId) {
      if (pedido.status === 'pendente') {
        if (pedido.valor > 0) {
          await cobrar(pedido);
          return { ok: true };
        } else {
          throw new Error('Valor inválido');
        }
      } else {
        throw new Error('Pedido não está pendente');
      }
    } else {
      throw new Error('Pedido não pertence ao usuário');
    }
  } else {
    throw new Error('Pedido não encontrado');
  }
}

// ✅ CORRETO — Early Return
async function processarPagamento(pedidoId: string, usuarioId: string) {
  const pedido = await buscarPedido(pedidoId);

  if (!pedido) throw new AppError('Pedido não encontrado', 404);
  if (pedido.usuarioId !== usuarioId) throw new AppError('Acesso negado', 403);
  if (pedido.status !== 'pendente') throw new AppError('Pedido não está pendente', 400);
  if (pedido.valor <= 0) throw new AppError('Valor inválido', 400);

  await cobrar(pedido);
  return { ok: true };
}
```

### Dispatch Dictionary em vez de if/elif chain
```typescript
// ❌ ERRADO
function calcularDesconto(tipo: string, valor: number): number {
  if (tipo === 'vip') return valor * 0.2;
  else if (tipo === 'parceiro') return valor * 0.15;
  else if (tipo === 'novo') return valor * 0.1;
  else if (tipo === 'fidelidade') return valor * 0.05;
  else return 0;
}

// ✅ CORRETO
const DESCONTOS: Record<string, number> = {
  vip: 0.2,
  parceiro: 0.15,
  novo: 0.1,
  fidelidade: 0.05,
};

function calcularDesconto(tipo: string, valor: number): number {
  const percentual = DESCONTOS[tipo] ?? 0;
  return valor * percentual;
}
```

---

## 3. Tratamento de Erros

### Regra: NUNCA deixe erro sem tratamento
```typescript
// ❌ ERRADO — engolir erro
try {
  await salvarUsuario(dados);
} catch (e) {
  console.log(e); // erro ignorado, sistema continua em estado inválido
}

// ❌ ERRADO — throw genérico sem contexto
throw new Error('Erro');

// ✅ CORRETO — AppError tipado com contexto
throw new AppError('Email já cadastrado', 409, { campo: 'email' });
```

### Classe AppError obrigatória em todo projeto
```typescript
// src/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(recurso: string) {
    super(`${recurso} não encontrado`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(motivo = 'Não autorizado') {
    super(motivo, 401);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 422, context);
  }
}
```

### Middleware de erro centralizado — obrigatório
```typescript
// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Erros de validação do Zod
  if (err instanceof ZodError) {
    res.status(422).json({
      error: 'Dados inválidos',
      detalhes: err.errors.map((e) => ({
        campo: e.path.join('.'),
        mensagem: e.message,
      })),
    });
    return;
  }

  // Erros de negócio
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.context && { detalhes: err.context }),
    });
    return;
  }

  // Erros não tratados — nunca vazar stack em produção
  console.error('[ERRO NÃO TRATADO]', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : err.message,
  });
}
```

### Async handler — eliminar try/catch repetitivo nos controllers
```typescript
// src/utils/asyncHandler.ts
import { Request, Response, NextFunction } from 'express';

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler = (fn: AsyncFn) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };

// Uso no controller — sem try/catch em todo método
export class UsuarioController {
  criar = asyncHandler(async (req, res) => {
    const dto = CriarUsuarioSchema.parse(req.body);
    const usuario = await this.usuarioService.criar(dto);
    res.status(201).json(usuario);
  });
}
```

---

## 4. Validação de Input com Zod

### Regra: NUNCA confiar no req.body sem validação
```typescript
// ❌ ERRADO — usar req.body direto
const { nome, email, idade } = req.body; // pode ser qualquer coisa

// ✅ CORRETO — Zod valida e infere tipo
import { z } from 'zod';

const CriarUsuarioSchema = z.object({
  nome: z.string().min(2).max(100),
  email: z.string().email(),
  idade: z.number().int().min(18).max(120),
  papel: z.enum(['admin', 'usuario']).default('usuario'),
});

type CriarUsuarioDto = z.infer<typeof CriarUsuarioSchema>;

// No controller
const dto = CriarUsuarioSchema.parse(req.body); // lança ZodError se inválido
```

### Schemas ficam em arquivos separados
```
src/
  schemas/
    usuario.schema.ts
    pedido.schema.ts
    produto.schema.ts
```

---

## 5. TypeScript — Regras Obrigatórias

### Proibido
```typescript
// ❌ Proibido — any apaga o benefício do TypeScript
function processar(dados: any): any { ... }

// ❌ Proibido — asserção de tipo sem verificação
const usuario = resposta as Usuario;

// ❌ Proibido — non-null assertion sem certeza
const nome = usuario!.nome;

// ❌ Proibido — ts-ignore sem comentário explicando
// @ts-ignore
```

### Obrigatório
```typescript
// ✅ Tipos explícitos em funções públicas
async function buscarUsuario(id: string): Promise<Usuario | null> { ... }

// ✅ Interface para objetos de domínio, type para unions/primitivos
interface Usuario {
  id: string;
  nome: string;
  email: string;
  criadoEm: Date;
}

type StatusPedido = 'pendente' | 'pago' | 'cancelado';

// ✅ Generics em vez de any para funções reutilizáveis
async function buscarPorId<T>(tabela: string, id: string): Promise<T | null> { ... }

// ✅ Readonly em objetos que não devem ser mutados
function calcular(config: Readonly<ConfiguracaoCalculo>): number { ... }
```

### tsconfig.json mínimo obrigatório
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

---

## 6. Repository Pattern

### Estrutura obrigatória
```typescript
// src/repositories/interfaces/IUsuarioRepository.ts
export interface IUsuarioRepository {
  buscarPorId(id: string): Promise<Usuario | null>;
  buscarPorEmail(email: string): Promise<Usuario | null>;
  criar(dados: CriarUsuarioDto): Promise<Usuario>;
  atualizar(id: string, dados: AtualizarUsuarioDto): Promise<Usuario>;
  deletar(id: string): Promise<void>;
  listar(filtros: FiltrosUsuario): Promise<{ dados: Usuario[]; total: number }>;
}

// src/repositories/UsuarioRepository.ts
export class UsuarioRepository implements IUsuarioRepository {
  async buscarPorId(id: string): Promise<Usuario | null> {
    // query ao banco aqui — NUNCA lógica de negócio
    const resultado = await db.query(
      'SELECT * FROM usuarios WHERE id = $1 AND deletado_em IS NULL',
      [id]
    );
    return resultado.rows[0] ?? null;
  }
  // ...
}
```

### Regras do Repository
- Retorna `null` (não lança erro) quando recurso não é encontrado — quem decide o que fazer é o Service
- Não conhece regras de negócio
- Queries parametrizadas **sempre** (nunca concatenação de string com input do usuário)
- Um repository por entidade de domínio

---

## 7. Nomenclatura e Organização

### Convenções obrigatórias
```typescript
// Classes — PascalCase
class UsuarioService { }
class PedidoRepository { }

// Interfaces — prefixo I + PascalCase
interface IUsuarioRepository { }
interface IEmailService { }

// Funções e variáveis — camelCase descritivo
const calcularTotalComDesconto = () => { };
const usuarioEncontrado = await buscarUsuario(id);

// Constantes globais — SCREAMING_SNAKE_CASE
const TEMPO_EXPIRACAO_TOKEN = 3600;
const LIMITE_TENTATIVAS_LOGIN = 5;

// Arquivos — kebab-case
usuario.service.ts
pedido.repository.ts
auth.middleware.ts
criar-usuario.schema.ts

// Enums — PascalCase com valores SCREAMING_SNAKE_CASE
enum StatusPedido {
  PENDENTE = 'PENDENTE',
  PAGO = 'PAGO',
  CANCELADO = 'CANCELADO',
}
```

### Estrutura de pastas padrão
```
src/
  controllers/
  services/
  repositories/
    interfaces/
  middlewares/
  schemas/
  errors/
  utils/
  types/
  config/
  routes/
  app.ts
  server.ts
```

---

## 8. Async/Await e Promises

```typescript
// ❌ ERRADO — Promise.all desnecessariamente sequencial
const usuario = await buscarUsuario(id);
const pedidos = await buscarPedidos(id);
const enderecos = await buscarEnderecos(id);

// ✅ CORRETO — paralelo quando não há dependência
const [usuario, pedidos, enderecos] = await Promise.all([
  buscarUsuario(id),
  buscarPedidos(id),
  buscarEnderecos(id),
]);

// ❌ ERRADO — floating promise (não aguardada)
salvarLog(evento); // pode falhar silenciosamente

// ✅ CORRETO — aguardar ou tratar explicitamente
await salvarLog(evento);
// ou, se realmente não precisa aguardar:
salvarLog(evento).catch((err) => logger.error('Falha ao salvar log', err));

// ❌ ERRADO — misturar .then() com async/await
const resultado = await buscarDados()
  .then((dados) => processar(dados));

// ✅ CORRETO — consistência: use await
const dados = await buscarDados();
const resultado = processar(dados);
```

---

## 9. Segurança — Itens Obrigatórios

```typescript
// 1. Nunca logar dados sensíveis
logger.info('Login realizado', { userId: usuario.id }); // ✅
logger.info('Login realizado', { usuario }); // ❌ — loga senha, token, etc.

// 2. Nunca retornar senha no response
const { senha, ...usuarioPublico } = usuario;
res.json(usuarioPublico); // ✅

// 3. Rate limiting em rotas públicas
import rateLimit from 'express-rate-limit';
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
});
router.post('/auth/login', limitadorLogin, AuthController.login);

// 4. Variáveis de ambiente — nunca hardcode
const segredo = process.env.JWT_SECRET; // ✅
const segredo = 'minha-senha-123'; // ❌

// 5. Validar e sanitizar toda query que aceita input externo
// Usar queries parametrizadas — nunca concatenação
const resultado = await db.query(
  'SELECT * FROM usuarios WHERE email = $1', // ✅
  [emailDoUsuario]
);
```

---

## 10. Logging

```typescript
// Use um logger estruturado (pino ou winston) — nunca console.log em produção
import pino from 'pino';
export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

// ✅ Log com contexto suficiente para debugar em produção
logger.info({ usuarioId, pedidoId, valor }, 'Pagamento processado');
logger.error({ err, usuarioId }, 'Falha ao processar pagamento');

// ❌ Log sem contexto (inútil em produção)
console.log('pagamento processado');
console.error('erro');
```

---

## 11. Linter e Formatter (Setup obrigatório)

### ESLint + Prettier — instalar em todo projeto Node/Express

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier eslint-plugin-prettier
```

### `.eslintrc.json` padrão
```json
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "prettier"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "rules": {
    "prettier/prettier": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "no-console": "warn"
  }
}
```

### `.prettierrc` padrão
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

### Scripts no `package.json`
```json
{
  "scripts": {
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write src"
  }
}
```

---

## 12. Checklist Final — Obrigatório antes de marcar qualquer tarefa como concluída

O Claude Code DEVE verificar cada item antes de finalizar implementação.

### Arquitetura
- [ ] Controller não tem lógica de negócio nem acesso direto ao banco
- [ ] Service não importa `req`, `res` ou `next`
- [ ] Repository não tem regras de negócio
- [ ] Cada arquivo tem responsabilidade única e clara

### Funções
- [ ] Nenhuma função tem mais de 20 linhas
- [ ] Nenhuma função tem mais de 3 condicionais aninhados
- [ ] Todas as funções usam Early Return em vez de else aninhado
- [ ] Nenhuma função tem mais de 3 parâmetros (ou usa objeto de configuração)

### TypeScript
- [ ] Zero uso de `any`
- [ ] Tipos explícitos em todas as funções públicas
- [ ] `strict: true` no tsconfig
- [ ] Sem variáveis declaradas e não usadas

### Validação e Erros
- [ ] Todo `req.body` validado com Zod antes de usar
- [ ] AppError usado em vez de `throw new Error('...')`
- [ ] Nenhum `catch` vazio ou que apenas faz `console.log`
- [ ] Middleware de erro centralizado registrado no app

### Segurança
- [ ] Nenhuma senha ou dado sensível logado
- [ ] Nenhuma variável de ambiente hardcoded
- [ ] Queries parametrizadas (sem concatenação com input externo)
- [ ] Campos sensíveis removidos antes de retornar no response

### Async
- [ ] Nenhuma floating promise (toda promise aguardada ou com `.catch`)
- [ ] Operações independentes rodando em `Promise.all`
- [ ] Sem mistura de `.then()` com `async/await`

### Geral
- [ ] Nomes de arquivos em kebab-case
- [ ] Nomes de funções/variáveis descritivos (lendo o nome, entendo o que faz)
- [ ] Sem comentários que apenas repetem o que o código já diz
- [ ] ESLint rodando sem erros

---

*SDD-QA v1.0 — Vinicius Aguiar Gadelha*
