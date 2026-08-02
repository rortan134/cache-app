###########################
#     BUILDER             #
###########################
FROM oven/bun:1.3.14-alpine AS builder

# The Prisma CLI launcher has a `#!/usr/bin/env node` shebang, so Node must be
# on PATH for `bun install`'s postinstall (`prisma generate`) and the runtime
# migration step. The generated Prisma client itself runs under Bun.
RUN apk add --no-cache nodejs

WORKDIR /app

# Disable husky hooks and Next telemetry
ENV HUSKY=0
ENV NEXT_TELEMETRY_DISABLED=1

# `prisma.config.ts` reads DATABASE_URL at config-load time. `prisma generate`
# (run by the postinstall hook during `bun install`) imports that config and
# throws if the var is unset. The value is never used to connect during
# `generate`; a syntactically valid placeholder satisfies it. The real URL is
# injected at runtime via env_file in docker-compose.
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder

# Copy deps manifests first to leverage layer caching
COPY package.json bun.lock ./
# Copy prisma schema + config BEFORE install: the postinstall hook runs
# `prisma generate`, which reads prisma/schema.prisma and prisma.config.ts.
COPY prisma ./prisma
COPY prisma.config.ts ./
# `--minimum-release-age=0` overrides the repo's supply-chain gate (set in
# bunfig.toml): a fresh Docker build has no bun cache and would otherwise
# reject any pinned dep published <3 days ago.
RUN bun install --frozen-lockfile --minimum-release-age=0

# Copy the rest of the source
COPY . .

# Build the Next.js app in standalone mode (self-contained server.js).
# Skip `gt translate` in Docker: it calls General Translation's API at build
# time and self-hosters may not have GT_API_KEY. Translate locally before
# building the image if you want translated strings baked in.
ENV NEXT_BUILD_STANDALONE=1
RUN bun run next build

###########################
#     RUNNER              #
###########################
FROM oven/bun:1.3.14-alpine AS runner

# Node is needed for the Prisma CLI (its launcher has a `#!/usr/bin/env node`
# shebang). The standalone Next.js server and the generated Prisma client
# both run under Bun.
RUN apk add --no-cache nodejs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HUSKY=0
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Placeholder for the build-time `prisma generate` (RUN bunx prisma generate
# below loads prisma.config.ts which reads DATABASE_URL). Overridden at
# runtime by docker-compose's env_file — never used to connect.
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder

# Reuse the bun user that ships with oven/bun instead of creating a new one
USER bun

# Standalone server: copy only the self-contained output + static assets.
# No node_modules needed to run the server itself.
COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static
COPY --from=builder --chown=bun:bun /app/public ./public

# Prisma CLI + schema for running migrations at container start. The CLI is a
# devDependency, so standalone tracing does not include it; copy it from the
# builder so `bunx prisma` resolves locally without a network fetch at runtime.
COPY --from=builder --chown=bun:bun /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=bun:bun /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=bun:bun /app/prisma ./prisma
COPY --from=builder --chown=bun:bun /app/prisma.config.ts ./prisma.config.ts
RUN bunx prisma generate

# Migrations entry point
COPY --chown=bun:bun ./docker/start.sh /app/start.sh

EXPOSE 3000
CMD ["sh", "/app/start.sh"]
