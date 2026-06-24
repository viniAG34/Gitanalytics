import { useQuery } from '@tanstack/react-query';
import { buscarUsuario } from '../api/apiDoGitHub';
import { RespostaDeBuscaDeUsuario } from '../tipos';
import { STALE_TIME_BUSCA_GITHUB_EM_MS } from '../utilitarios/constantes';

export function useUsuarioGitHub(username: string) {
  return useQuery<RespostaDeBuscaDeUsuario, Error>({
    queryKey: ['github', 'user', username],
    queryFn: () => buscarUsuario(username),
    staleTime: STALE_TIME_BUSCA_GITHUB_EM_MS,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: username.length > 0,
  });
}
