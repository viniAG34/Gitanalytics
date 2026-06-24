// SDD-05, seção 1 — porta padrão interna do node-service
export const PORTA_PADRAO_NODE_SERVICE = 3000;

// SDD-07, seção 2 — HTTP status codes usados nas respostas
export const HTTP_STATUS_OK = 200;
export const HTTP_STATUS_CREATED = 201;
export const HTTP_STATUS_BAD_REQUEST = 400;
export const HTTP_STATUS_UNAUTHORIZED = 401;
export const HTTP_STATUS_FORBIDDEN = 403;
export const HTTP_STATUS_NOT_FOUND = 404;
export const HTTP_STATUS_INTERNAL_ERROR = 500;
export const HTTP_STATUS_SERVICE_UNAVAILABLE = 503;

// SDD-06, seção 2 — duração dos tokens JWT
export const DURACAO_TOKEN_JWT = '24h';
export const DURACAO_REFRESH_TOKEN = '7d';

// SDD-02, spec 0.2 — expiresIn em segundos (24h = 86400s)
export const EXPIRES_IN_SEGUNDOS = 86400;

// SDD-06, seção 0.2 — custo do bcrypt
export const CUSTO_BCRYPT = 12;

// SDD-06, seção 2 / SDD-07, seção 2 — códigos de erro de autenticação
export const CODIGO_ERRO_TOKEN_AUSENTE = 'MISSING_TOKEN';
export const CODIGO_ERRO_TOKEN_INVALIDO = 'INVALID_TOKEN';
export const CODIGO_ERRO_TOKEN_EXPIRADO = 'TOKEN_EXPIRED';
export const CODIGO_ERRO_CREDENCIAIS_INVALIDAS = 'INVALID_CREDENTIALS';

// SDD-07, seção 2 — códigos de erro de recursos
export const CODIGO_ERRO_USUARIO_NAO_ENCONTRADO = 'USER_NOT_FOUND';
export const CODIGO_ERRO_REPOSITORIO_NAO_ENCONTRADO = 'REPO_NOT_FOUND';
export const CODIGO_ERRO_ITEM_NAO_ENCONTRADO = 'NOT_FOUND';
export const CODIGO_ERRO_ROTA_NAO_ENCONTRADA = 'ROUTE_NOT_FOUND';
export const CODIGO_ERRO_VALIDACAO = 'VALIDATION_ERROR';

// SDD-07, seção 2 — códigos de erro de serviços externos
export const CODIGO_ERRO_SERVICO_INDISPONIVEL = 'SERVICE_UNAVAILABLE';
export const CODIGO_ERRO_INTERNO = 'INTERNAL_ERROR';

// SDD-02, seção 4 — timeout do python-service em milissegundos
export const TIMEOUT_PYTHON_SERVICE_EM_MS = 5000;

// SDD-02, seção 4 — TTL do cache Redis em segundos (10 minutos)
export const TTL_CACHE_GITHUB_EM_SEGUNDOS = 600;

// SDD-02, spec 0.6 — máximo de itens no histórico de buscas
export const LIMITE_ITENS_HISTORICO = 20;

// SDD-02, spec 0.4 — repositórios por página na API do GitHub
export const REPOS_POR_PAGINA_GITHUB = 100;

// SDD-02, seção 5 — URL base da API do GitHub
export const URL_BASE_GITHUB_API = 'https://api.github.com';

// SDD-07, seção 2 — código de erro para parâmetro de rota inválido
export const CODIGO_ERRO_PARAMETRO_INVALIDO = 'INVALID_PARAMETER';
