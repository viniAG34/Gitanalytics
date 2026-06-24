import { PrismaClient } from '@prisma/client';
import { Usuario } from '../tipos';
import { DadosParaCriarUsuario, IRepositorioDeUsuario, UsuarioComHash } from './interfaces';

export class RepositorioDeUsuarioPostgres implements IRepositorioDeUsuario {
  constructor(private readonly prisma: PrismaClient) {}

  async criar(dados: DadosParaCriarUsuario): Promise<Usuario> {
    const registro = await this.prisma.usuario.create({
      data: {
        email: dados.email.toLowerCase(),
        nome: dados.nome,
        senha_hash: dados.senhaHash,
      },
    });
    return this.mapearParaUsuario(registro);
  }

  async buscarPorEmail(email: string): Promise<UsuarioComHash | null> {
    const registro = await this.prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!registro) return null;
    return {
      ...this.mapearParaUsuario(registro),
      senhaHash: registro.senha_hash,
    };
  }

  private mapearParaUsuario(registro: {
    id: string;
    nome: string;
    email: string;
    criado_em: Date;
  }): Usuario {
    return {
      id: registro.id,
      nome: registro.nome,
      email: registro.email,
      criadoEm: registro.criado_em.toISOString(),
    };
  }
}
