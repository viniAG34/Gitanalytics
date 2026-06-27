import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/configuracaoDoAmbiente';
import { DadosDoUsuarioAutenticado } from '../tipos';
import {
  CODIGO_ERRO_TOKEN_AUSENTE,
  CODIGO_ERRO_TOKEN_EXPIRADO,
  CODIGO_ERRO_TOKEN_INVALIDO,
  HTTP_STATUS_UNAUTHORIZED,
} from '../utilitarios/constantes';
import { responderComErro } from '../utilitarios/respostaHttp';

function extrairDadosDoPayload(
  decoded: string | jwt.JwtPayload,
): DadosDoUsuarioAutenticado | null {
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') return null;
  const emailRaw = decoded['email'];
  return { id: decoded.sub, email: typeof emailRaw === 'string' ? emailRaw : '' };
}

// Middleware de autenticação JWT — SDD-06, seção 1
export function autenticarJWT(req: Request, res: Response, next: NextFunction): void {
  const cabecalhoDeAutorizacao = req.headers['authorization'];

  if (!cabecalhoDeAutorizacao || !cabecalhoDeAutorizacao.startsWith('Bearer ')) {
    res
      .status(HTTP_STATUS_UNAUTHORIZED)
      .json(responderComErro(CODIGO_ERRO_TOKEN_AUSENTE, 'Autenticação necessária.'));
    return;
  }

  const token = cabecalhoDeAutorizacao.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const usuario = extrairDadosDoPayload(decoded);
    if (!usuario) {
      res
        .status(HTTP_STATUS_UNAUTHORIZED)
        .json(responderComErro(CODIGO_ERRO_TOKEN_INVALIDO, 'Token inválido.'));
      return;
    }
    req.usuarioAutenticado = usuario;
    next();
  } catch (erro) {
    if (erro instanceof jwt.TokenExpiredError) {
      res
        .status(HTTP_STATUS_UNAUTHORIZED)
        .json(responderComErro(CODIGO_ERRO_TOKEN_EXPIRADO, 'Token expirado.'));
      return;
    }
    res
      .status(HTTP_STATUS_UNAUTHORIZED)
      .json(responderComErro(CODIGO_ERRO_TOKEN_INVALIDO, 'Token inválido.'));
  }
}
