import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/configuracaoDoAmbiente';
import { IRepositorioDeUsuario } from '../repositorios/interfaces';
import { Usuario } from '../tipos';
import { PayloadDoToken } from '../tipos';
import {
  CUSTO_BCRYPT,
  DURACAO_REFRESH_TOKEN,
  DURACAO_TOKEN_JWT,
  EXPIRES_IN_SEGUNDOS,
} from '../utilitarios/constantes';
import { ErroCredenciaisInvalidas, ErroDeNegocio } from '../utilitarios/erros';
import { DadosDeLogin, DadosDeRegistro } from '../validadores/validadorDeAutenticacao';
import { HTTP_STATUS_BAD_REQUEST } from '../utilitarios/constantes';

export interface ResultadoDeRegistro {
  usuario: Usuario;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ResultadoDeLogin {
  usuario: Usuario;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ResultadoDeRefresh {
  token: string;
  expiresIn: number;
}

export class ServicoDeAutenticacao {
  // Hash dummy pré-calculado no startup para mitigar timing attacks — SDD-06, seção 0.2
  private hashDummy: string | null = null;

  constructor(private readonly repositorioDeUsuario: IRepositorioDeUsuario) {}

  // Deve ser chamado uma única vez no startup do servidor — SDD-06, seção 0.2
  async inicializar(custo: number = CUSTO_BCRYPT): Promise<void> {
    this.hashDummy = await bcrypt.hash('sentinela-para-timing-attack', custo);
  }

  async registrar(dados: DadosDeRegistro): Promise<ResultadoDeRegistro> {
    const senhaHash = await bcrypt.hash(dados.senha, CUSTO_BCRYPT);

    let usuario: Usuario;
    try {
      usuario = await this.repositorioDeUsuario.criar({
        email: dados.email,
        nome: dados.nome,
        senhaHash,
      });
    } catch {
      // Erro de unicidade do email — não revelar que o email já existe (SDD-02, spec 0.1)
      throw new ErroDeNegocio(
        'VALIDATION_ERROR',
        'Dados inválidos. Verifique os campos.',
        HTTP_STATUS_BAD_REQUEST,
      );
    }

    const { token, refreshToken } = this.gerarTokens(usuario);
    return { usuario, token, refreshToken, expiresIn: EXPIRES_IN_SEGUNDOS };
  }

  async fazerLogin(dados: DadosDeLogin): Promise<ResultadoDeLogin> {
    const usuarioEncontrado = await this.repositorioDeUsuario.buscarPorEmail(dados.email);

    // Sempre executa bcrypt.compare para manter tempo uniforme — SDD-06, seção 0.2
    const hashParaComparar = usuarioEncontrado?.senhaHash ?? this.hashDummy!;
    const senhaCorreta = await bcrypt.compare(dados.senha, hashParaComparar);

    if (!usuarioEncontrado || !senhaCorreta) {
      throw new ErroCredenciaisInvalidas();
    }

    const { token, refreshToken } = this.gerarTokens(usuarioEncontrado);
    return {
      usuario: {
        id: usuarioEncontrado.id,
        nome: usuarioEncontrado.nome,
        email: usuarioEncontrado.email,
        criadoEm: usuarioEncontrado.criadoEm,
      },
      token,
      refreshToken,
      expiresIn: EXPIRES_IN_SEGUNDOS,
    };
  }

  async renovarToken(refreshToken: string): Promise<ResultadoDeRefresh> {
    let payload: PayloadDoToken;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as PayloadDoToken;
    } catch (erro) {
      if (erro instanceof jwt.TokenExpiredError) {
        throw new ErroDeNegocio(
          'TOKEN_EXPIRED',
          'Sessão expirada, faça login novamente.',
          401,
        );
      }
      throw new ErroDeNegocio('INVALID_TOKEN', 'Token inválido.', 401);
    }

    const token = jwt.sign(
      { sub: payload.sub, email: payload.email },
      env.JWT_SECRET,
      { expiresIn: DURACAO_TOKEN_JWT },
    );

    return { token, expiresIn: EXPIRES_IN_SEGUNDOS };
  }

  private gerarTokens(usuario: Usuario): { token: string; refreshToken: string } {
    const token = jwt.sign(
      { sub: usuario.id, email: usuario.email },
      env.JWT_SECRET,
      { expiresIn: DURACAO_TOKEN_JWT },
    );
    const refreshToken = jwt.sign(
      { sub: usuario.id, email: usuario.email },
      env.JWT_REFRESH_SECRET,
      { expiresIn: DURACAO_REFRESH_TOKEN },
    );
    return { token, refreshToken };
  }
}
