# ---- deps: install with bun, matching bun.lock ----
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile

# ---- builder: generate prisma client + next build (standalone) ----
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bunx prisma generate
RUN bun run build

# ---- runner: minimal node image, only the standalone output ----
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=3745
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone server + pruned node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# The Prisma CLI is deliberately absent here: its dependency closure is far
# larger than the traced standalone output. The schema is pushed by the
# one-shot `migrate` service in docker-compose.yml, which runs on the builder
# stage. Everything this image needs at runtime — the generated client and its
# query engine — is already inside .next/standalone.
RUN mkdir -p public/uploads && chown -R nextjs:nodejs /app

# Uploaded media lives on its own volume so it survives rebuilds and restarts.
# Postgres data lives in the db service's own volume, never in this image.
VOLUME ["/app/public/uploads"]

USER nextjs
EXPOSE 3745

CMD ["node", "server.js"]
