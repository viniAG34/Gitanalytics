import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  useEffect(() => {
    document.title = 'Página não encontrada — GitAnalytics';
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950 text-center">
      <p className="text-7xl font-bold text-indigo-600">404</p>
      <h1 className="text-2xl font-semibold text-white">Página não encontrada</h1>
      <p className="text-gray-400">A página que você procura não existe ou foi removida.</p>
      <Link
        to="/"
        className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
