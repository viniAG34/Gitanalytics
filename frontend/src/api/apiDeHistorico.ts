import { cliente } from './cliente';
import { ItemDeHistorico, RespostaDaApi } from '../tipos';

export async function listar(): Promise<ItemDeHistorico[]> {
  const resposta = await cliente.get<RespostaDaApi<ItemDeHistorico[]>>('/history');
  return resposta.data.data;
}

export async function remover(id: string): Promise<void> {
  await cliente.delete<RespostaDaApi<{ removido: boolean }>>(`/history/${id}`);
}
