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
  expiresIn: number;
}

export interface ResumoDeRepositorio {
  nome: string;
  linguagem: string | null;
  estrelas: number;
  forks: number;
  issuesAbertas: number;
  atualizadoEm: string;
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
  atualizadoEm: string;
  commitsPorSemana: { semana: string; total: number }[];
}

export interface AnaliseDeUsuario {
  username: string;
  activityScore: number;
  topLinguagens: { linguagem: string; percentual: number }[];
  totalEstrelas: number;
  repositorioMaisEstrelado: string | null; // null quando usuário sem repos
  repositoriosAtualizadosUltimos30Dias: number;
  insights: string[];
}

export interface AnaliseDeRepositorio {
  repo: string;
  healthScore: number;
  tendenciaDeAtividade: 'crescente' | 'estavel' | 'decrescente';
  mediaDeCommitsPorSemana: number;
  razaoDeIssuesAbertas: number;
  diasDesdeUltimaAtualizacao: number;
  insights: string[];
}

export interface RespostaDeBuscaDeUsuario {
  perfil: PerfilDeUsuarioGitHub;
  analise: AnaliseDeUsuario | null;
  analysisAvailable: boolean;
  cacheadoEm: string | null;
}

export interface RespostaDeBuscaDeRepositorio {
  dados: DadosBrutosDeRepositorio;
  analise: AnaliseDeRepositorio | null;
  analysisAvailable: boolean;
  cacheadoEm: string | null;
}

export interface ItemDeHistorico {
  id: string;
  tipoDeBusca: 'usuario' | 'repositorio';
  valorBuscado: string;
  score: number | null;
  realizadaEm: string;
}

// Envelope padrão de resposta da API
export interface RespostaDaApi<T> {
  success: true;
  data: T;
}

export interface ErroDeApi {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
