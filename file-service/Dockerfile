# ── Base: Node 22 Alpine + pnpm via corepack ──────────────────────────────────
FROM node:22-alpine AS base
RUN apk upgrade --no-cache libcrypto3 libssl3 \
 && apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"
RUN corepack enable

# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpm.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN pnpm exec prisma generate
RUN pnpm build

# ── Stage 3: Runner ───────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nestjs

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpm.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --shamefully-hoist \
 && rm -f pnpm-lock.yaml pnpm-workspace.yaml pnpm.yaml \
 && chown -R nestjs:nodejs /pnpm \
 && chmod -R 750 /pnpm

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/lib/generated ./lib/generated
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# npm's own vendored deps (bundled with node:22-alpine) carry known CVEs.
# This image runs via pnpm/corepack only — npm/npx are never invoked.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

USER nestjs

EXPOSE 4005

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:4005/health || exit 1

CMD ["node", "dist/main"]
