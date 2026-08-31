#!/bin/sh
set -e

# DATABASE_URL must be an absolute file: path in Docker (e.g. file:/data/app.db) —
# a relative sqlite path resolves inconsistently between `prisma db push` and the
# generated client at runtime.
node_modules/.bin/prisma db push --accept-data-loss --skip-generate

exec "$@"
