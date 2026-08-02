#!/bin/sh
set -e

echo "Starting Cache..."

# `prisma migrate deploy` needs the schema + migrations directory, both copied
# into the image. The prisma CLI ships in the image's node_modules. `--bun`
# forces the Bun runtime for the CLI (Node is installed in the image too, but
# the generated client uses .ts import specifiers that only Bun resolves).
echo "Running database migrations..."
bunx --bun prisma migrate deploy

echo "Starting server..."
# `next build --output standalone` produces a self-contained server at
# server.js (the contents of .next/standalone are copied to /app). Run it
# under Bun — the generated Prisma client uses .ts import specifiers that
# only Bun resolves at runtime. HOSTNAME and PORT are set via ENV in the
# Dockerfile. `exec` replaces the shell so the server becomes PID 1 and
# receives container stop signals directly.
exec bun server.js
