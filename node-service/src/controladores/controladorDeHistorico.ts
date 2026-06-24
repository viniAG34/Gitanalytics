import { NextFunction, Request, Response } from 'express';
import { ServicoDeHistorico } from '../servicos/ServicoDeHistorico';
import { HTTP_STATUS_OK } from '../utilitarios/constantes';
import { responderComSucesso } from '../utilitarios/respostaHttp';

export class ControladorDeHistorico {
  constructor(private readonly servicoDeHistorico: ServicoDeHistorico) {}

  // GET /api/v1/history — SDD-02, spec 0.6
  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const usuarioId = req.usuarioAutenticado!.id;
      const itens = await this.servicoDeHistorico.listar(usuarioId);
      res.status(HTTP_STATUS_OK).json(responderComSucesso(itens));
    } catch (erro) {
      next(erro);
    }
  }

  // DELETE /api/v1/history/:id — SDD-02, spec 0.7
  async remover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const usuarioId = req.usuarioAutenticado!.id;
      await this.servicoDeHistorico.remover(id, usuarioId);
      res.status(HTTP_STATUS_OK).json(responderComSucesso({ removido: true }));
    } catch (erro) {
      next(erro);
    }
  }
}
