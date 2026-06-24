import { AnaliseDeUsuario, PerfilDeUsuarioGitHub } from '../../tipos';
import { formatarNumero } from '../../utilitarios/formatadores';

interface PropsDoGridDeEstatisticas {
  perfil: PerfilDeUsuarioGitHub;
  analise: AnaliseDeUsuario | null;
}

interface ItemDeEstatistica {
  rotulo: string;
  valor: string;
}

export function GridDeEstatisticas({ perfil, analise }: PropsDoGridDeEstatisticas) {
  const estatisticas: ItemDeEstatistica[] = [
    { rotulo: 'Repositórios públicos', valor: String(perfil.repositoriosPublicos) },
    { rotulo: 'Seguidores', valor: formatarNumero(perfil.seguidores) },
    { rotulo: 'Total de estrelas', valor: analise ? formatarNumero(analise.totalEstrelas) : '—' },
    { rotulo: 'Atualizados (30 dias)', valor: analise ? String(analise.repositoriosAtualizadosUltimos30Dias) : '—' },
    { rotulo: 'Repo mais estrelado', valor: analise?.repositorioMaisEstrelado ?? '—' },
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
