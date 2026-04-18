# ── Stage 1: Deps ────────────────────────────────────────
FROM node:22-alpine AS deps
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

# ── Stage 2: Builder ─────────────────────────────────────
FROM node:22-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app

# 1. Copia o código primeiro
COPY . . 

# 2. REMOVE qualquer node_modules que possa ter vindo no COPY . .
RUN rm -rf node_modules

# 3. Agora sim, traz as dependências limpas do Stage 1
COPY --from=deps /app/node_modules ./node_modules

# Garante permissão e segue o jogo
RUN chmod +x ./node_modules/.bin/prisma
RUN pnpm prisma generate
RUN pnpm build

# ── Stage 3: Runner ──────────────────────────────────────
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