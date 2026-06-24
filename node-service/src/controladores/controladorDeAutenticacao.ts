import { NextFunction, Request, Response } from 'express';
import { ServicoDeAutenticacao } from '../servicos/ServicoDeAutenticacao';
import { HTTP_STATUS_CREATED, HTTP_STATUS_OK } from '../utilitarios/constantes';
import { responderComSucesso } from '../utilitarios/respostaHttp';
import {
  esquemaDeLogin,
  esquemaDeRefresh,
  esquemaDeRegistro,
} from '../validadores/validadorDeAutenticacao';

export class ControladorDeAutenticacao {
  constructor(private readonly servicoDeAutenticacao: ServicoDeAutenticacao) {}

  // POST /api/v1/auth/register — SDD-02, spec 0.1
  async registrar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dados = esquemaDeRegistro.parse(req.body);
      const resultado = await this.servicoDeAutenticacao.registrar(dados);
      res.status(HTTP_STATUS_CREATED).json(responderComSucesso(resultado));
    } catch (erro) {
      next(erro);
    }
  }

  // POST /api/v1/auth/login — SDD-02, spec 0.2
  async fazerLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dados = esquemaDeLogin.parse(req.body);
      const resultado = await this.servicoDeAutenticacao.fazerLogin(dados);
      res.status(HTTP_STATUS_OK).json(responderComSucesso(resultado));
    } catch (erro) {
      next(erro);
    }
  }

  // POST /api/v1/auth/refresh — SDD-02, spec 0.3
  async renovarToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = esquemaDeRefresh.parse(req.body);
      const resultado = await this.servicoDeAutenticacao.renovarToken(refreshToken);
      res.status(HTTP_STATUS_OK).json(responderComSucesso(resultado));
    } catch (erro) {
      next(erro);
    }
  }
}
