import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatarData } from '../../utilitarios/formatadores';

interface PropsDoGraficoDeCommits {
  commitsPorSemana: { semana: string; total: number }[];
}

export function GraficoDeCommits({ commitsPorSemana }: PropsDoGraficoDeCommits) {
  if (commitsPorSemana.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-500">
        Sem dados de atividade recente.
      </div>
    );
  }

  const dados = commitsPorSemana.map((item) => ({
    semana: formatarData(item.semana).split(',')[0],
    total: item.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={dados} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradienteCommits" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
          labelStyle={{ color: '#f9fafb' }}
          itemStyle={{ color: '#d1d5db' }}
          formatter={(valor: number) => [valor, 'commits']}
        />
        <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fill="url(#gradienteCommits)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
