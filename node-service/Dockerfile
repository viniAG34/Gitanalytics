# Stage dev — ambiente completo para desenvolvimento local e testes
FROM node:20-alpine AS dev
RUN apk add --no-cache curl openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
RUN npx prisma generate
COPY tsconfig.json ./
COPY .eslintrc.json ./
COPY jest.config.ts ./
COPY src ./src/
COPY tests ./tests/
RUN npm run build
EXPOSE 3000
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/server.js"]

# Stage deps-prod — dependências de produção
FROM node:20-alpine AS deps-prod
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev && npx prisma generate

# Stage builder — build TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY prisma ./prisma/
RUN npx prisma generate
COPY src ./src/
RUN npm run build

# Stage runner — imagem de produção minimal
FROM node:20-alpine AS runner
RUN apk add --no-cache curl openssl
WORKDIR /app
COPY --from=deps-prod --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --chown=node:node prisma ./prisma/
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --retries=3 CMD curl -f http://localhost:3000/health || exit 1
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/server.js"]
