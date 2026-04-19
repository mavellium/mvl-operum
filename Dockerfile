# ── Base: Node 22 Alpine + pnpm via corepack ──────────────────────────────────
# corepack is bundled with Node 18+; no npm install -g pnpm needed.
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

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
# --ignore-scripts is intentionally omitted: prisma's postinstall downloads
# engine binaries so they are baked into the image (no network needed at deploy time).
# Ownership is scoped to nextjs:nodejs — world-execute removed (750 vs 755).
RUN pnpm add --global prisma@7.7.0 \
 && chown -R nextjs:nodejs /pnpm \
 && chmod -R 750 /pnpm

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
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
