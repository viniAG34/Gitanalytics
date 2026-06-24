import { Router } from 'express';
import { ControladorDeGitHub } from '../controladores/controladorDeGitHub';
import { autenticarJWT } from '../middlewares/autenticarJWT';
import { ServicoGitHub } from '../servicos/ServicoGitHub';

// SDD-02, specs 0.4 e 0.5 — todas as rotas exigem JWT válido
export function criarRotasDeGitHub(servicoGitHub: ServicoGitHub): Router {
  const roteador = Router();
  const controlador = new ControladorDeGitHub(servicoGitHub);

  roteador.get(
    '/user/:username',
    autenticarJWT,
    (req, res, next) => controlador.buscarUsuario(req, res, next),
  );

  roteador.get(
    '/repo/:owner/:repo',
    autenticarJWT,
    (req, res, next) => controlador.buscarRepositorio(req, res, next),
  );

  return roteador;
}
