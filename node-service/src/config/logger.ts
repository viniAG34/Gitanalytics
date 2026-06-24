import winston from 'winston';

const formatadorDeDesenvolvimento = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.simple(),
);

const formatadorDeProducao = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format:
    process.env.NODE_ENV === 'production'
      ? formatadorDeProducao
      : formatadorDeDesenvolvimento,
  transports: [new winston.transports.Console()],
});

export default logger;
