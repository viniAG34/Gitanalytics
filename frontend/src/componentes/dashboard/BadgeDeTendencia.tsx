type TendenciaDeAtividade = 'crescente' | 'estavel' | 'decrescente';

interface PropsDoBadgeDeTendencia {
  tendencia: TendenciaDeAtividade;
}

const configuracaoPorTendencia: Record<
  TendenciaDeAtividade,
  { rotulo: string; estilo: string; icone: string }
> = {
  crescente: {
    rotulo: 'Crescente',
    estilo: 'bg-green-900/50 text-green-400 border-green-800',
    icone: '↑',
  },
  estavel: {
    rotulo: 'Estável',
    estilo: 'bg-blue-900/50 text-blue-400 border-blue-800',
    icone: '→',
  },
  decrescente: {
    rotulo: 'Decrescente',
    estilo: 'bg-red-900/50 text-red-400 border-red-800',
    icone: '↓',
  },
};

export function BadgeDeTendencia({ tendencia }: PropsDoBadgeDeTendencia) {
  const { rotulo, estilo, icone } = configuracaoPorTendencia[tendencia];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium ${estilo}`}>
      <span>{icone}</span>
      {rotulo}
    </span>
  );
}
