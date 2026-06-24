import { z } from 'zod';

const esquemaDeAmbiente = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  GITHUB_TOKEN: z.string().min(1).optional(),
  PYTHON_SERVICE_URL: z.string().min(1).default('http://python-service:8000'),
  CORS_ORIGIN: z.string().default('http://localhost'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  LOG_LEVEL: z.string().default('info'),
});

const resultado = esquemaDeAmbiente.safeParse(process.env);

if (!resultado.success) {
  console.error('Variáveis de ambiente ausentes ou inválidas:', resultado.error.format());
  process.exit(1);
}

export const env = resultado.data;
