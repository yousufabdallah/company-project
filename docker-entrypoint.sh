#!/bin/sh
set -e

# Compose waits for the db healthcheck before starting this container, so the
# schema push below can assume postgres is accepting connections.
node node_modules/prisma/build/index.js db push --accept-data-loss --skip-generate

exec "$@"
