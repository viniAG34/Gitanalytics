import { useEffect } from 'react';

type TipoDeToast = 'sucesso' | 'erro' | 'aviso' | 'info';

interface PropsDoToast {
  mensagem: string;
  tipo?: TipoDeToast;
  aoFechar: () => void;
  duracaoEmMs?: number;
}

const estilosPorTipo: Record<TipoDeToast, string> = {
  sucesso: 'bg-green-900 border-green-700 text-green-300',
  erro: 'bg-red-900 border-red-700 text-red-300',
  aviso: 'bg-yellow-900 border-yellow-700 text-yellow-300',
  info: 'bg-blue-900 border-blue-700 text-blue-300',
};

const DURACAO_PADRAO_EM_MS = 4000;

export function Toast({ mensagem, tipo = 'info', aoFechar, duracaoEmMs = DURACAO_PADRAO_EM_MS }: PropsDoToast) {
  useEffect(() => {
    const timer = setTimeout(aoFechar, duracaoEmMs);
    return () => clearTimeout(timer);
  }, [aoFechar, duracaoEmMs]);

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg ${estilosPorTipo[tipo]}`}
      role="alert"
    >
      <p className="flex-1 text-sm">{mensagem}</p>
      <button onClick={aoFechar} className="shrink-0 opacity-70 hover:opacity-100">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
