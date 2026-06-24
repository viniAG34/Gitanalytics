import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '../../componentes/layout/PageWrapper';
import { Card } from '../../componentes/ui/Card';
import { Toast } from '../../componentes/ui/Toast';
import { Skeleton } from '../../componentes/ui/Skeleton';
import { useHistorico } from '../../hooks/useHistorico';
import { formatarDataRelativa, formatarScore } from '../../utilitarios/formatadores';
import { MENSAGEM_HISTORICO_VAZIO } from '../../utilitarios/constantes';

export function HistoryPage() {
  const navegar = useNavigate();
  const { itens, isPending, removerItem, erroDeRemocao, limparErroDeRemocao } = useHistorico();

  useEffect(() => {
    document.title = 'Histórico — GitAnalytics';
  }, []);

  function aoClicarNoItem(tipoDeBusca: string, valorBuscado: string) {
    if (tipoDeBusca === 'usuario') {
      navegar(`/user/${valorBuscado}`);
    } else {
      const [owner, repo] = valorBuscado.split('/');
      navegar(`/repo/${owner}/${repo}`);
    }
  }

  return (
    <PageWrapper>
      <h1 className="mb-6 text-2xl font-bold text-white">Histórico de buscas</h1>

      {isPending ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <p className="text-gray-400">{MENSAGEM_HISTORICO_VAZIO}</p>
      ) : (
        <Card className="divide-y divide-gray-800 p-0">
          {itens.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-800/30">
              <span className="text-lg" title={item.tipoDeBusca === 'usuario' ? 'Usuário' : 'Repositório'}>
                {item.tipoDeBusca === 'usuario' ? '👤' : '📦'}
              </span>

              <button
                onClick={() => aoClicarNoItem(item.tipoDeBusca, item.valorBuscado)}
                className="flex-1 text-left"
              >
                <span className="font-medium text-indigo-400 hover:text-indigo-300">
                  {item.valorBuscado}
                </span>
              </button>

              <span className="text-sm font-medium text-gray-300">
                {formatarScore(item.score)}
              </span>

              <span className="text-xs text-gray-500">{formatarDataRelativa(item.realizadaEm)}</span>

              <button
                onClick={() => removerItem(item.id)}
                className="shrink-0 text-gray-600 hover:text-red-400 transition-colors"
                title="Remover"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </Card>
      )}

      {erroDeRemocao && (
        <Toast mensagem={erroDeRemocao} tipo="erro" aoFechar={limparErroDeRemocao} />
      )}
    </PageWrapper>
  );
}
