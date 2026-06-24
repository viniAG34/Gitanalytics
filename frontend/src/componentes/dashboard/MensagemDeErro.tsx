import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

interface PropsDaMensagemDeErro {
  titulo: string;
  descricao: string;
  podeRetentar?: boolean;
  aoRetentar?: () => void;
}

export function MensagemDeErro({ titulo, descricao, podeRetentar = false, aoRetentar }: PropsDaMensagemDeErro) {
  const navegar = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <svg className="h-12 w-12 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <div>
        <h2 className="text-lg font-semibold text-white">{titulo}</h2>
        <p className="mt-1 text-sm text-gray-400">{descricao}</p>
      </div>
      <div className="flex gap-3">
        <Button variante="secundario" onClick={() => navegar(-1)}>
          Voltar
        </Button>
        {podeRetentar && aoRetentar && (
          <Button variante="primario" onClick={aoRetentar}>
            Tentar novamente
          </Button>
        )}
      </div>
    </div>
  );
}
