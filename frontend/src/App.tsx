import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { Header } from './componentes/layout/Header';
import { Roteador } from './roteador';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function ConteudoDaApp() {
  const hidratarDoLocalStorage = useAuthStore((s) => s.hidratarDoLocalStorage);

  useEffect(() => {
    hidratarDoLocalStorage();
  }, [hidratarDoLocalStorage]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <Roteador />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConteudoDaApp />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
