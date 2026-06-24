import { AxiosInstance } from 'axios';
import {
  AnaliseDeRepositorio,
  AnaliseDeUsuario,
  DadosBrutosDeRepositorio,
  PerfilDeUsuarioGitHub,
} from '../tipos';
import { TIMEOUT_PYTHON_SERVICE_EM_MS } from '../utilitarios/constantes';

// Tipos internos que espelham o contrato do python-service (snake_case) — SDD-03
interface RequisicaoDeAnaliseDeUsuario {
  username: string;
  repositorios_publicos: number;
  seguidores: number;
  repositorios: {
    nome: string;
    linguagem: string | null;
    estrelas: number;
    forks: number;
    issues_abertas: number;
    atualizado_em: string;
  }[];
}

interface RequisicaoDeAnaliseDeRepositorio {
  owner: string;
  repo: string;
  estrelas: number;
  forks: number;
  issues_abertas: number;
  linguagem: string | null;
  atualizado_em: string;
  commits_por_semana: { semana: string; total: number }[];
}

interface RespostaDeAnaliseDeUsuarioPython {
  username: string;
  activity_score: number;
  top_linguagens: { linguagem: string; percentual: number }[];
  total_estrelas: number;
  repositorio_mais_estrelado: string | null;
  repos_atualizados_ultimos_30_dias: number;
  insights: string[];
}

interface RespostaDeAnaliseDeRepositorioPython {
  repo: string;
  health_score: number;
  tendencia_de_atividade: 'crescente' | 'estavel' | 'decrescente';
  media_de_commits_por_semana: number;
  razao_de_issues_abertas: number;
  dias_desde_ultima_atualizacao: number;
  insights: string[];
}

export class ServicoDeAnalise {
  constructor(private readonly clienteHttp: AxiosInstance) {}

  async analisarUsuario(perfil: PerfilDeUsuarioGitHub): Promise<AnaliseDeUsuario> {
    const corpo: RequisicaoDeAnaliseDeUsuario = {
      username: perfil.username,
      repositorios_publicos: perfil.repositoriosPublicos,
      seguidores: perfil.seguidores,
      repositorios: perfil.repositorios.map((r) => ({
        nome: r.nome,
        linguagem: r.linguagem,
        estrelas: r.estrelas,
        forks: r.forks,
        issues_abertas: r.issuesAbertas,
        atualizado_em: r.atualizadoEm,
      })),
    };

    const resposta = await this.clienteHttp.post<RespostaDeAnaliseDeUsuarioPython>(
      '/analyze/user',
      corpo,
      { timeout: TIMEOUT_PYTHON_SERVICE_EM_MS },
    );

    return this.mapearAnaliseDeUsuario(resposta.data);
  }

  async analisarRepositorio(dados: DadosBrutosDeRepositorio): Promise<AnaliseDeRepositorio> {
    const corpo: RequisicaoDeAnaliseDeRepositorio = {
      owner: dados.owner,
      repo: dados.repo,
      estrelas: dados.estrelas,
      forks: dados.forks,
      issues_abertas: dados.issuesAbertas,
      linguagem: dados.linguagem,
      atualizado_em: dados.atualizadoEm,
      commits_por_semana: dados.commitsPorSemana,
    };

    const resposta = await this.clienteHttp.post<RespostaDeAnaliseDeRepositorioPython>(
      '/analyze/repo',
      corpo,
      { timeout: TIMEOUT_PYTHON_SERVICE_EM_MS },
    );

    return this.mapearAnaliseDeRepositorio(resposta.data);
  }

  private mapearAnaliseDeUsuario(
    dados: RespostaDeAnaliseDeUsuarioPython,
  ): AnaliseDeUsuario {
    return {
      username: dados.username,
      activityScore: dados.activity_score,
      topLinguagens: dados.top_linguagens,
      totalEstrelas: dados.total_estrelas,
      repositorioMaisEstrelado: dados.repositorio_mais_estrelado,
      repositoriosAtualizadosUltimos30Dias: dados.repos_atualizados_ultimos_30_dias,
      insights: dados.insights,
    };
  }

  private mapearAnaliseDeRepositorio(
    dados: RespostaDeAnaliseDeRepositorioPython,
  ): AnaliseDeRepositorio {
    return {
      repo: dados.repo,
      healthScore: dados.health_score,
      tendenciaDeAtividade: dados.tendencia_de_atividade,
      mediaDeCommitsPorSemana: dados.media_de_commits_por_semana,
      razaoDeIssuesAbertas: dados.razao_de_issues_abertas,
      diasDesdeUltimaAtualizacao: dados.dias_desde_ultima_atualizacao,
      insights: dados.insights,
    };
  }
}
