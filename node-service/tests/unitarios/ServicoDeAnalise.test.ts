import axios, { AxiosInstance } from 'axios';
import { ServicoDeAnalise } from '../../src/servicos/ServicoDeAnalise';
import { DadosBrutosDeRepositorio, PerfilDeUsuarioGitHub } from '../../src/tipos';

function criarClienteHttpMock(): jest.Mocked<AxiosInstance> {
  return {
    post: jest.fn(),
    get: jest.fn(),
  } as unknown as jest.Mocked<AxiosInstance>;
}

const perfilDeUsuarioPadrao: PerfilDeUsuarioGitHub = {
  username: 'torvalds',
  repositoriosPublicos: 10,
  seguidores: 200000,
  repositorios: [
    {
      nome: 'linux',
      linguagem: 'C',
      estrelas: 170000,
      forks: 50000,
      issuesAbertas: 400,
      atualizadoEm: '2024-01-01T00:00:00Z',
    },
  ],
};

const dadosDeRepositorioPadrao: DadosBrutosDeRepositorio = {
  owner: 'facebook',
  repo: 'react',
  estrelas: 220000,
  forks: 45000,
  issuesAbertas: 800,
  linguagem: 'JavaScript',
  atualizadoEm: '2024-01-01T00:00:00Z',
  commitsPorSemana: [{ semana: '2024-01-01T00:00:00Z', total: 50 }],
};

describe('ServicoDeAnalise', () => {
  let servico: ServicoDeAnalise;
  let clienteMock: jest.Mocked<AxiosInstance>;

  beforeEach(() => {
    clienteMock = criarClienteHttpMock();
    servico = new ServicoDeAnalise(clienteMock);
  });

  describe('analisarUsuario', () => {
    it('retorna AnaliseDeUsuario mapeada do snake_case para camelCase', async () => {
      clienteMock.post.mockResolvedValue({
        data: {
          username: 'torvalds',
          activity_score: 92.5,
          top_linguagens: [{ linguagem: 'C', percentual: 80 }],
          total_estrelas: 170000,
          repositorio_mais_estrelado: 'linux',
          repos_atualizados_ultimos_30_dias: 5,
          insights: ['Alto engajamento da comunidade.'],
        },
      });

      const resultado = await servico.analisarUsuario(perfilDeUsuarioPadrao);

      expect(resultado.activityScore).toBe(92.5);
      expect(resultado.topLinguagens).toEqual([{ linguagem: 'C', percentual: 80 }]);
      expect(resultado.totalEstrelas).toBe(170000);
      expect(resultado.repositorioMaisEstrelado).toBe('linux');
      expect(resultado.repositoriosAtualizadosUltimos30Dias).toBe(5);
      expect(resultado.insights).toHaveLength(1);
    });

    it('mapeia repositorio_mais_estrelado null corretamente', async () => {
      clienteMock.post.mockResolvedValue({
        data: {
          username: 'vazio',
          activity_score: 0,
          top_linguagens: [],
          total_estrelas: 0,
          repositorio_mais_estrelado: null,
          repos_atualizados_ultimos_30_dias: 0,
          insights: [],
        },
      });

      const resultado = await servico.analisarUsuario({
        ...perfilDeUsuarioPadrao,
        repositorios: [],
      });

      expect(resultado.repositorioMaisEstrelado).toBeNull();
    });

    it('envia payload no formato snake_case esperado pelo python-service', async () => {
      clienteMock.post.mockResolvedValue({
        data: {
          username: 'torvalds',
          activity_score: 80,
          top_linguagens: [],
          total_estrelas: 0,
          repositorio_mais_estrelado: null,
          repos_atualizados_ultimos_30_dias: 0,
          insights: [],
        },
      });

      await servico.analisarUsuario(perfilDeUsuarioPadrao);

      const corpoDaChamada = clienteMock.post.mock.calls[0][1] as Record<string, unknown>;
      expect(corpoDaChamada).toHaveProperty('repositorios_publicos', 10);
      expect(corpoDaChamada).toHaveProperty('seguidores', 200000);
      const repos = corpoDaChamada['repositorios'] as Record<string, unknown>[];
      expect(repos[0]).toHaveProperty('issues_abertas', 400);
      expect(repos[0]).toHaveProperty('atualizado_em', '2024-01-01T00:00:00Z');
    });

    it('lança erro quando o python-service retorna status 5xx', async () => {
      const erroAxios = new axios.AxiosError('Internal Server Error');
      (erroAxios as { response?: unknown }).response = { status: 500 };
      clienteMock.post.mockRejectedValue(erroAxios);

      await expect(servico.analisarUsuario(perfilDeUsuarioPadrao)).rejects.toThrow();
    });

    it('lança erro quando o python-service atinge timeout', async () => {
      const erroTimeout = new axios.AxiosError('timeout of 5000ms exceeded');
      erroTimeout.code = 'ECONNABORTED';
      clienteMock.post.mockRejectedValue(erroTimeout);

      await expect(servico.analisarUsuario(perfilDeUsuarioPadrao)).rejects.toThrow();
    });
  });

  describe('analisarRepositorio', () => {
    it('retorna AnaliseDeRepositorio mapeada do snake_case para camelCase', async () => {
      clienteMock.post.mockResolvedValue({
        data: {
          repo: 'react',
          health_score: 88.0,
          tendencia_de_atividade: 'crescente',
          media_de_commits_por_semana: 45.5,
          razao_de_issues_abertas: 0.004,
          dias_desde_ultima_atualizacao: 2,
          insights: ['Atividade crescente nas últimas semanas.'],
        },
      });

      const resultado = await servico.analisarRepositorio(dadosDeRepositorioPadrao);

      expect(resultado.healthScore).toBe(88.0);
      expect(resultado.tendenciaDeAtividade).toBe('crescente');
      expect(resultado.mediaDeCommitsPorSemana).toBe(45.5);
      expect(resultado.razaoDeIssuesAbertas).toBe(0.004);
      expect(resultado.diasDesdeUltimaAtualizacao).toBe(2);
    });

    it('envia payload no formato snake_case esperado pelo python-service', async () => {
      clienteMock.post.mockResolvedValue({
        data: {
          repo: 'react',
          health_score: 80,
          tendencia_de_atividade: 'estavel',
          media_de_commits_por_semana: 30,
          razao_de_issues_abertas: 0.003,
          dias_desde_ultima_atualizacao: 5,
          insights: [],
        },
      });

      await servico.analisarRepositorio(dadosDeRepositorioPadrao);

      const corpoDaChamada = clienteMock.post.mock.calls[0][1] as Record<string, unknown>;
      expect(corpoDaChamada).toHaveProperty('issues_abertas', 800);
      expect(corpoDaChamada).toHaveProperty('atualizado_em', '2024-01-01T00:00:00Z');
      expect(corpoDaChamada).toHaveProperty('commits_por_semana');
    });
  });
});
