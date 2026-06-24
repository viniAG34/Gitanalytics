// Tipos de domínio compartilhados — SDD-01, seção 6

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  criadoEm: string; // ISO 8601
}

export interface TokensDeAutenticacao {
  token: string;
  refreshToken: string;
  expiresIn: number; // segundos até expiração do token principal
}

export interface ResumoDeRepositorio {
  nome: string;
  linguagem: string | null;
  estrelas: number;
  forks: number;
  issuesAbertas: number;
  atualizadoEm: string; // ISO 8601
}

export interface PerfilDeUsuarioGitHub {
  username: string;
  repositoriosPublicos: number;
  seguidores: number;
  repositorios: ResumoDeRepositorio[];
}

export interface DadosBrutosDeRepositorio {
  owner: string;
  repo: string;
  estrelas: number;
  forks: number;
  issuesAbertas: number;
  linguagem: string | null;
  atualizadoEm: string; // ISO 8601
  commitsPorSemana: { semana: string; total: number }[];
}

export interface AnaliseDeUsuario {
  username: string;
  activityScore: number; // 0–100
  topLinguagens: { linguagem: string; percentual: number }[];
  totalEstrelas: number;
  repositorioMaisEstrelado: string | null;
  repositoriosAtualizadosUltimos30Dias: number;
  insights: string[];
}

export interface AnaliseDeRepositorio {
  repo: string;
  healthScore: number; // 0–100
  tendenciaDeAtividade: 'crescente' | 'estavel' | 'decrescente';
  mediaDeCommitsPorSemana: number;
  razaoDeIssuesAbertas: number; // issuesAbertas / estrelas
  diasDesdeUltimaAtualizacao: number;
  insights: string[];
}

export interface RespostaDeBuscaDeUsuario {
  perfil: PerfilDeUsuarioGitHub;
  analise: AnaliseDeUsuario | null; // null quando analysisAvailable = false
  analysisAvailable: boolean;
  cacheadoEm: string | null; // ISO 8601, null se dado veio direto da API
}

export interface RespostaDeBuscaDeRepositorio {
  dados: DadosBrutosDeRepositorio;
  analise: AnaliseDeRepositorio | null;
  analysisAvailable: boolean;
  cacheadoEm: string | null;
}

export interface ItemDeHistorico {
  id: string; // UUID
  tipoDeBusca: 'usuario' | 'repositorio';
  valorBuscado: string; // username ou owner/repo
  score: number | null; // activityScore ou healthScore; null se analysis não disponível
  realizadaEm: string; // ISO 8601
}

// Payload do JWT — SDD-06, seção 0
export interface PayloadDoToken {
  sub: string; // usuario.id
  email: string;
  iat: number;
  exp: number;
}

// Dados do usuário disponíveis após autenticação (populados pelo middleware autenticarJWT)
export interface DadosDoUsuarioAutenticado {
  id: string;
  email: string;
}

// Extensão do Express.Request para incluir dados do usuário autenticado
declare global {
  namespace Express {
    interface Request {
      usuarioAutenticado?: DadosDoUsuarioAutenticado;
    }
  }
}
