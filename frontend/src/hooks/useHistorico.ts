import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { listar, remover } from '../api/apiDeHistorico';
import { ItemDeHistorico } from '../tipos';

const CHAVE_QUERY_HISTORICO = ['historico'] as const;

export function useHistorico() {
  const queryClient = useQueryClient();
  const [erroDeRemocao, setErroDeRemocao] = useState<string | null>(null);

  const { data: itens = [], isPending } = useQuery<ItemDeHistorico[], Error>({
    queryKey: CHAVE_QUERY_HISTORICO,
    queryFn: listar,
    refetchOnWindowFocus: false,
  });

  const { mutate: removerItem } = useMutation({
    mutationFn: remover,

    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: CHAVE_QUERY_HISTORICO });
      const itensAnteriores = queryClient.getQueryData<ItemDeHistorico[]>(CHAVE_QUERY_HISTORICO);
      queryClient.setQueryData<ItemDeHistorico[]>(CHAVE_QUERY_HISTORICO, (anteriores) =>
        (anteriores ?? []).filter((item) => item.id !== id),
      );
      return { itensAnteriores };
    },

    onError: (_erro, _id, contexto) => {
      if (contexto?.itensAnteriores !== undefined) {
        queryClient.setQueryData(CHAVE_QUERY_HISTORICO, contexto.itensAnteriores);
      }
      setErroDeRemocao('Não foi possível remover o item. Tente novamente.');
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CHAVE_QUERY_HISTORICO });
    },
  });

  return {
    itens,
    isPending,
    removerItem,
    erroDeRemocao,
    limparErroDeRemocao: () => setErroDeRemocao(null),
  };
}
