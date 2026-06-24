import { PrismaClient } from '@prisma/client';
import { ItemDeHistorico } from '../tipos';
import {
  DadosParaCriarItemDeHistorico,
  IRepositorioDeHistorico,
} from './interfaces';

export class RepositorioDeHistoricoPostgres implements IRepositorioDeHistorico {
  constructor(private readonly prisma: PrismaClient) {}

  async criar(dados: DadosParaCriarItemDeHistorico): Promise<ItemDeHistorico> {
    const registro = await this.prisma.historicoBusca.create({
      data: {
        usuario_id: dados.usuarioId,
        tipo_busca: dados.tipoDeBusca,
        valor_buscado: dados.valorBuscado,
        score: dados.score,
      },
    });
    return this.mapearParaItemDeHistorico(registro);
  }

  async listarPorUsuario(usuarioId: string, limite: number): Promise<ItemDeHistorico[]> {
    const registros = await this.prisma.historicoBusca.findMany({
      where: { usuario_id: usuarioId },
      orderBy: { realizada_em: 'desc' },
      take: limite,
    });
    return registros.map((r) => this.mapearParaItemDeHistorico(r));
  }

  async deletarPorIdEUsuario(id: string, usuarioId: string): Promise<boolean> {
    const resultado = await this.prisma.historicoBusca.deleteMany({
      where: { id, usuario_id: usuarioId },
    });
    return resultado.count > 0;
  }

  private mapearParaItemDeHistorico(registro: {
    id: string;
    tipo_busca: string;
    valor_buscado: string;
    score: { toNumber(): number } | null;
    realizada_em: Date;
  }): ItemDeHistorico {
    return {
      id: registro.id,
      tipoDeBusca: registro.tipo_busca as 'usuario' | 'repositorio',
      valorBuscado: registro.valor_buscado,
      score: registro.score !== null ? registro.score.toNumber() : null,
      realizadaEm: registro.realizada_em.toISOString(),
    };
  }
}
