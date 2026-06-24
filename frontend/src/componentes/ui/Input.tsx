import React from 'react';

interface PropsDoInput extends React.InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  erro?: string;
}

export const Input = React.forwardRef<HTMLInputElement, PropsDoInput>(
  ({ rotulo, erro, className = '', ...resto }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-300">{rotulo}</label>
        <input
          ref={ref}
          className={`rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            erro ? 'border-red-500' : 'border-gray-700 focus:border-indigo-500'
          } ${className}`}
          {...resto}
        />
        {erro && <p className="text-xs text-red-400">{erro}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
