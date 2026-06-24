interface PropsDeSkeleton {
  className?: string;
}

export function Skeleton({ className = '' }: PropsDeSkeleton) {
  return (
    <div className={`animate-pulse rounded-md bg-gray-800 ${className}`} />
  );
}

export function SkeletonDeCard({ className = '' }: PropsDeSkeleton) {
  return (
    <div className={`rounded-xl border border-gray-800 bg-gray-900 p-4 ${className}`}>
      <Skeleton className="mb-3 h-4 w-1/3" />
      <Skeleton className="mb-2 h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonDePerfil() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
