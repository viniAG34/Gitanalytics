import { cliente } from './cliente';
import { RespostaDaApi, RespostaDeBuscaDeRepositorio, RespostaDeBuscaDeUsuario } from '../tipos';

export async function buscarUsuario(username: string): Promise<RespostaDeBuscaDeUsuario> {
  const resposta = await cliente.get<RespostaDaApi<RespostaDeBuscaDeUsuario>>(
    `/github/user/${encodeURIComponent(username)}`,
  );
  return resposta.data.data;
}

export async function buscarRepositorio(
  owner: string,
  repo: string,
): Promise<RespostaDeBuscaDeRepositorio> {
  const resposta = await cliente.get<RespostaDaApi<RespostaDeBuscaDeRepositorio>>(
    `/github/repo/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
  );
  return resposta.data.data;
}
