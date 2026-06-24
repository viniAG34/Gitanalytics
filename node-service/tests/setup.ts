// Variáveis de ambiente mínimas para os testes unitários
// (sem conexão real a banco ou Redis)
process.env.JWT_SECRET = 'a'.repeat(64);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.NODE_ENV = 'test';
