#!/usr/bin/env bash
set -euo pipefail
pnpm run build
pnpm run build:quality
pnpm test
node packages/cli/dist/index.js doctor
