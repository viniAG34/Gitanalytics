import Redis from 'ioredis';
import logger from '../config/logger';
import { IRepositorioDeCache } from './interfaces';

export class RepositorioDeCacheRedis implements IRepositorioDeCache {
  constructor(private readonly redis: Redis) {}

  async buscar<T>(chave: string): Promise<T | null> {
    try {
      const valor = await this.redis.get(chave);
      if (!valor) {
        logger.debug({ message: 'Cache MISS', chave });
        return null;
      }
      logger.debug({ message: 'Cache HIT', chave });
      return JSON.parse(valor) as T;
    } catch (erro) {
      // Guard Silent: cache MISS por falha de conexão — SDD-07, seção 1
      logger.debug({ message: 'Falha ao buscar no cache', chave, erro: String(erro) });
      return null;
    }
  }

  async armazenar<T>(chave: string, valor: T, ttlEmSegundos: number): Promise<void> {
    try {
      await this.redis.set(chave, JSON.stringify(valor), 'EX', ttlEmSegundos);
    } catch (erro) {
      // Guard Silent: falha ao armazenar no cache não interrompe o fluxo — SDD-07, seção 1
      logger.debug({ message: 'Falha ao armazenar no cache', chave, erro: String(erro) });
    }
  }

  async deletar(chave: string): Promise<void> {
    try {
      await this.redis.del(chave);
    } catch (erro) {
      logger.debug({ message: 'Falha ao deletar do cache', chave, erro: String(erro) });
    }
  }
}
