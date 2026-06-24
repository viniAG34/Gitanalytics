import { Skeleton, SkeletonDeCard, SkeletonDePerfil } from '../ui/Skeleton';

export function IndicadorDeCarregamentoDePerfil() {
  return (
    <div className="space-y-6">
      <SkeletonDePerfil />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonDeCard />
        <SkeletonDeCard />
        <SkeletonDeCard />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function IndicadorDeCarregamentoDeRepositorio() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonDeCard />
        <SkeletonDeCard />
        <SkeletonDeCard />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
