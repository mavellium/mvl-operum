# ── Base: Node 22 Alpine + pnpm via corepack ──────────────────────────────────
# corepack is bundled with Node 18+; no npm install -g pnpm needed.
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── Stage: Download Prisma schema-engine ──────────────────────────────────────
# Plain Alpine Node (no corepack shims) so npm runs unmodified.
# npm writes to /usr/local/lib — always writable, unlike pnpm's content store.
# The @prisma/engines postinstall downloads the musl binary here.
# test -f at the end makes the build fail loudly if the download was skipped.
FROM node:22-alpine AS engine-dl
RUN npm install -g prisma@7.7.0 \
 && find /usr/local/lib/node_modules -name "schema-engine-linux-musl-openssl-3.0.x" -type f \
    | head -1 \
    | xargs cp -t /tmp/ \
 && test -f /tmp/schema-engine-linux-musl-openssl-3.0.x

# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
# Both files are required explicitly — no glob that silently skips the lockfile.
COPY package.json pnpm-lock.yaml ./
# --frozen-lockfile: fails loudly if lockfile is missing or out of sync.
# --ignore-scripts: skips postinstall (prisma generate) — we run it explicitly in builder.
RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Copy source after node_modules to maximise layer cache hits.
COPY . .
# Generate Prisma client into lib/generated/prisma (output defined in prisma.config.ts).
# DATABASE_URL is not needed for generation — only the schema is read.
# Set NODE_ENV before build so bundler tree-shakes dev code paths.
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm exec prisma generate
RUN pnpm build

# ── Stage 3: Runner ───────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Prisma CLI for the migrate service.
# Ownership is scoped to nextjs:nodejs — world-execute removed (750 vs 755).
RUN pnpm add --global prisma@7.7.0 \
 && chown -R nextjs:nodejs /pnpm \
 && chmod -R 750 /pnpm

# Schema-engine binary baked in from the engine-dl stage (npm install to a
# writable dir). PRISMA_SCHEMA_ENGINE_BINARY overrides the default search paths
# so the global prisma CLI uses this binary instead of looking in /pnpm/global.
COPY --from=engine-dl /tmp/schema-engine-linux-musl-openssl-3.0.x /usr/local/bin/prisma-schema-engine
RUN chmod 750 /usr/local/bin/prisma-schema-engine \
 && chown nextjs:nodejs /usr/local/bin/prisma-schema-engine
ENV PRISMA_SCHEMA_ENGINE_BINARY=/usr/local/bin/prisma-schema-engine

# Next.js standalone output (includes a self-contained server.js + minimal node_modules).
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma client (generated) — required by server.js for all DB queries at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/lib/generated ./lib/generated

# Prisma schema + config — required by the migrate service at deploy time.
# chown so the nextjs user can read them without world-readable permissions.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

USER nextjs

# Declare the listening port — informational only, does not publish the port.
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
