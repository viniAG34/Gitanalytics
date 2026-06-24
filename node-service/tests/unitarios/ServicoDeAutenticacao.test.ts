import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ServicoDeAutenticacao } from '../../src/servicos/ServicoDeAutenticacao';
import { IRepositorioDeUsuario, UsuarioComHash } from '../../src/repositorios/interfaces';
import { Usuario } from '../../src/tipos';
import { ErroCredenciaisInvalidas, ErroDeNegocio } from '../../src/utilitarios/erros';

const CUSTO_BCRYPT_TESTE = 4; // custo baixo para testes rápidos

const usuarioPadrao: Usuario = {
  id: 'uuid-teste-1',
  nome: 'Vinicius',
  email: 'vini@teste.com',
  criadoEm: new Date().toISOString(),
};

function criarRepositorioMock(): jest.Mocked<IRepositorioDeUsuario> {
  return {
    criar: jest.fn(),
    buscarPorEmail: jest.fn(),
  };
}

describe('ServicoDeAutenticacao', () => {
  let servico: ServicoDeAutenticacao;
  let repositorioMock: jest.Mocked<IRepositorioDeUsuario>;

  beforeEach(async () => {
    repositorioMock = criarRepositorioMock();
    servico = new ServicoDeAutenticacao(repositorioMock);
    await servico.inicializar(CUSTO_BCRYPT_TESTE);
  });

  describe('registrar', () => {
    it('retorna usuario e tokens ao registrar com dados válidos', async () => {
      repositorioMock.criar.mockResolvedValue(usuarioPadrao);

      const resultado = await servico.registrar({
        nome: 'Vinicius',
        email: 'vini@teste.com',
        senha: 'Senha123',
      });

      expect(resultado.usuario).toEqual(usuarioPadrao);
      expect(resultado.token).toBeDefined();
      expect(resultado.refreshToken).toBeDefined();
      expect(resultado.expiresIn).toBe(86400);
    });

    it('não inclui senha_hash no resultado', async () => {
      repositorioMock.criar.mockResolvedValue(usuarioPadrao);

      const resultado = await servico.registrar({
        nome: 'Vinicius',
        email: 'vini@teste.com',
        senha: 'Senha123',
      });

      expect(resultado.usuario).not.toHaveProperty('senhaHash');
      expect(resultado.usuario).not.toHaveProperty('senha_hash');
    });

    it('passa senha hasheada ao repositório (nunca texto claro)', async () => {
      repositorioMock.criar.mockResolvedValue(usuarioPadrao);

      await servico.registrar({ nome: 'Vinicius', email: 'vini@teste.com', senha: 'Senha123' });

      const chamada = repositorioMock.criar.mock.calls[0][0];
      expect(chamada.senhaHash).not.toBe('Senha123');
      expect(chamada.senhaHash.startsWith('$2')).toBe(true); // hash bcrypt
    });

    it('lança ErroDeNegocio genérico quando email já existe', async () => {
      repositorioMock.criar.mockRejectedValue(new Error('Unique constraint failed'));

      await expect(
        servico.registrar({ nome: 'Outro', email: 'vini@teste.com', senha: 'Senha123' }),
      ).rejects.toBeInstanceOf(ErroDeNegocio);
    });

    it('não vaza que o email já existe na mensagem de erro', async () => {
      repositorioMock.criar.mockRejectedValue(new Error('Unique constraint failed'));

      try {
        await servico.registrar({ nome: 'Outro', email: 'vini@teste.com', senha: 'Senha123' });
      } catch (erro) {
        if (erro instanceof ErroDeNegocio) {
          expect(erro.mensagemParaCliente).toBe('Dados inválidos. Verifique os campos.');
          expect(erro.mensagemParaCliente.toLowerCase()).not.toContain('email');
        }
      }
    });
  });

  describe('fazerLogin', () => {
    it('retorna usuario e tokens com credenciais válidas', async () => {
      const senhaHash = await bcrypt.hash('Senha123', CUSTO_BCRYPT_TESTE);
      const usuarioComHash: UsuarioComHash = { ...usuarioPadrao, senhaHash };
      repositorioMock.buscarPorEmail.mockResolvedValue(usuarioComHash);

      const resultado = await servico.fazerLogin({
        email: 'vini@teste.com',
        senha: 'Senha123',
      });

      expect(resultado.token).toBeDefined();
      expect(resultado.refreshToken).toBeDefined();
      expect(resultado.expiresIn).toBe(86400);
      expect(resultado.usuario.email).toBe('vini@teste.com');
    });

    it('lança ErroCredenciaisInvalidas com email inexistente', async () => {
      repositorioMock.buscarPorEmail.mockResolvedValue(null);

      await expect(
        servico.fazerLogin({ email: 'nao@existe.com', senha: 'Senha123' }),
      ).rejects.toBeInstanceOf(ErroCredenciaisInvalidas);
    });

    it('lança ErroCredenciaisInvalidas com senha incorreta', async () => {
      const senhaHash = await bcrypt.hash('SenhaCorreta', CUSTO_BCRYPT_TESTE);
      const usuarioComHash: UsuarioComHash = { ...usuarioPadrao, senhaHash };
      repositorioMock.buscarPorEmail.mockResolvedValue(usuarioComHash);

      await expect(
        servico.fazerLogin({ email: 'vini@teste.com', senha: 'SenhaErrada' }),
      ).rejects.toBeInstanceOf(ErroCredenciaisInvalidas);
    });

    it('executa bcrypt.compare mesmo com email inexistente (timing attack — SDD-06, 0.2)', async () => {
      repositorioMock.buscarPorEmail.mockResolvedValue(null);
      const compareSpy = jest.spyOn(bcrypt, 'compare');

      await expect(
        servico.fazerLogin({ email: 'nao@existe.com', senha: 'Qualquer' }),
      ).rejects.toBeInstanceOf(ErroCredenciaisInvalidas);

      expect(compareSpy).toHaveBeenCalledTimes(1);
      compareSpy.mockRestore();
    });

    it('retorna a mesma classe de erro para email inexistente e senha errada', async () => {
      repositorioMock.buscarPorEmail.mockResolvedValue(null);
      let erroEmailInexistente: unknown;
      try {
        await servico.fazerLogin({ email: 'nao@existe.com', senha: 'Qualquer' });
      } catch (e) {
        erroEmailInexistente = e;
      }

      const senhaHash = await bcrypt.hash('SenhaCorreta', CUSTO_BCRYPT_TESTE);
      repositorioMock.buscarPorEmail.mockResolvedValue({ ...usuarioPadrao, senhaHash });
      let erroSenhaErrada: unknown;
      try {
        await servico.fazerLogin({ email: 'vini@teste.com', senha: 'SenhaErrada' });
      } catch (e) {
        erroSenhaErrada = e;
      }

      expect(erroEmailInexistente).toBeInstanceOf(ErroCredenciaisInvalidas);
      expect(erroSenhaErrada).toBeInstanceOf(ErroCredenciaisInvalidas);
      expect((erroEmailInexistente as ErroDeNegocio).mensagemParaCliente).toBe(
        (erroSenhaErrada as ErroDeNegocio).mensagemParaCliente,
      );
    });
  });

  describe('renovarToken', () => {
    it('retorna novo JWT com refreshToken válido', async () => {
      const payload = { sub: 'uuid-1', email: 'vini@teste.com' };
      const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
        expiresIn: '7d',
      });

      const resultado = await servico.renovarToken(refreshToken);

      expect(resultado.token).toBeDefined();
      expect(resultado.expiresIn).toBe(86400);
      // Verifica que o novo token é um JWT válido
      const decodificado = jwt.verify(resultado.token, process.env.JWT_SECRET!) as { sub: string; email: string };
      expect(decodificado.sub).toBe('uuid-1');
    });

    it('lança ErroDeNegocio com TOKEN_EXPIRED ao usar refreshToken expirado', async () => {
      const payload = { sub: 'uuid-1', email: 'vini@teste.com' };
      const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
        expiresIn: '-1s',
      });

      await expect(servico.renovarToken(refreshToken)).rejects.toMatchObject({
        code: 'TOKEN_EXPIRED',
      });
    });

    it('lança ErroDeNegocio com INVALID_TOKEN ao usar refreshToken inválido', async () => {
      await expect(servico.renovarToken('token.invalido.aqui')).rejects.toMatchObject({
        code: 'INVALID_TOKEN',
      });
    });

    it('lança ErroDeNegocio com INVALID_TOKEN ao usar refreshToken adulterado', async () => {
      const payload = { sub: 'uuid-1', email: 'vini@teste.com' };
      const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
        expiresIn: '7d',
      });
      const tokenAdulterado = refreshToken.slice(0, -5) + 'XXXXX';

      await expect(servico.renovarToken(tokenAdulterado)).rejects.toMatchObject({
        code: 'INVALID_TOKEN',
      });
    });
  });
});
