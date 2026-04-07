#!/bin/sh
set -e

echo "→ Running prisma db push..."
npx prisma db push --skip-generate

echo "→ Starting application..."
exec pnpm start:dev
