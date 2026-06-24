// Funções puras de formatação — SDD-04, seção 2

export function formatarData(isoString: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

export function formatarScore(score: number | null): string {
  if (score === null) return '—';
  return score.toFixed(1);
}

export function formatarNumero(valor: number): string {
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(1)}k`;
  return String(valor);
}

export function formatarDataRelativa(isoString: string): string {
  const agora = Date.now();
  const data = new Date(isoString).getTime();
  const diasPassados = Math.floor((agora - data) / (1000 * 60 * 60 * 24));
  if (diasPassados === 0) return 'hoje';
  if (diasPassados === 1) return 'ontem';
  if (diasPassados < 30) return `há ${diasPassados} dias`;
  if (diasPassados < 365) return `há ${Math.floor(diasPassados / 30)} meses`;
  return `há ${Math.floor(diasPassados / 365)} anos`;
}
