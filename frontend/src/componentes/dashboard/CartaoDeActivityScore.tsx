import { SCORE_LIMIAR_BAIXO, SCORE_LIMIAR_MEDIO } from '../../utilitarios/constantes';
import { formatarScore } from '../../utilitarios/formatadores';

interface PropsDoCartaoDeActivityScore {
  score: number | null;
  username: string;
}

function corDoScore(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score < SCORE_LIMIAR_BAIXO) return 'text-red-400';
  if (score < SCORE_LIMIAR_MEDIO) return 'text-yellow-400';
  return 'text-green-400';
}

function rotuloDoScore(score: number | null): string {
  if (score === null) return 'Indisponível';
  if (score < SCORE_LIMIAR_BAIXO) return 'Baixo';
  if (score < SCORE_LIMIAR_MEDIO) return 'Médio';
  return 'Alto';
}

export function CartaoDeActivityScore({ score, username }: PropsDoCartaoDeActivityScore) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-4">
      <p className="text-sm text-gray-400">Activity Score de @{username}</p>
      <p className={`text-6xl font-bold ${corDoScore(score)}`}>{formatarScore(score)}</p>
      <span className={`text-sm font-medium ${corDoScore(score)}`}>{rotuloDoScore(score)}</span>
    </div>
  );
}
