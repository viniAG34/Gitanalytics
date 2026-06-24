import { Router } from 'express';
import { ControladorDeAutenticacao } from '../controladores/controladorDeAutenticacao';
import { ServicoDeAutenticacao } from '../servicos/ServicoDeAutenticacao';

// Fábrica de roteador — recebe o serviço via DI (SDD-01, seção 7.2, princípio D)
export function criarRotasDeAutenticacao(servico: ServicoDeAutenticacao): Router {
  const roteador = Router();
  const controlador = new ControladorDeAutenticacao(servico);

  roteador.post('/register', (req, res, next) => controlador.registrar(req, res, next));
  roteador.post('/login', (req, res, next) => controlador.fazerLogin(req, res, next));
  roteador.post('/refresh', (req, res, next) => controlador.renovarToken(req, res, next));

  return roteador;
}
