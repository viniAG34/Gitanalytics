import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/configuracaoDoAmbiente';
import { IRepositorioDeUsuario } from '../repositorios/interfaces';
import { Usuario } from '../tipos';
import {
  CODIGO_ERRO_TOKEN_EXPIRADO,
  CODIGO_ERRO_TOKEN_INVALIDO,
  CODIGO_ERRO_VALIDACAO,
  CUSTO_BCRYPT,
  DURACAO_REFRESH_TOKEN,
  DURACAO_TOKEN_JWT,
  EXPIRES_IN_SEGUNDOS,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_UNAUTHORIZED,
} from '../utilitarios/constantes';
import { ErroCredenciaisInvalidas, ErroDeNegocio } from '../utilitarios/erros';
import { DadosDeLogin, DadosDeRegistro } from '../validadores/validadorDeAutenticacao';

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
        CODIGO_ERRO_VALIDACAO,
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
    const hashParaComparar = usuarioEncontrado?.senhaHash ?? this.obterHashDummy();
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
    let decoded: string | jwt.JwtPayload;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    } catch (erro) {
      if (erro instanceof jwt.TokenExpiredError) {
        throw new ErroDeNegocio(
          CODIGO_ERRO_TOKEN_EXPIRADO,
          'Sessão expirada, faça login novamente.',
          HTTP_STATUS_UNAUTHORIZED,
        );
      }
      throw new ErroDeNegocio(CODIGO_ERRO_TOKEN_INVALIDO, 'Token inválido.', HTTP_STATUS_UNAUTHORIZED);
    }

    const payload = this.validarPayloadJwt(decoded);
    const token = jwt.sign(
      { sub: payload.sub, email: payload.email },
      env.JWT_SECRET,
      { expiresIn: DURACAO_TOKEN_JWT },
    );
    return { token, expiresIn: EXPIRES_IN_SEGUNDOS };
  }

  private obterHashDummy(): string {
    if (!this.hashDummy) {
      throw new Error('ServicoDeAutenticacao não inicializado. Chame inicializar() antes de usar.');
    }
    return this.hashDummy;
  }

  private validarPayloadJwt(decoded: string | jwt.JwtPayload): { sub: string; email: string } {
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
      throw new ErroDeNegocio(CODIGO_ERRO_TOKEN_INVALIDO, 'Token inválido.', HTTP_STATUS_UNAUTHORIZED);
    }
    const emailRaw = decoded['email'];
    return { sub: decoded.sub, email: typeof emailRaw === 'string' ? emailRaw : '' };
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
