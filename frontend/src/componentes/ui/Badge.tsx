import React from 'react';

type VarianteBadge = 'sucesso' | 'aviso' | 'erro' | 'info' | 'neutro';

interface PropsDoBadge {
  children: React.ReactNode;
  variante?: VarianteBadge;
  className?: string;
}

const estilosPorVariante: Record<VarianteBadge, string> = {
  sucesso: 'bg-green-900/50 text-green-400 border-green-800',
  aviso: 'bg-yellow-900/50 text-yellow-400 border-yellow-800',
  erro: 'bg-red-900/50 text-red-400 border-red-800',
  info: 'bg-blue-900/50 text-blue-400 border-blue-800',
  neutro: 'bg-gray-800 text-gray-400 border-gray-700',
};

export function Badge({ children, variante = 'neutro', className = '' }: PropsDoBadge) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${estilosPorVariante[variante]} ${className}`}
    >
      {children}
    </span>
  );
}
