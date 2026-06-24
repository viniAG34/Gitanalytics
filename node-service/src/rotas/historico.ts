import { Router } from 'express';
import { ControladorDeHistorico } from '../controladores/controladorDeHistorico';
import { autenticarJWT } from '../middlewares/autenticarJWT';
import { ServicoDeHistorico } from '../servicos/ServicoDeHistorico';

// SDD-02, specs 0.6 e 0.7 — todas as rotas exigem JWT válido
export function criarRotasDeHistorico(servicoDeHistorico: ServicoDeHistorico): Router {
  const roteador = Router();
  const controlador = new ControladorDeHistorico(servicoDeHistorico);

  roteador.get('/', autenticarJWT, (req, res, next) => controlador.listar(req, res, next));

  roteador.delete('/:id', autenticarJWT, (req, res, next) => controlador.remover(req, res, next));

  return roteador;
}
