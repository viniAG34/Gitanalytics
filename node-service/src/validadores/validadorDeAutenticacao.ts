import { z } from 'zod';

// SDD-02, spec 0.1 — validação de registro
export const esquemaDeRegistro = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres.').max(100, 'Nome deve ter no máximo 100 caracteres.'),
  email: z.string().email('Formato de email inválido.'),
  senha: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres.')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula.')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número.'),
});

// SDD-02, spec 0.2 — validação de login
export const esquemaDeLogin = z.object({
  email: z.string().email('Formato de email inválido.'),
  senha: z.string().min(1, 'Senha é obrigatória.'),
});

// SDD-02, spec 0.3 — validação de refresh
export const esquemaDeRefresh = z.object({
  refreshToken: z.string().min(1, 'refreshToken é obrigatório.'),
});

export type DadosDeRegistro = z.infer<typeof esquemaDeRegistro>;
export type DadosDeLogin = z.infer<typeof esquemaDeLogin>;
export type DadosDeRefresh = z.infer<typeof esquemaDeRefresh>;
