# ── Base: Node 22 Alpine + pnpm via corepack ──────────────────────────────────
FROM node:22-alpine AS base
RUN apk update && apk upgrade --no-cache libcrypto3 libssl3 \
 && apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"
RUN corepack enable

# ── Stage: Download Prisma schema-engine ──────────────────────────────────────
FROM node:22-alpine AS engine-dl
RUN apk update && apk upgrade --no-cache libcrypto3 libssl3
RUN npm install -g prisma@7.7.0 \
 && find /usr/local/lib/node_modules -name "schema-engine-linux-musl-openssl-3.0.x" -type f \
    | head -1 \
    | xargs cp -t /tmp/ \
 && test -f /tmp/schema-engine-linux-musl-openssl-3.0.x

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
COPY --from=builder --chown=nestjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# Prisma CLI for the migrate service — mirrors the monolith Dockerfile pattern.
# Installed locally into /app/prisma-cli with plain npm (flat node_modules) and
# symlinked into node_modules so Node resolves `prisma/config` and `dotenv/config`.
RUN mkdir -p /app/prisma-cli \
 && printf '{"name":"prisma-cli","private":true,"overrides":{"deepmerge-ts":">=8.0.0"}}' > /app/prisma-cli/package.json \
 && npm install prisma@7.7.0 dotenv --no-save --prefix /app/prisma-cli \
 && chown -R nestjs:nodejs /app/prisma-cli \
 && chmod -R 750 /app/prisma-cli \
 && ln -s /app/prisma-cli/node_modules/prisma ./node_modules/prisma \
 && ln -s /app/prisma-cli/node_modules/dotenv ./node_modules/dotenv

COPY --from=engine-dl /tmp/schema-engine-linux-musl-openssl-3.0.x /usr/local/bin/prisma-schema-engine
RUN chmod 750 /usr/local/bin/prisma-schema-engine \
 && chown nestjs:nodejs /usr/local/bin/prisma-schema-engine

ENV PRISMA_SCHEMA_ENGINE_BINARY=/usr/local/bin/prisma-schema-engine
ENV PATH="/app/prisma-cli/node_modules/.bin:/app/node_modules/.bin:$PATH"

# npm's own vendored deps (bundled with node:22-alpine) carry known CVEs.
# This image runs via pnpm/corepack only — npm/npx are never invoked.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

USER nestjs

EXPOSE 4005

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:4005/health || exit 1

CMD ["node", "dist/main"]
