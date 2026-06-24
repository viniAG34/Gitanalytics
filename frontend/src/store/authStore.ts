import { create } from 'zustand';
import { Usuario, TokensDeAutenticacao } from '../tipos';
import {
  CHAVE_TOKEN_LOCAL_STORAGE,
  CHAVE_REFRESH_TOKEN_LOCAL_STORAGE,
  CHAVE_USUARIO_LOCAL_STORAGE,
} from '../utilitarios/constantes';

interface EstadoDeAuth {
  usuario: Usuario | null;
  token: string | null;
  estaAutenticado: boolean;
  login: (tokens: TokensDeAutenticacao, usuario: Usuario) => void;
  logout: () => void;
  hidratarDoLocalStorage: () => void;
  atualizarToken: (novoToken: string) => void;
}

export const useAuthStore = create<EstadoDeAuth>((set) => ({
  usuario: null,
  token: null,
  estaAutenticado: false,

  login: (tokens: TokensDeAutenticacao, usuario: Usuario) => {
    localStorage.setItem(CHAVE_TOKEN_LOCAL_STORAGE, tokens.token);
    localStorage.setItem(CHAVE_REFRESH_TOKEN_LOCAL_STORAGE, tokens.refreshToken);
    localStorage.setItem(CHAVE_USUARIO_LOCAL_STORAGE, JSON.stringify(usuario));
    set({ token: tokens.token, usuario, estaAutenticado: true });
  },

  logout: () => {
    localStorage.removeItem(CHAVE_TOKEN_LOCAL_STORAGE);
    localStorage.removeItem(CHAVE_REFRESH_TOKEN_LOCAL_STORAGE);
    localStorage.removeItem(CHAVE_USUARIO_LOCAL_STORAGE);
    set({ token: null, usuario: null, estaAutenticado: false });
  },

  hidratarDoLocalStorage: () => {
    const token = localStorage.getItem(CHAVE_TOKEN_LOCAL_STORAGE);
    const usuarioJson = localStorage.getItem(CHAVE_USUARIO_LOCAL_STORAGE);
    if (token && usuarioJson) {
      try {
        const usuario = JSON.parse(usuarioJson) as Usuario;
        set({ token, usuario, estaAutenticado: true });
      } catch {
        localStorage.removeItem(CHAVE_TOKEN_LOCAL_STORAGE);
        localStorage.removeItem(CHAVE_USUARIO_LOCAL_STORAGE);
      }
    }
  },

  atualizarToken: (novoToken: string) => {
    localStorage.setItem(CHAVE_TOKEN_LOCAL_STORAGE, novoToken);
    set({ token: novoToken });
  },
}));
