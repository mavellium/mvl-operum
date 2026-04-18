FROM node:22-alpine AS deps
# Instala o pnpm globalmente dentro do Docker
RUN npm install -g pnpm
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
# Instala usando pnpm para manter os links simbólicos corretos
RUN pnpm install --no-frozen-lockfile

FROM node:22-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Com pnpm, o prisma generate já sabe onde estão os arquivos reais
RUN pnpm prisma generate
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

USER nestjs
EXPOSE 4004
CMD ["node", "dist/main"]