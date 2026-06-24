import { cliente } from './cliente';
import { RespostaDaApi, TokensDeAutenticacao, Usuario } from '../tipos';

interface DadosDeRegistro {
  nome: string;
  email: string;
  senha: string;
}

interface DadosDeLogin {
  email: string;
  senha: string;
}

interface ResultadoDeAuth {
  usuario: Usuario;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

interface ResultadoDeRefresh {
  token: string;
  expiresIn: number;
}

export async function registrar(dados: DadosDeRegistro): Promise<{ usuario: Usuario; tokens: TokensDeAutenticacao }> {
  const resposta = await cliente.post<RespostaDaApi<ResultadoDeAuth>>('/auth/register', dados);
  const { usuario, token, refreshToken, expiresIn } = resposta.data.data;
  return { usuario, tokens: { token, refreshToken, expiresIn } };
}

export async function fazerLogin(dados: DadosDeLogin): Promise<{ usuario: Usuario; tokens: TokensDeAutenticacao }> {
  const resposta = await cliente.post<RespostaDaApi<ResultadoDeAuth>>('/auth/login', dados);
  const { usuario, token, refreshToken, expiresIn } = resposta.data.data;
  return { usuario, tokens: { token, refreshToken, expiresIn } };
}

export async function renovarToken(refreshToken: string): Promise<ResultadoDeRefresh> {
  const resposta = await cliente.post<RespostaDaApi<ResultadoDeRefresh>>('/auth/refresh', { refreshToken });
  return resposta.data.data;
}
