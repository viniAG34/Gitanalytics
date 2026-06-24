import { ResumoDeRepositorio } from '../../tipos';
import { formatarDataRelativa, formatarNumero } from '../../utilitarios/formatadores';

interface PropsDaTabelaDeRepositorios {
  repositorios: ResumoDeRepositorio[];
}

export function TabelaDeRepositorios({ repositorios }: PropsDaTabelaDeRepositorios) {
  const topRepos = repositorios.slice(0, 10).sort((a, b) => b.estrelas - a.estrelas);

  if (topRepos.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum repositório público encontrado.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
            <th className="pb-2 font-medium">Repositório</th>
            <th className="pb-2 font-medium">Linguagem</th>
            <th className="pb-2 text-right font-medium">⭐</th>
            <th className="pb-2 text-right font-medium">Forks</th>
            <th className="pb-2 text-right font-medium">Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {topRepos.map((repo) => (
            <tr key={repo.nome} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="py-2 pr-4 font-medium text-indigo-400">{repo.nome}</td>
              <td className="py-2 pr-4 text-gray-400">{repo.linguagem ?? '—'}</td>
              <td className="py-2 text-right text-gray-300">{formatarNumero(repo.estrelas)}</td>
              <td className="py-2 text-right text-gray-300">{formatarNumero(repo.forks)}</td>
              <td className="py-2 text-right text-gray-500">{formatarDataRelativa(repo.atualizadoEm)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
