// SDD-04, seção 7 — constantes do frontend

// Cache React Query (spec 0.2 — Regras)
export const STALE_TIME_BUSCA_GITHUB_EM_MS = 5 * 60 * 1000; // 5 minutos

// Auth (SDD-06, seção 0.3)
export const CHAVE_TOKEN_LOCAL_STORAGE = 'ga_token';
export const CHAVE_REFRESH_TOKEN_LOCAL_STORAGE = 'ga_refresh_token';
export const CHAVE_USUARIO_LOCAL_STORAGE = 'ga_usuario';

// Histórico (spec 0.3)
export const MENSAGEM_HISTORICO_VAZIO = 'Nenhuma busca realizada ainda.';

// URL base da API (SDD-04, seção 7)
export const URL_BASE_DA_API: string =
  (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? 'http://localhost/api/v1';

// Motivo de sessão expirada na query string
export const MOTIVO_SESSAO_EXPIRADA = 'sessao_expirada';

// Número mínimo de barras para modo repositório
export const BARRAS_PARA_MODO_REPOSITORIO = 1;

// Score thresholds para coloração (SDD-04, seção 6)
export const SCORE_LIMIAR_BAIXO = 40;
export const SCORE_LIMIAR_MEDIO = 70;
