FROM node:22-bookworm-slim
WORKDIR /app
COPY . .
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
RUN pnpm install --frozen-lockfile && pnpm run verify:build
RUN mkdir -p /app/quality-results && chown node:node /app/quality-results
USER node
ENTRYPOINT ["node","packages/backend-quality/dist/cli.js"]
CMD ["list"]
# Extend with version-pinned k6, kubectl, ZAP, Schemathesis and Autocannon as needed; no privileged Docker socket by default.
