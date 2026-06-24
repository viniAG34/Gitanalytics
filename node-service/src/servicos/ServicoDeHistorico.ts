import { IRepositorioDeHistorico } from '../repositorios/interfaces';
import { ItemDeHistorico } from '../tipos';
import { LIMITE_ITENS_HISTORICO } from '../utilitarios/constantes';
import { ErroItemNaoEncontrado } from '../utilitarios/erros';

export interface DadosParaRegistrarHistorico {
  usuarioId: string;
  tipoDeBusca: 'usuario' | 'repositorio';
  valorBuscado: string;
  score: number | null;
}

export class ServicoDeHistorico {
  constructor(private readonly repositorioDeHistorico: IRepositorioDeHistorico) {}

  async registrar(dados: DadosParaRegistrarHistorico): Promise<ItemDeHistorico> {
    return this.repositorioDeHistorico.criar({
      usuarioId: dados.usuarioId,
      tipoDeBusca: dados.tipoDeBusca,
      valorBuscado: dados.valorBuscado,
      score: dados.score,
    });
  }

  async listar(usuarioId: string): Promise<ItemDeHistorico[]> {
    return this.repositorioDeHistorico.listarPorUsuario(usuarioId, LIMITE_ITENS_HISTORICO);
  }

  async remover(id: string, usuarioId: string): Promise<void> {
    const removido = await this.repositorioDeHistorico.deletarPorIdEUsuario(id, usuarioId);
    if (!removido) {
      throw new ErroItemNaoEncontrado();
    }
  }
}
