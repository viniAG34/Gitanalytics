import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fazerLogin, registrar } from '../api/apiDeAutenticacao';
import { useAuthStore } from '../store/authStore';
import { extrairMensagemDeErro } from '../api/cliente';

interface DadosDeFormulario {
  nome?: string;
  email: string;
  senha: string;
}

export function useAutenticacao() {
  const { login, logout, estaAutenticado, usuario, token } = useAuthStore();
  const navegar = useNavigate();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(dados: DadosDeFormulario): Promise<void> {
    setCarregando(true);
    setErro(null);
    try {
      const { usuario: usuarioRetornado, tokens } = await fazerLogin({
        email: dados.email,
        senha: dados.senha,
      });
      login(tokens, usuarioRetornado);
      navegar('/');
    } catch (e) {
      setErro(extrairMensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  async function cadastrar(dados: DadosDeFormulario): Promise<void> {
    setCarregando(true);
    setErro(null);
    try {
      const { usuario: usuarioRetornado, tokens } = await registrar({
        nome: dados.nome ?? '',
        email: dados.email,
        senha: dados.senha,
      });
      login(tokens, usuarioRetornado);
      navegar('/');
    } catch (e) {
      setErro(extrairMensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  function sair(): void {
    logout();
    navegar('/login');
  }

  return { entrar, cadastrar, sair, carregando, erro, estaAutenticado, usuario, token };
}
