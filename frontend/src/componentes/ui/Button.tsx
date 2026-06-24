import React from 'react';

interface PropsDoButton {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variante?: 'primario' | 'secundario' | 'perigo';
  desabilitado?: boolean;
  carregando?: boolean;
  className?: string;
}

export function Button({
  children,
  onClick,
  type = 'button',
  variante = 'primario',
  desabilitado = false,
  carregando = false,
  className = '',
}: PropsDoButton) {
  const estilosBase =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const estilosPorVariante = {
    primario: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800',
    secundario: 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700',
    perigo: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={desabilitado || carregando}
      className={`${estilosBase} ${estilosPorVariante[variante]} ${className}`}
    >
      {carregando && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
