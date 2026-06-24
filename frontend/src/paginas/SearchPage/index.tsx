import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../componentes/ui/Button';
import { PageWrapper } from '../../componentes/layout/PageWrapper';

function detectarModo(valor: string): 'usuario' | 'repositorio' | 'invalido' | 'vazio' {
  if (valor.trim() === '') return 'vazio';
  const barras = (valor.match(/\//g) ?? []).length;
  if (barras === 0) return 'usuario';
  if (barras === 1) return 'repositorio';
  return 'invalido';
}

export function SearchPage() {
  const [valor, setValor] = useState('');
  const navegar = useNavigate();

  useEffect(() => {
    document.title = 'Buscar — GitAnalytics';
  }, []);

  const modo = detectarModo(valor);

  function aoSubmeter(e: FormEvent) {
    e.preventDefault();
    if (modo === 'usuario') {
      navegar(`/user/${valor.trim()}`);
    } else if (modo === 'repositorio') {
      const [owner, repo] = valor.trim().split('/');
      navegar(`/repo/${owner}/${repo}`);
    }
  }

  return (
    <PageWrapper className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-lg text-center">
        <h1 className="mb-2 text-3xl font-bold text-white">Analisar perfil GitHub</h1>
        <p className="mb-8 text-gray-400">
          Digite um usuário (<code className="text-indigo-300">torvalds</code>) ou repositório (
          <code className="text-indigo-300">facebook/react</code>)
        </p>

        <form onSubmit={aoSubmeter} className="flex flex-col gap-3">
          <input
            type="text"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="usuario ou owner/repositorio"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />

          {modo === 'invalido' && (
            <p className="text-sm text-yellow-400">Use o formato usuario/repositorio (apenas uma barra)</p>
          )}

          {modo !== 'vazio' && modo !== 'invalido' && (
            <p className="text-xs text-gray-500">
              Modo: <span className="text-indigo-400">{modo === 'usuario' ? 'Perfil de usuário' : 'Repositório'}</span>
            </p>
          )}

          <Button
            type="submit"
            variante="primario"
            desabilitado={modo === 'vazio' || modo === 'invalido'}
            className="w-full"
          >
            Analisar
          </Button>
        </form>
      </div>
    </PageWrapper>
  );
}
