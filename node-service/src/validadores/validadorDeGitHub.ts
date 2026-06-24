import { z } from 'zod';

// Regex para username válido do GitHub: letras, números e hífens (não inicia/termina com hífen)
// Referência: https://docs.github.com/en/get-started/using-github/github-glossary#username
const REGEX_USERNAME_GITHUB = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$|^[a-zA-Z0-9]$/;

// Regex para nome de repositório: letras, números, hífens, underscores e pontos
const REGEX_NOME_REPOSITORIO = /^[a-zA-Z0-9._-]+$/;

// SDD-02, spec 0.4 — validação do parâmetro username
export const esquemaDeParametrosDeUsuario = z.object({
  username: z
    .string()
    .min(1, 'username é obrigatório.')
    .max(39, 'username excede o limite de 39 caracteres.')
    .regex(REGEX_USERNAME_GITHUB, 'username contém caracteres inválidos.'),
});

// SDD-02, spec 0.5 — validação dos parâmetros owner e repo
export const esquemaDeParametrosDeRepositorio = z.object({
  owner: z
    .string()
    .min(1, 'owner é obrigatório.')
    .max(39, 'owner excede o limite de 39 caracteres.')
    .regex(REGEX_USERNAME_GITHUB, 'owner contém caracteres inválidos.'),
  repo: z
    .string()
    .min(1, 'repo é obrigatório.')
    .max(100, 'repo excede o limite de 100 caracteres.')
    .regex(REGEX_NOME_REPOSITORIO, 'repo contém caracteres inválidos.'),
});

export type ParametrosDeUsuario = z.infer<typeof esquemaDeParametrosDeUsuario>;
export type ParametrosDeRepositorio = z.infer<typeof esquemaDeParametrosDeRepositorio>;
