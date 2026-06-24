import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useAutenticacao } from '../../hooks/useAutenticacao';
import { Button } from '../../componentes/ui/Button';
import { Input } from '../../componentes/ui/Input';
import { MOTIVO_SESSAO_EXPIRADA } from '../../utilitarios/constantes';

const esquemaDeLogin = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
});

type CamposDeLogin = z.infer<typeof esquemaDeLogin>;

export function LoginPage() {
  const { entrar, carregando, erro, estaAutenticado } = useAutenticacao();
  const [searchParams] = useSearchParams();
  const motivoDeLogout = searchParams.get('motivo');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CamposDeLogin>({ resolver: zodResolver(esquemaDeLogin) });

  useEffect(() => {
    document.title = 'Login — GitAnalytics';
  }, []);

  if (estaAutenticado) return <Navigate to="/" replace />;

  async function aoSubmeter(dados: CamposDeLogin) {
    await entrar(dados);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">GitAnalytics</h1>
          <p className="mt-1 text-sm text-gray-400">Faça login para continuar</p>
        </div>

        {motivoDeLogout === MOTIVO_SESSAO_EXPIRADA && (
          <div className="mb-4 rounded-lg border border-yellow-800 bg-yellow-900/20 p-3 text-sm text-yellow-300">
            Sessão expirada, faça login novamente.
          </div>
        )}

        {erro && (
          <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-4">
          <Input rotulo="Email" type="email" placeholder="seu@email.com" erro={errors.email?.message} {...register('email')} />
          <Input rotulo="Senha" type="password" placeholder="••••••••" erro={errors.senha?.message} {...register('senha')} />
          <Button type="submit" variante="primario" carregando={carregando} className="w-full">
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Não tem conta?{' '}
          <Link to="/cadastro" className="text-indigo-400 hover:text-indigo-300">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
