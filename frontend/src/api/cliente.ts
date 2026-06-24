import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import {
  CHAVE_REFRESH_TOKEN_LOCAL_STORAGE,
  MOTIVO_SESSAO_EXPIRADA,
  URL_BASE_DA_API,
} from '../utilitarios/constantes';
import { ErroDeApi, RespostaDaApi } from '../tipos';

// Extensão da config para rastrear tentativa de refresh — SDD-04, seção 3
interface ConfigExtendida extends InternalAxiosRequestConfig {
  _jaTemouRefresh?: boolean;
}

export const cliente = axios.create({
  baseURL: URL_BASE_DA_API,
});

// Interceptor de request: injeta token JWT — SDD-04, seção 3
cliente.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de response: refresh transparente — SDD-04, seção 3
cliente.interceptors.response.use(
  (resposta) => resposta,
  async (erro: AxiosError<ErroDeApi>) => {
    const config = erro.config as ConfigExtendida | undefined;
    const codigoDeErro = erro.response?.data?.error?.code;
    const status = erro.response?.status;

    const ehErroDeTokenExpirado =
      status === 401 && codigoDeErro === 'TOKEN_EXPIRED' && !config?._jaTemouRefresh;

    if (!ehErroDeTokenExpirado || !config) {
      return Promise.reject(erro);
    }

    config._jaTemouRefresh = true;

    const refreshToken = localStorage.getItem(CHAVE_REFRESH_TOKEN_LOCAL_STORAGE);

    if (!refreshToken) {
      useAuthStore.getState().logout();
      window.location.href = `/login?motivo=${MOTIVO_SESSAO_EXPIRADA}`;
      return Promise.reject(erro);
    }

    try {
      const respostaDeRefresh = await axios.post<RespostaDaApi<{ token: string; expiresIn: number }>>(
        `${URL_BASE_DA_API}/auth/refresh`,
        { refreshToken },
      );

      const novoToken = respostaDeRefresh.data.data.token;
      useAuthStore.getState().atualizarToken(novoToken);
      config.headers['Authorization'] = `Bearer ${novoToken}`;

      return cliente(config);
    } catch {
      useAuthStore.getState().logout();
      window.location.href = `/login?motivo=${MOTIVO_SESSAO_EXPIRADA}`;
      return Promise.reject(erro);
    }
  },
);

export function extrairMensagemDeErro(erro: unknown): string {
  if (axios.isAxiosError(erro)) {
    const dados = erro.response?.data as ErroDeApi | undefined;
    if (dados?.error?.message) return dados.error.message;
    if (erro.message === 'Network Error') return 'Não foi possível conectar ao servidor.';
  }
  return 'Ocorreu um erro inesperado.';
}

export function extrairCodigoDeErro(erro: unknown): string | null {
  if (axios.isAxiosError(erro)) {
    const dados = erro.response?.data as ErroDeApi | undefined;
    return dados?.error?.code ?? null;
  }
  return null;
}
