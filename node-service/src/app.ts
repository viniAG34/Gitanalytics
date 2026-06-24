import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import { env } from './config/configuracaoDoAmbiente';
import logger from './config/logger';
import { tratadorDeErrosGlobal } from './middlewares/tratadorDeErros';
import { criarRotasDeAutenticacao } from './rotas/autenticacao';
import { criarRotasDeGitHub } from './rotas/github';
import { criarRotasDeHistorico } from './rotas/historico';
import { ServicoDeAutenticacao } from './servicos/ServicoDeAutenticacao';
import { ServicoDeHistorico } from './servicos/ServicoDeHistorico';
import { ServicoGitHub } from './servicos/ServicoGitHub';
import { HTTP_STATUS_NOT_FOUND } from './utilitarios/constantes';

export interface ServicosDoApp {
  servicoDeAutenticacao: ServicoDeAutenticacao;
  servicoGitHub: ServicoGitHub;
  servicoDeHistorico: ServicoDeHistorico;
}

export function criarApp(servicos: ServicosDoApp): Application {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.use(express.json());

  app.use((req: Request, res: Response, next: NextFunction) => {
    const inicioEm = Date.now();
    res.on('finish', () => {
      logger.info({
        message: 'Requisição recebida',
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duracaoMs: Date.now() - inicioEm,
      });
    });
    next();
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // Rotas de autenticação — Fase 3a (SDD-02, specs 0.1, 0.2, 0.3)
  app.use('/api/v1/auth', criarRotasDeAutenticacao(servicos.servicoDeAutenticacao));

  // Rotas GitHub — Fase 3b (SDD-02, specs 0.4, 0.5)
  app.use('/api/v1/github', criarRotasDeGitHub(servicos.servicoGitHub));

  // Rotas de histórico — Fase 3b (SDD-02, specs 0.6, 0.7)
  app.use('/api/v1/history', criarRotasDeHistorico(servicos.servicoDeHistorico));

  // Handler 404 — deve ficar após todas as rotas, antes do tratadorDeErrosGlobal
  app.use((_req: Request, res: Response) => {
    res.status(HTTP_STATUS_NOT_FOUND).json({
      success: false,
      error: { code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada.' },
    });
  });

  // Tratador de erros global — deve ser o ÚLTIMO middleware (SDD-07, seção 3)
  app.use(tratadorDeErrosGlobal);

  return app;
}
