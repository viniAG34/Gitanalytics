import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface PropsDoGraficoDeLinguagens {
  linguagens: { linguagem: string; percentual: number }[];
}

const PALETA_DE_CORES = [
  '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444',
];

export function GraficoDeLinguagens({ linguagens }: PropsDoGraficoDeLinguagens) {
  if (linguagens.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-500">
        Nenhuma linguagem detectada.
      </div>
    );
  }

  const dados = linguagens.map((item) => ({
    name: item.linguagem,
    value: item.percentual,
  }));

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="50%" height={160}>
        <PieChart>
          <Pie data={dados} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
            {dados.map((_, index) => (
              <Cell key={index} fill={PALETA_DE_CORES[index % PALETA_DE_CORES.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(valor: number) => `${valor.toFixed(1)}%`} contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} labelStyle={{ color: '#f9fafb' }} itemStyle={{ color: '#d1d5db' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-1 flex-col gap-1.5">
        {dados.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: PALETA_DE_CORES[index % PALETA_DE_CORES.length] }}
            />
            <span className="flex-1 truncate text-gray-300">{item.name}</span>
            <span className="text-gray-500">{item.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
