FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile && pnpm run build && pnpm run build:adapters
RUN pnpm --filter @sapling/example-express deploy --legacy --prod /out
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
COPY --from=build --chown=node:node /out/ ./
USER node
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node","--import","tsx","src/index.ts"]
