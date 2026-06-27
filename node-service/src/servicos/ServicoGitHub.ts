import axios, { AxiosInstance } from 'axios';
import logger from '../config/logger';
import { IRepositorioDeCache } from '../repositorios/interfaces';
import {
  DadosBrutosDeRepositorio,
  PerfilDeUsuarioGitHub,
  RespostaDeBuscaDeRepositorio,
  RespostaDeBuscaDeUsuario,
  ResumoDeRepositorio,
} from '../tipos';
import {
  REPOS_POR_PAGINA_GITHUB,
  TTL_CACHE_GITHUB_EM_SEGUNDOS,
} from '../utilitarios/constantes';
import {
  ErroRepositorioNaoEncontrado,
  ErroServicoIndisponivel,
  ErroUsuarioNaoEncontrado,
} from '../utilitarios/erros';
import { ServicoDeAnalise } from './ServicoDeAnalise';
import { DadosParaRegistrarHistorico, ServicoDeHistorico } from './ServicoDeHistorico';

// Tipos internos que espelham respostas da API do GitHub (não exportados)
interface RespostaDePerfilGitHub {
  login: string;
  public_repos: number;
  followers: number;
}

interface RespostaDeRepositorioGitHub {
  name: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
}

interface RespostaDeCommitActivityGitHub {
  week: number;
  total: number;
}

interface RespostaDeDetalhesDeRepositorioGitHub {
  name: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  updated_at: string;
}

export class ServicoGitHub {
  constructor(
    private readonly cache: IRepositorioDeCache,
    private readonly servicoDeAnalise: ServicoDeAnalise,
    private readonly servicoDeHistorico: ServicoDeHistorico,
    private readonly clienteHttp: AxiosInstance,
  ) {}

  async buscarAnaliseDeUsuario(
    usuarioId: string,
    username: string,
  ): Promise<RespostaDeBuscaDeUsuario> {
    const chaveDeCache = `github:user:${username}`;
    const dadosCacheados = await this.cache.buscar<RespostaDeBuscaDeUsuario>(chaveDeCache);
    if (dadosCacheados) return dadosCacheados;

    const [perfilRaw, reposRaw] = await this.buscarDadosDeUsuarioNoGitHub(username);
    const perfil = this.montarPerfilDeUsuario(perfilRaw, reposRaw);
    const { analise, analysisAvailable } = await this.obterAnaliseDeUsuario(perfil);
    const score = analise?.activityScore ?? null;

    const resultado: RespostaDeBuscaDeUsuario = { perfil, analise, analysisAvailable, cacheadoEm: null };
    await this.persistirResultado(chaveDeCache, resultado, {
      usuarioId,
      tipoDeBusca: 'usuario',
      valorBuscado: username,
      score,
    });
    return resultado;
  }

  async buscarAnaliseDeRepositorio(
    usuarioId: string,
    owner: string,
    repo: string,
  ): Promise<RespostaDeBuscaDeRepositorio> {
    const chaveDeCache = `github:repo:${owner}:${repo}`;
    const dadosCacheados = await this.cache.buscar<RespostaDeBuscaDeRepositorio>(chaveDeCache);
    if (dadosCacheados) return dadosCacheados;

    const dadosBrutos = await this.buscarDadosDeRepositorioNoGitHub(owner, repo);
    const { analise, analysisAvailable } = await this.obterAnaliseDeRepositorio(dadosBrutos);
    const score = analise?.healthScore ?? null;

    const resultado: RespostaDeBuscaDeRepositorio = { dados: dadosBrutos, analise, analysisAvailable, cacheadoEm: null };
    await this.persistirResultado(chaveDeCache, resultado, {
      usuarioId,
      tipoDeBusca: 'repositorio',
      valorBuscado: `${owner}/${repo}`,
      score,
    });
    return resultado;
  }

  private montarPerfilDeUsuario(
    perfilRaw: RespostaDePerfilGitHub,
    reposRaw: RespostaDeRepositorioGitHub[],
  ): PerfilDeUsuarioGitHub {
    const repositorios: ResumoDeRepositorio[] = reposRaw.map((r) => ({
      nome: r.name,
      linguagem: r.language,
      estrelas: r.stargazers_count,
      forks: r.forks_count,
      issuesAbertas: r.open_issues_count,
      atualizadoEm: r.updated_at,
    }));
    return {
      username: perfilRaw.login,
      repositoriosPublicos: perfilRaw.public_repos,
      seguidores: perfilRaw.followers,
      repositorios,
    };
  }

  // Persiste cache e histórico em paralelo — ambas operações têm tratamento de erro interno — SDD-07
  private async persistirResultado(
    chaveDeCache: string,
    resultado: RespostaDeBuscaDeUsuario | RespostaDeBuscaDeRepositorio,
    historico: DadosParaRegistrarHistorico,
  ): Promise<void> {
    await Promise.all([
      this.cache.armazenar(
        chaveDeCache,
        { ...resultado, cacheadoEm: new Date().toISOString() },
        TTL_CACHE_GITHUB_EM_SEGUNDOS,
      ),
      this.registrarNoHistorico(historico),
    ]);
  }

  private async buscarDadosDeUsuarioNoGitHub(
    username: string,
  ): Promise<[RespostaDePerfilGitHub, RespostaDeRepositorioGitHub[]]> {
    try {
      const [respostaPerfil, respostaRepos] = await Promise.all([
        this.clienteHttp.get<RespostaDePerfilGitHub>(`/users/${username}`),
        this.clienteHttp.get<RespostaDeRepositorioGitHub[]>(
          `/users/${username}/repos?per_page=${REPOS_POR_PAGINA_GITHUB}`,
        ),
      ]);
      return [respostaPerfil.data, respostaRepos.data];
    } catch (erro) {
      return this.tratarErroDeGitHub(erro, 'usuario');
    }
  }

  private async buscarDadosDeRepositorioNoGitHub(
    owner: string,
    repo: string,
  ): Promise<DadosBrutosDeRepositorio> {
    const respostaRepo = await this.buscarDetalhesDeRepositorioNoGitHub(owner, repo);
    const commitsPorSemana = await this.buscarCommitsPorSemana(owner, repo);
    return {
      owner,
      repo,
      estrelas: respostaRepo.stargazers_count,
      forks: respostaRepo.forks_count,
      issuesAbertas: respostaRepo.open_issues_count,
      linguagem: respostaRepo.language,
      atualizadoEm: respostaRepo.updated_at,
      commitsPorSemana,
    };
  }

  private async buscarDetalhesDeRepositorioNoGitHub(
    owner: string,
    repo: string,
  ): Promise<RespostaDeDetalhesDeRepositorioGitHub> {
    try {
      const res = await this.clienteHttp.get<RespostaDeDetalhesDeRepositorioGitHub>(
        `/repos/${owner}/${repo}`,
      );
      return res.data;
    } catch (erro) {
      return this.tratarErroDeGitHub(erro, 'repositorio');
    }
  }

  private async buscarCommitsPorSemana(
    owner: string,
    repo: string,
  ): Promise<{ semana: string; total: number }[]> {
    try {
      const res = await this.clienteHttp.get<RespostaDeCommitActivityGitHub[] | null>(
        `/repos/${owner}/${repo}/stats/commit_activity`,
      );
      return this.extrairCommitsPorSemana(res.data);
    } catch {
      // Guard Silent: falha em stats não impede resposta — SDD-07, seção 1
      return [];
    }
  }

  private extrairCommitsPorSemana(
    dados: RespostaDeCommitActivityGitHub[] | null,
  ): { semana: string; total: number }[] {
    if (!dados || !Array.isArray(dados)) return [];
    return dados.map((entrada) => ({
      semana: new Date(entrada.week * 1000).toISOString(),
      total: entrada.total,
    }));
  }

  private tratarErroDeGitHub(erro: unknown, tipo: 'usuario' | 'repositorio'): never {
    if (axios.isAxiosError(erro)) {
      const status = erro.response?.status;
      if (status === 404) {
        if (tipo === 'usuario') throw new ErroUsuarioNaoEncontrado();
        throw new ErroRepositorioNaoEncontrado();
      }
      if (status === 403 || status === 429) {
        throw new ErroServicoIndisponivel();
      }
    }
    throw erro;
  }

  private async obterAnaliseDeUsuario(
    perfil: PerfilDeUsuarioGitHub,
  ): Promise<{ analise: RespostaDeBuscaDeUsuario['analise']; analysisAvailable: boolean }> {
    try {
      const analise = await this.servicoDeAnalise.analisarUsuario(perfil);
      return { analise, analysisAvailable: true };
    } catch (erro) {
      // Guard Non-Critical — SDD-07, seção 1
      logger.warn({
        message: 'python-service indisponível: análise de usuário não realizada',
        erro: String(erro),
      });
      return { analise: null, analysisAvailable: false };
    }
  }

  private async obterAnaliseDeRepositorio(
    dados: DadosBrutosDeRepositorio,
  ): Promise<{ analise: RespostaDeBuscaDeRepositorio['analise']; analysisAvailable: boolean }> {
    try {
      const analise = await this.servicoDeAnalise.analisarRepositorio(dados);
      return { analise, analysisAvailable: true };
    } catch (erro) {
      // Guard Non-Critical — SDD-07, seção 1
      logger.warn({
        message: 'python-service indisponível: análise de repositório não realizada',
        erro: String(erro),
      });
      return { analise: null, analysisAvailable: false };
    }
  }

  private async registrarNoHistorico(dados: DadosParaRegistrarHistorico): Promise<void> {
    try {
      await this.servicoDeHistorico.registrar(dados);
    } catch (erro) {
      // Guard Non-Critical — SDD-07, seção 1
      logger.warn({ message: 'Falha ao registrar no histórico', erro: String(erro) });
    }
  }
}
