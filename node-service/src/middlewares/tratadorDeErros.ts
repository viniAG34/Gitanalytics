import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ErroDeNegocio } from '../utilitarios/erros';
import {
  CODIGO_ERRO_INTERNO,
  CODIGO_ERRO_VALIDACAO,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_ERROR,
} from '../utilitarios/constantes';
import logger from '../config/logger';

export function tratadorDeErrosGlobal(
  erro: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (erro instanceof ErroDeNegocio) {
    logger.warn({ code: erro.code, path: req.path, message: erro.message });
    res.status(erro.statusHttp).json({
      success: false,
      error: { code: erro.code, message: erro.mensagemParaCliente },
    });
    return;
  }

  if (erro instanceof ZodError) {
    const campos = Object.fromEntries(
      erro.errors.map((e) => [e.path.join('.'), e.message]),
    );
    res.status(HTTP_STATUS_BAD_REQUEST).json({
      success: false,
      error: {
        code: CODIGO_ERRO_VALIDACAO,
        message: 'Dados inválidos. Verifique os campos.',
        fields: campos,
      },
    });
    return;
  }

  const erroGenerico = erro instanceof Error ? erro : new Error(String(erro));
  logger.error({
    path: req.path,
    stack: erroGenerico.stack,
    message: erroGenerico.message,
  });
  res.status(HTTP_STATUS_INTERNAL_ERROR).json({
    success: false,
    error: {
      code: CODIGO_ERRO_INTERNO,
      message: 'Erro interno. Tente novamente em instantes.',
    },
  });
}
