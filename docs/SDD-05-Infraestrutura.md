# SDD-05 — Infraestrutura e Deploy

**Pré-requisito:** SDD-01 lido.
**Entrega:** ambiente local completo rodando via `docker compose up`, todos os serviços saudáveis, frontend acessível em `http://localhost`.

---

## 0. Spec — ambiente local (Docker Compose)

**Comportamento:**
- Um único comando `docker compose up -d --build` sobe todos os 5 serviços.
- Ordem de inicialização garantida por health checks (postgres e redis sobem primeiro).
- Frontend acessível em `http://localhost` (porta 80).
- node-service e python-service não acessíveis diretamente pelo browser — apenas via Nginx.

**Regras:**
- Arquivo `.env` na raiz do projeto, nunca commitado. Repositório contém apenas `.env.example`.
- Volumes nomeados para persistência de dados do PostgreSQL entre reinicializações.
- Todos os serviços com `restart: unless-stopped`.

**Casos de borda:**
| Situação | Resultado |
|---|---|
| `docker compose up` com `.env` ausente | Docker Compose falha com mensagem clara de variável faltando |
| postgres ainda inicializando quando node-service sobe | `depends_on` com `condition: service_healthy` impede subida antecipada |
| python-service falhando no health check | node-service não sobe (circuit breaker cuida em runtime, mas o ambiente deve subir completo) |

**Critérios de aceite:**
- ✓ `docker compose up -d --build` → todos os 5 serviços com status `healthy` em `docker compose ps`
- ✓ `GET http://localhost` → retorna o build do React (status 200, HTML)
- ✓ `GET http://localhost/api/v1` → Nginx roteia para node-service (status 200 ou 404 esperado da API)
- ✓ `GET http://localhost:3000` → connection refused (node-service não exposto diretamente)
- ✓ `docker compose down && docker compose up -d` → dados do PostgreSQL persistem (volume nomeado)

---

### 0.1 Review desta spec (checklist aplicado)

| Verificação | Resultado |
|---|---|
| Todas as permissões definidas? | ✓ Apenas porta 80 exposta externamente. Serviços internos (3000, 8000, 5432, 6379) inacessíveis do host. |
| Todos os casos de erro mapeados? | ✓ `.env` ausente, inicialização fora de ordem, health check falhando — todos cobertos com `depends_on condition: service_healthy`. |
| Decisões de negócio são do dono? | ✓ Redis sem persistência (cache perdido no restart é aceitável); apenas PostgreSQL com volume nomeado — decisão explícita da seção 3.3. |
| Critérios de aceite são verificáveis? | ✓ Todos testáveis via `curl`, `docker compose ps` e `docker compose down && up`. |
| Casos de borda esquecidos? | Migrations Prisma: fora de escopo da v1 por decisão consciente — schema inicial criado via `prisma migrate dev` uma única vez no setup. Estratégia de migração futura não coberta nesta versão. |

---

## 1. Serviços e portas

| Serviço | Imagem base | Porta interna | Porta exposta externamente |
|---|---|---|---|
| nginx | nginx:alpine | 80 | **80** (único ponto de entrada) |
| node-service | node:20-alpine (build local) | 3000 | Nenhuma |
| python-service | python:3.11-slim (build local) | 8000 | Nenhuma |
| postgres | postgres:16-alpine | 5432 | Nenhuma |
| redis | redis:7-alpine | 6379 | Nenhuma |

Rede interna: `gitanalytics-network` (bridge). Todos os serviços na mesma rede. Apenas Nginx exposto.

---

## 2. Dockerfiles

### 2.1 node-service (multi-stage)

**Stage 1 — builder:**
- Base: `node:20-alpine`
- Instala dependências (`npm ci`)
- Compila TypeScript (`npx tsc`)

**Stage 2 — runner:**
- Base: `node:20-alpine`
- Copia apenas `dist/` e `node_modules` de produção
- Usuário não-root: `node`
- Working directory: `/app`
- Comando: `node dist/server.js`
- Health check: `curl -f http://localhost:3000/health || exit 1` (intervalo 10s, timeout 5s, retries 3)

### 2.2 python-service

- Base: `python:3.11-slim`
- Instala dependências (`pip install --no-cache-dir -r requirements.txt`)
- Usuário não-root: `appuser` (criado no Dockerfile)
- Working directory: `/app`
- Comando: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Health check: `curl -f http://localhost:8000/health || exit 1` (intervalo 10s, timeout 5s, retries 3)

### 2.3 frontend (multi-stage)

**Stage 1 — builder:**
- Base: `node:20-alpine`
- Recebe `VITE_API_BASE_URL` como build arg (`ARG VITE_API_BASE_URL`)
- Executa `npm run build` → gera `/app/dist`

**Stage 2 — server:**
- Base: `nginx:alpine`
- Copia `/app/dist` do stage anterior para `/usr/share/nginx/html`
- Copia `nginx.conf` customizado
- Expõe porta 80

---

## 3. Docker Compose

### 3.1 Ordem de inicialização

```
postgres ──health check──→ node-service ──→ nginx
redis    ──health check──→ node-service
python-service ──health──→ node-service
```

`node-service` só sobe quando postgres, redis e python-service passam no health check.
`nginx` só sobe quando node-service passa no health check.

### 3.2 Health checks por serviço

| Serviço | Comando | Intervalo | Timeout | Retries |
|---|---|---|---|---|
| postgres | `pg_isready -U ${POSTGRES_USER}` | 10s | 5s | 5 |
| redis | `redis-cli ping` | 10s | 5s | 3 |
| python-service | `curl -f http://localhost:8000/health` | 10s | 5s | 3 |
| node-service | `curl -f http://localhost:3000/health` | 10s | 5s | 3 |

### 3.3 Volumes

```yaml
volumes:
  postgres_data:    # persiste dados entre reinicializações
```

Apenas o PostgreSQL usa volume nomeado. Redis não persiste (cache — dados perdidos no restart são aceitáveis).

---

## 4. Configuração do Nginx

### 4.1 Regras de roteamento

| Caminho | Destino | Observação |
|---|---|---|
| `/api/` | `http://node-service:3000` | Proxy pass — node-service já espera o prefixo `/api` |
| `/` | `/usr/share/nginx/html` | Serve build estático do React |
| Qualquer rota não encontrada | `index.html` | SPA fallback — necessário para React Router |

### 4.2 Configurações importantes

```nginx
client_max_body_size 1m;
proxy_read_timeout 30s;
proxy_connect_timeout 5s;
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# Cache de assets estáticos gerados pelo Vite (têm hash no nome)
location ~* \.(js|css|png|jpg|svg|ico|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# SPA fallback
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## 5. Variáveis de ambiente

### 5.1 Arquivo `.env.example` (na raiz do projeto)

```env
# PostgreSQL
POSTGRES_USER=gitanalytics
POSTGRES_PASSWORD=           # definir valor forte em produção
POSTGRES_DB=gitanalytics_db

# node-service
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
REDIS_URL=redis://redis:6379
JWT_SECRET=                  # string aleatória mínimo 64 caracteres
JWT_REFRESH_SECRET=          # string aleatória diferente do JWT_SECRET, mínimo 64 caracteres
GITHUB_TOKEN=                # Personal Access Token do GitHub (leitura de repos públicos)
PYTHON_SERVICE_URL=http://python-service:8000
PYTHON_SERVICE_TIMEOUT_MS=5000
NODE_ENV=production
PORT=3000

# python-service
PYTHON_PORT=8000
PYTHON_ENV=production
LOG_LEVEL=info

# frontend (passado como build arg no docker compose)
VITE_API_BASE_URL=http://localhost/api/v1
```

**Regras:**
- `JWT_SECRET` e `JWT_REFRESH_SECRET` nunca podem ser iguais.
- `GITHUB_TOKEN` deve ter escopo mínimo: apenas `public_repo` (leitura de repositórios públicos).
- Arquivo `.env` no `.gitignore`. Nunca commitado.

---

## 6. Deploy na AWS (opcional, fora de escopo da v1 local)

Documentado aqui apenas para referência futura. Não faz parte dos critérios de conclusão da v1.

| Componente | Serviço AWS | Observação |
|---|---|---|
| node-service + python-service | EC2 t3.micro | Docker Compose direto na instância |
| PostgreSQL | RDS PostgreSQL ou EC2 | RDS preferido para produção |
| Redis | Redis na EC2 | ElastiCache não incluso no free tier |
| Frontend | S3 + CloudFront | Build estático, custo próximo de zero |
| SSL/TLS | ACM + CloudFront | Certificado gratuito |

---

## 7. Comandos úteis

| Comando | Descrição |
|---|---|
| `docker compose up -d --build` | Sobe tudo em background com rebuild |
| `docker compose down` | Para e remove containers (volumes preservados) |
| `docker compose down -v` | Para, remove containers **e volumes** (apaga dados do banco) |
| `docker compose ps` | Status e health de todos os serviços |
| `docker compose logs -f node-service` | Logs em tempo real do node-service |
| `docker compose exec node-service sh` | Shell dentro do container node-service |
| `docker compose exec postgres psql -U gitanalytics gitanalytics_db` | Acessa PostgreSQL |
| `docker compose exec redis redis-cli` | Acessa Redis CLI |

---

## 8. Critérios de conclusão desta etapa

- [ ] `docker compose up -d --build` conclui sem erro.
- [ ] `docker compose ps` → todos os 5 serviços com status `healthy`.
- [ ] `GET http://localhost` → retorna HTML do React.
- [ ] `GET http://localhost/api/v1/health` → `{ "status": "ok" }` do node-service (via Nginx).
- [ ] Porta 3000 e 8000 inacessíveis diretamente do host.
- [ ] `docker compose down && docker compose up -d` → dados do PostgreSQL persistem.
- [ ] `.env` não commitado, `.env.example` presente com todas as variáveis listadas.
- [ ] Build do frontend com `VITE_API_BASE_URL` correto — verificar em DevTools que requisições vão para `/api/v1`.
