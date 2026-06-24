import { RespostaDeBuscaDeUsuario } from '../../tipos';
import { Card } from '../ui/Card';
import { GraficoDeLinguagens } from '../graficos/GraficoDeLinguagens';
import { AvisoDeAnaliseIndisponivel } from './AvisoDeAnaliseIndisponivel';
import { CartaoDeActivityScore } from './CartaoDeActivityScore';
import { GridDeEstatisticas } from './GridDeEstatisticas';
import { ListaDeInsights } from './ListaDeInsights';
import { TabelaDeRepositorios } from './TabelaDeRepositorios';

interface PropsDoUserDashboard {
  dados: RespostaDeBuscaDeUsuario;
}

export function UserDashboard({ dados }: PropsDoUserDashboard) {
  const { perfil, analise, analysisAvailable } = dados;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">@{perfil.username}</h1>
        {dados.cacheadoEm && (
          <span className="text-xs text-gray-500">Cache</span>
        )}
      </div>

      {!analysisAvailable && <AvisoDeAnaliseIndisponivel />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CartaoDeActivityScore score={analise?.activityScore ?? null} username={perfil.username} />
        </Card>

        {analise && analise.topLinguagens.length > 0 && (
          <Card className="lg:col-span-2">
            <h2 className="mb-4 text-sm font-medium text-gray-400">Linguagens</h2>
            <GraficoDeLinguagens linguagens={analise.topLinguagens} />
          </Card>
        )}
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-400">Estatísticas</h2>
        <GridDeEstatisticas perfil={perfil} analise={analise} />
      </Card>

      {analise && analise.insights.length > 0 && (
        <Card>
          <h2 className="mb-4 text-sm font-medium text-gray-400">Insights</h2>
          <ListaDeInsights insights={analise.insights} />
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-400">Repositórios</h2>
        <TabelaDeRepositorios repositorios={perfil.repositorios} />
      </Card>
    </div>
  );
}
