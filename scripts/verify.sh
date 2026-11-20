#!/usr/bin/env bash
set -euo pipefail
pnpm run build
pnpm test
node packages/cli/dist/index.js doctor
