import axios, { AxiosInstance } from 'axios';
import { ServicoDeAnalise } from '../../src/servicos/ServicoDeAnalise';
import { ServicoDeHistorico } from '../../src/servicos/ServicoDeHistorico';
import { ServicoGitHub } from '../../src/servicos/ServicoGitHub';
import { IRepositorioDeCache } from '../../src/repositorios/interfaces';
import {
  ErroRepositorioNaoEncontrado,
  ErroServicoIndisponivel,
  ErroUsuarioNaoEncontrado,
} from '../../src/utilitarios/erros';

const USUARIO_ID_PADRAO = 'uuid-usuario-1';
const USERNAME_PADRAO = 'torvalds';
const OWNER_PADRAO = 'facebook';
const REPO_PADRAO = 'react';

function criarCacheMock(): jest.Mocked<IRepositorioDeCache> {
  return {
    buscar: jest.fn().mockResolvedValue(null),
    armazenar: jest.fn().mockResolvedValue(undefined),
    deletar: jest.fn().mockResolvedValue(undefined),
  };
}

function criarServicoDeAnaliseMock(): jest.Mocked<ServicoDeAnalise> {
  return {
    analisarUsuario: jest.fn(),
    analisarRepositorio: jest.fn(),
  } as unknown as jest.Mocked<ServicoDeAnalise>;
}

function criarServicoDeHistoricoMock(): jest.Mocked<ServicoDeHistorico> {
  return {
    registrar: jest.fn().mockResolvedValue({}),
    listar: jest.fn(),
    remover: jest.fn(),
  } as unknown as jest.Mocked<ServicoDeHistorico>;
}

function criarClienteHttpMock(): jest.Mocked<AxiosInstance> {
  return {
    get: jest.fn(),
    post: jest.fn(),
  } as unknown as jest.Mocked<AxiosInstance>;
}

const perfilGitHubRaw = { login: USERNAME_PADRAO, public_repos: 10, followers: 200000 };
const reposGitHubRaw = [
  {
    name: 'linux',
    language: 'C',
    stargazers_count: 170000,
    forks_count: 50000,
    open_issues_count: 400,
    updated_at: '2024-01-01T00:00:00Z',
  },
];
const analiseDeUsuarioPadrao = {
  username: USERNAME_PADRAO,
  activityScore: 90,
  topLinguagens: [{ linguagem: 'C', percentual: 80 }],
  totalEstrelas: 170000,
  repositorioMaisEstrelado: 'linux',
  repositoriosAtualizadosUltimos30Dias: 3,
  insights: [],
};

describe('ServicoGitHub', () => {
  let servico: ServicoGitHub;
  let cacheMock: jest.Mocked<IRepositorioDeCache>;
  let analiseMock: jest.Mocked<ServicoDeAnalise>;
  let historicoMock: jest.Mocked<ServicoDeHistorico>;
  let clienteMock: jest.Mocked<AxiosInstance>;

  beforeEach(() => {
    cacheMock = criarCacheMock();
    analiseMock = criarServicoDeAnaliseMock();
    historicoMock = criarServicoDeHistoricoMock();
    clienteMock = criarClienteHttpMock();
    servico = new ServicoGitHub(cacheMock, analiseMock, historicoMock, clienteMock);
  });

  describe('buscarAnaliseDeUsuario', () => {
    it('retorna dado do cache quando há cache HIT (sem chamar GitHub API)', async () => {
      const dadosCacheados = {
        perfil: { username: USERNAME_PADRAO, repositoriosPublicos: 10, seguidores: 200000, repositorios: [] },
        analise: analiseDeUsuarioPadrao,
        analysisAvailable: true,
        cacheadoEm: '2024-01-01T00:00:00.000Z',
      };
      cacheMock.buscar.mockResolvedValue(dadosCacheados);

      const resultado = await servico.buscarAnaliseDeUsuario(USUARIO_ID_PADRAO, USERNAME_PADRAO);

      expect(resultado).toEqual(dadosCacheados);
      expect(clienteMock.get).not.toHaveBeenCalled();
    });

    it('busca no GitHub e retorna resultado com analysisAvailable: true quando cache MISS', async () => {
      cacheMock.buscar.mockResolvedValue(null);
      clienteMock.get
        .mockResolvedValueOnce({ data: perfilGitHubRaw })
        .mockResolvedValueOnce({ data: reposGitHubRaw });
      analiseMock.analisarUsuario.mockResolvedValue(analiseDeUsuarioPadrao);

      const resultado = await servico.buscarAnaliseDeUsuario(USUARIO_ID_PADRAO, USERNAME_PADRAO);

      expect(resultado.analysisAvailable).toBe(true);
      expect(resultado.analise).toEqual(analiseDeUsuarioPadrao);
      expect(resultado.cacheadoEm).toBeNull();
      expect(clienteMock.get).toHaveBeenCalledTimes(2);
    });

    it('armazena resultado no cache após busca bem-sucedida', async () => {
      clienteMock.get
        .mockResolvedValueOnce({ data: perfilGitHubRaw })
        .mockResolvedValueOnce({ data: reposGitHubRaw });
      analiseMock.analisarUsuario.mockResolvedValue(analiseDeUsuarioPadrao);

      await servico.buscarAnaliseDeUsuario(USUARIO_ID_PADRAO, USERNAME_PADRAO);

      expect(cacheMock.armazenar).toHaveBeenCalledTimes(1);
      const [chave, valorArmazenado] = cacheMock.armazenar.mock.calls[0];
      expect(chave).toBe(`github:user:${USERNAME_PADRAO}`);
      expect((valorArmazenado as { cacheadoEm: string }).cacheadoEm).not.toBeNull();
    });

    it('retorna analysisAvailable: false quando python-service falha (Guard Non-Critical)', async () => {
      clienteMock.get
        .mockResolvedValueOnce({ data: perfilGitHubRaw })
        .mockResolvedValueOnce({ data: reposGitHubRaw });
      analiseMock.analisarUsuario.mockRejectedValue(new Error('Connection timeout'));

      const resultado = await servico.buscarAnaliseDeUsuario(USUARIO_ID_PADRAO, USERNAME_PADRAO);

      expect(resultado.analysisAvailable).toBe(false);
      expect(resultado.analise).toBeNull();
    });

    it('registra no histórico com score null quando analysisAvailable: false', async () => {
      clienteMock.get
        .mockResolvedValueOnce({ data: perfilGitHubRaw })
        .mockResolvedValueOnce({ data: reposGitHubRaw });
      analiseMock.analisarUsuario.mockRejectedValue(new Error('timeout'));

      await servico.buscarAnaliseDeUsuario(USUARIO_ID_PADRAO, USERNAME_PADRAO);

      expect(historicoMock.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ score: null, tipoDeBusca: 'usuario' }),
      );
    });

    it('lança ErroUsuarioNaoEncontrado quando GitHub retorna 404', async () => {
      const erro404 = new axios.AxiosError('Not Found');
      (erro404 as { response?: unknown }).response = { status: 404 };
      clienteMock.get.mockRejectedValue(erro404);

      await expect(
        servico.buscarAnaliseDeUsuario(USUARIO_ID_PADRAO, USERNAME_PADRAO),
      ).rejects.toBeInstanceOf(ErroUsuarioNaoEncontrado);
    });

    it('lança ErroServicoIndisponivel quando GitHub retorna 403 (rate limit)', async () => {
      const erro403 = new axios.AxiosError('Forbidden');
      (erro403 as { response?: unknown }).response = { status: 403 };
      clienteMock.get.mockRejectedValue(erro403);

      await expect(
        servico.buscarAnaliseDeUsuario(USUARIO_ID_PADRAO, USERNAME_PADRAO),
      ).rejects.toBeInstanceOf(ErroServicoIndisponivel);
    });

    it('lança ErroServicoIndisponivel quando GitHub retorna 429 (rate limit)', async () => {
      const erro429 = new axios.AxiosError('Too Many Requests');
      (erro429 as { response?: unknown }).response = { status: 429 };
      clienteMock.get.mockRejectedValue(erro429);

      await expect(
        servico.buscarAnaliseDeUsuario(USUARIO_ID_PADRAO, USERNAME_PADRAO),
      ).rejects.toBeInstanceOf(ErroServicoIndisponivel);
    });

    it('continua a resposta mesmo quando falha ao registrar no histórico (Guard Non-Critical)', async () => {
      clienteMock.get
        .mockResolvedValueOnce({ data: perfilGitHubRaw })
        .mockResolvedValueOnce({ data: reposGitHubRaw });
      analiseMock.analisarUsuario.mockResolvedValue(analiseDeUsuarioPadrao);
      historicoMock.registrar.mockRejectedValue(new Error('Database error'));

      const resultado = await servico.buscarAnaliseDeUsuario(USUARIO_ID_PADRAO, USERNAME_PADRAO);

      expect(resultado.analysisAvailable).toBe(true);
    });
  });

  describe('buscarAnaliseDeRepositorio', () => {
    const repoDetalheRaw = {
      name: REPO_PADRAO,
      stargazers_count: 220000,
      forks_count: 45000,
      open_issues_count: 800,
      language: 'JavaScript',
      updated_at: '2024-01-01T00:00:00Z',
    };
    const commitActivityRaw = [{ week: 1704067200, total: 50 }];
    const analiseDeRepositorioPadrao = {
      repo: REPO_PADRAO,
      healthScore: 88,
      tendenciaDeAtividade: 'crescente' as const,
      mediaDeCommitsPorSemana: 45,
      razaoDeIssuesAbertas: 0.004,
      diasDesdeUltimaAtualizacao: 2,
      insights: [],
    };

    it('retorna dado do cache quando há cache HIT', async () => {
      const dadosCacheados = {
        dados: { owner: OWNER_PADRAO, repo: REPO_PADRAO, estrelas: 220000, forks: 45000, issuesAbertas: 800, linguagem: 'JavaScript', atualizadoEm: '2024-01-01T00:00:00Z', commitsPorSemana: [] },
        analise: analiseDeRepositorioPadrao,
        analysisAvailable: true,
        cacheadoEm: '2024-01-01T00:00:00.000Z',
      };
      cacheMock.buscar.mockResolvedValue(dadosCacheados);

      const resultado = await servico.buscarAnaliseDeRepositorio(USUARIO_ID_PADRAO, OWNER_PADRAO, REPO_PADRAO);

      expect(resultado).toEqual(dadosCacheados);
      expect(clienteMock.get).not.toHaveBeenCalled();
    });

    it('busca no GitHub e retorna resultado com analysisAvailable: true quando cache MISS', async () => {
      clienteMock.get
        .mockResolvedValueOnce({ data: repoDetalheRaw })
        .mockResolvedValueOnce({ data: commitActivityRaw });
      analiseMock.analisarRepositorio.mockResolvedValue(analiseDeRepositorioPadrao);

      const resultado = await servico.buscarAnaliseDeRepositorio(USUARIO_ID_PADRAO, OWNER_PADRAO, REPO_PADRAO);

      expect(resultado.analysisAvailable).toBe(true);
      expect(resultado.analise).toEqual(analiseDeRepositorioPadrao);
      expect(resultado.cacheadoEm).toBeNull();
    });

    it('lança ErroRepositorioNaoEncontrado quando GitHub retorna 404', async () => {
      const erro404 = new axios.AxiosError('Not Found');
      (erro404 as { response?: unknown }).response = { status: 404 };
      clienteMock.get.mockRejectedValue(erro404);

      await expect(
        servico.buscarAnaliseDeRepositorio(USUARIO_ID_PADRAO, OWNER_PADRAO, REPO_PADRAO),
      ).rejects.toBeInstanceOf(ErroRepositorioNaoEncontrado);
    });

    it('usa chave de cache correta para repositório', async () => {
      clienteMock.get
        .mockResolvedValueOnce({ data: repoDetalheRaw })
        .mockResolvedValueOnce({ data: commitActivityRaw });
      analiseMock.analisarRepositorio.mockResolvedValue(analiseDeRepositorioPadrao);

      await servico.buscarAnaliseDeRepositorio(USUARIO_ID_PADRAO, OWNER_PADRAO, REPO_PADRAO);

      expect(cacheMock.buscar).toHaveBeenCalledWith(`github:repo:${OWNER_PADRAO}:${REPO_PADRAO}`);
      expect(cacheMock.armazenar).toHaveBeenCalledWith(
        `github:repo:${OWNER_PADRAO}:${REPO_PADRAO}`,
        expect.anything(),
        expect.any(Number),
      );
    });
  });
});
