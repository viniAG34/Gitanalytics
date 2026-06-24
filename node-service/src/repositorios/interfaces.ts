import { ItemDeHistorico, Usuario } from '../tipos';

// Dados necessários para criar um novo usuário no banco
export interface DadosParaCriarUsuario {
  email: string;
  nome: string;
  senhaHash: string;
}

// Usuário com hash da senha — uso interno exclusivo; nunca retornar ao cliente
export interface UsuarioComHash extends Usuario {
  senhaHash: string;
}

// Interface segregada: acesso a dados de usuário — SDD-01, seção 7.2 (princípio I)
export interface IRepositorioDeUsuario {
  criar(dados: DadosParaCriarUsuario): Promise<Usuario>;
  buscarPorEmail(email: string): Promise<UsuarioComHash | null>;
}

// Interface segregada: cache Redis — SDD-01, seção 7.2 (princípio I)
export interface IRepositorioDeCache {
  buscar<T>(chave: string): Promise<T | null>;
  armazenar<T>(chave: string, valor: T, ttlEmSegundos: number): Promise<void>;
  deletar(chave: string): Promise<void>;
}

// Dados necessários para criar um item de histórico — SDD-02, seção 3
export interface DadosParaCriarItemDeHistorico {
  usuarioId: string;
  tipoDeBusca: 'usuario' | 'repositorio';
  valorBuscado: string;
  score: number | null;
}

// Interface segregada: acesso ao histórico de buscas — SDD-01, seção 7.2 (princípio I)
export interface IRepositorioDeHistorico {
  criar(dados: DadosParaCriarItemDeHistorico): Promise<ItemDeHistorico>;
  listarPorUsuario(usuarioId: string, limite: number): Promise<ItemDeHistorico[]>;
  deletarPorIdEUsuario(id: string, usuarioId: string): Promise<boolean>;
}
