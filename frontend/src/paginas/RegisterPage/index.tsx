import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate } from 'react-router-dom';
import { z } from 'zod';
import { useAutenticacao } from '../../hooks/useAutenticacao';
import { Button } from '../../componentes/ui/Button';
import { Input } from '../../componentes/ui/Input';

const esquemaDeCadastro = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
});

type CamposDeCadastro = z.infer<typeof esquemaDeCadastro>;

export function RegisterPage() {
  const { cadastrar, carregando, erro, estaAutenticado } = useAutenticacao();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CamposDeCadastro>({ resolver: zodResolver(esquemaDeCadastro) });

  useEffect(() => {
    document.title = 'Cadastro — GitAnalytics';
  }, []);

  if (estaAutenticado) return <Navigate to="/" replace />;

  async function aoSubmeter(dados: CamposDeCadastro) {
    await cadastrar(dados);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">GitAnalytics</h1>
          <p className="mt-1 text-sm text-gray-400">Crie sua conta</p>
        </div>

        {erro && (
          <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-4">
          <Input rotulo="Nome" type="text" placeholder="Seu nome" erro={errors.nome?.message} {...register('nome')} />
          <Input rotulo="Email" type="email" placeholder="seu@email.com" erro={errors.email?.message} {...register('email')} />
          <Input rotulo="Senha" type="password" placeholder="Mín. 8 chars, 1 maiúscula, 1 número" erro={errors.senha?.message} {...register('senha')} />
          <Button type="submit" variante="primario" carregando={carregando} className="w-full">
            Cadastrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Já tem conta?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
