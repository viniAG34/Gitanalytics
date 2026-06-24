import { NextFunction, Request, Response } from 'express';
import { ServicoGitHub } from '../servicos/ServicoGitHub';
import { HTTP_STATUS_OK } from '../utilitarios/constantes';
import { ErroParametroInvalido } from '../utilitarios/erros';
import { responderComSucesso } from '../utilitarios/respostaHttp';
import {
  esquemaDeParametrosDeRepositorio,
  esquemaDeParametrosDeUsuario,
} from '../validadores/validadorDeGitHub';

export class ControladorDeGitHub {
  constructor(private readonly servicoGitHub: ServicoGitHub) {}

  // GET /api/v1/github/user/:username — SDD-02, spec 0.4
  async buscarUsuario(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parametrosParseados = esquemaDeParametrosDeUsuario.safeParse(req.params);
      if (!parametrosParseados.success) {
        throw new ErroParametroInvalido('username');
      }

      const { username } = parametrosParseados.data;
      const usuarioId = req.usuarioAutenticado!.id;

      const resultado = await this.servicoGitHub.buscarAnaliseDeUsuario(usuarioId, username);
      res.status(HTTP_STATUS_OK).json(responderComSucesso(resultado));
    } catch (erro) {
      next(erro);
    }
  }

  // GET /api/v1/github/repo/:owner/:repo — SDD-02, spec 0.5
  async buscarRepositorio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parametrosParseados = esquemaDeParametrosDeRepositorio.safeParse(req.params);
      if (!parametrosParseados.success) {
        throw new ErroParametroInvalido('owner/repo');
      }

      const { owner, repo } = parametrosParseados.data;
      const usuarioId = req.usuarioAutenticado!.id;

      const resultado = await this.servicoGitHub.buscarAnaliseDeRepositorio(usuarioId, owner, repo);
      res.status(HTTP_STATUS_OK).json(responderComSucesso(resultado));
    } catch (erro) {
      next(erro);
    }
  }
}
