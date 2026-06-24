import axios from 'axios';
import 'dotenv/config';
import './config/configuracaoDoAmbiente'; // valida vars de ambiente na inicialização
import { criarApp } from './app';
import { prisma } from './config/bancoDeDados';
import logger from './config/logger';
import { redis } from './config/redis';
import { RepositorioDeCacheRedis } from './repositorios/RepositorioDeCacheRedis';
import { RepositorioDeHistoricoPostgres } from './repositorios/RepositorioDeHistoricoPostgres';
import { RepositorioDeUsuarioPostgres } from './repositorios/RepositorioDeUsuarioPostgres';
import { ServicoDeAnalise } from './servicos/ServicoDeAnalise';
import { ServicoDeAutenticacao } from './servicos/ServicoDeAutenticacao';
import { ServicoDeHistorico } from './servicos/ServicoDeHistorico';
import { ServicoGitHub } from './servicos/ServicoGitHub';
import { PORTA_PADRAO_NODE_SERVICE, URL_BASE_GITHUB_API } from './utilitarios/constantes';
import { env } from './config/configuracaoDoAmbiente';

async function iniciarServidor(): Promise<void> {
  // Clientes HTTP com base URL pré-configurada — SDD-01, seção 7.2 (princípio D)
  const clienteGitHub = axios.create({
    baseURL: URL_BASE_GITHUB_API,
    headers: {
      Accept: 'application/vnd.github.v3+json',
      ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
    },
  });

  const clientePythonService = axios.create({
    baseURL: env.PYTHON_SERVICE_URL,
  });

  // Injeção de dependências — SDD-01, seção 7.2 (princípio D)
  const repositorioDeUsuario = new RepositorioDeUsuarioPostgres(prisma);
  const repositorioDeHistorico = new RepositorioDeHistoricoPostgres(prisma);
  const repositorioDeCache = new RepositorioDeCacheRedis(redis);

  const servicoDeAutenticacao = new ServicoDeAutenticacao(repositorioDeUsuario);
  const servicoDeAnalise = new ServicoDeAnalise(clientePythonService);
  const servicoDeHistorico = new ServicoDeHistorico(repositorioDeHistorico);
  const servicoGitHub = new ServicoGitHub(
    repositorioDeCache,
    servicoDeAnalise,
    servicoDeHistorico,
    clienteGitHub,
  );

  // Hash dummy calculado UMA VEZ no startup — SDD-06, seção 0.2
  await servicoDeAutenticacao.inicializar();

  const app = criarApp({ servicoDeAutenticacao, servicoGitHub, servicoDeHistorico });

  const porta = Number(process.env.PORT) || PORTA_PADRAO_NODE_SERVICE;
  app.listen(porta, () => {
    logger.info({ message: `node-service iniciado na porta ${porta}` });
  });
}

iniciarServidor().catch((erro: unknown) => {
  const erroTipado = erro instanceof Error ? erro : new Error(String(erro));
  logger.error({ message: 'Falha ao iniciar servidor', stack: erroTipado.stack });
  process.exit(1);
});
