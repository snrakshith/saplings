FROM node:26.13.1-bookworm-slim AS build
WORKDIR /repo
RUN npm install --global pnpm@10.11.0
COPY . .
RUN pnpm install --frozen-lockfile && pnpm run build && pnpm exec tsc -p packages/adapter-drizzle && pnpm exec tsc -p packages/adapter-aws && pnpm --filter @saplings/starter-api run build
RUN pnpm --filter @saplings/starter-api deploy --legacy --prod /out

FROM node:26.13.1-bookworm-slim AS runtime
WORKDIR /app
COPY --from=build --chown=node:node /out/ ./
COPY --from=build /repo/packages/adapter-drizzle/migrations/ /app/migrations/
ENV NODE_ENV=production PORT=3000 SAPLINGS_STARTER_PROFILE=durable SAPLINGS_MIGRATIONS_DIR=/app/migrations
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
