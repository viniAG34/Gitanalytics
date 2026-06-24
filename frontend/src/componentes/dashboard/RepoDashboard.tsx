import { RespostaDeBuscaDeRepositorio } from '../../tipos';
import { Card } from '../ui/Card';
import { GraficoDeCommits } from '../graficos/GraficoDeCommits';
import { AvisoDeAnaliseIndisponivel } from './AvisoDeAnaliseIndisponivel';
import { BadgeDeTendencia } from './BadgeDeTendencia';
import { CartaoDeHealthScore } from './CartaoDeHealthScore';
import { GridDeEstatisticasDeRepo } from './GridDeEstatisticasDeRepo';
import { ListaDeInsights } from './ListaDeInsights';

interface PropsDoRepoDashboard {
  dados: RespostaDeBuscaDeRepositorio;
}

export function RepoDashboard({ dados }: PropsDoRepoDashboard) {
  const { dados: dadosBrutos, analise, analysisAvailable } = dados;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">
          {dadosBrutos.owner}/{dadosBrutos.repo}
        </h1>
        <div className="flex items-center gap-3">
          {analise && <BadgeDeTendencia tendencia={analise.tendenciaDeAtividade} />}
          {dados.cacheadoEm && <span className="text-xs text-gray-500">Cache</span>}
        </div>
      </div>

      {!analysisAvailable && <AvisoDeAnaliseIndisponivel />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CartaoDeHealthScore score={analise?.healthScore ?? null} repo={`${dadosBrutos.owner}/${dadosBrutos.repo}`} />
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-medium text-gray-400">Atividade de commits</h2>
          <GraficoDeCommits commitsPorSemana={dadosBrutos.commitsPorSemana} />
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-400">Estatísticas</h2>
        <GridDeEstatisticasDeRepo dados={dadosBrutos} analise={analise} />
      </Card>

      {analise && analise.insights.length > 0 && (
        <Card>
          <h2 className="mb-4 text-sm font-medium text-gray-400">Insights</h2>
          <ListaDeInsights insights={analise.insights} />
        </Card>
      )}
    </div>
  );
}
