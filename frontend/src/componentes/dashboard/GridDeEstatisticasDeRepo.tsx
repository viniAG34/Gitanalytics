import { AnaliseDeRepositorio, DadosBrutosDeRepositorio } from '../../tipos';
import { formatarNumero } from '../../utilitarios/formatadores';

interface PropsDoGridDeEstatisticasDeRepo {
  dados: DadosBrutosDeRepositorio;
  analise: AnaliseDeRepositorio | null;
}

interface ItemDeEstatistica {
  rotulo: string;
  valor: string;
}

export function GridDeEstatisticasDeRepo({ dados, analise }: PropsDoGridDeEstatisticasDeRepo) {
  const estatisticas: ItemDeEstatistica[] = [
    { rotulo: 'Estrelas', valor: formatarNumero(dados.estrelas) },
    { rotulo: 'Forks', valor: formatarNumero(dados.forks) },
    { rotulo: 'Issues abertas', valor: String(dados.issuesAbertas) },
    { rotulo: 'Linguagem', valor: dados.linguagem ?? '—' },
    { rotulo: 'Média commits/semana', valor: analise ? analise.mediaDeCommitsPorSemana.toFixed(1) : '—' },
    { rotulo: 'Dias desde atualização', valor: analise ? String(analise.diasDesdeUltimaAtualizacao) : '—' },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {estatisticas.map((item) => (
        <div key={item.rotulo} className="rounded-lg bg-gray-800/50 px-3 py-2">
          <dt className="text-xs text-gray-500">{item.rotulo}</dt>
          <dd className="mt-0.5 truncate text-sm font-semibold text-white">{item.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
