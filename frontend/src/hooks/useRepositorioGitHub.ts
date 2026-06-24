import { useQuery } from '@tanstack/react-query';
import { buscarRepositorio } from '../api/apiDoGitHub';
import { RespostaDeBuscaDeRepositorio } from '../tipos';
import { STALE_TIME_BUSCA_GITHUB_EM_MS } from '../utilitarios/constantes';

export function useRepositorioGitHub(owner: string, repo: string) {
  return useQuery<RespostaDeBuscaDeRepositorio, Error>({
    queryKey: ['github', 'repo', owner, repo],
    queryFn: () => buscarRepositorio(owner, repo),
    staleTime: STALE_TIME_BUSCA_GITHUB_EM_MS,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: owner.length > 0 && repo.length > 0,
  });
}
