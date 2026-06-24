# Stage 1 — builder React
FROM node:20-alpine AS builder
ARG VITE_API_BASE_URL
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2 — servidor nginx com build estático
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
